import { Event, Queue } from './deps.ts';
import LogLevelManager from './LogLevelManager.ts';
import TransportBase from './TransportBase.ts';
import type { ITransport, TFormatter, TLevelMethods, TLogOptions } from './types.ts';

export class LogContainer extends Map<string, PowerLog<unknown>> {
	constructor() {
		super();
	}
}

/**
 * Default global logger container.
 */
export const loggers = new LogContainer();

export default class PowerLog<LogLevels> extends LogLevelManager<LogLevels> {
	/**
	 * This is a static method used to create a new
	 * PowerLog instance. It is most recommended to use
	 * this method instead of initiating a new instance of
	 * PowerLog yourself. This is because the PowerLog
	 * instance adds some extra function properties to
	 * itself that aren't typed. Using
	 * `PowerLog.get(options)` those function properties
	 * will be typed.
	 * @param options The PowerLog options.
	 */
	public static get<LogLevels>(
		options: TLogOptions<LogLevels>,
	): PowerLog<LogLevels> & TLevelMethods<LogLevels> {
		if (loggers.has(options.name)) {
			const logger = loggers.get(options.name)!;
			if (logger.enum !== options.levels) {
				throw new Error('LogLevels between existing PowerLog and requested PowerLog mismatch!');
			}
			if (options.formatter) {
				logger.format(options.formatter);
			}
			return logger as any;
		}
		const logger = new PowerLog(options) as any;
		loggers.set(logger.name, logger);
		return logger;
	}

	public log(level: string, message: string, ...args: unknown[]): this {
		return this._push((this.#levels as any)[level], message, args);
	}

	/**
	 * A queue for new log entry transport pushes to
	 * prevent race conditions between transports.
	 */
	#queue = new Queue();

	/** The levels enumerable. */
	#levels: LogLevels;

	/** A default formatter to apply to new transports. */
	#defaultFormatter?: TFormatter;

	/** Transports to send log entries to. */
	#transports = new Set<ITransport<LogLevels>>();

	/** The name of this logger. */
	public readonly name: string;

	/** Emitted when an error occurs. */
	public readonly onerror = new Event<[Error]>();

	/**
	 * Avoid using this method yourself, this will not add
	 * typings to the level methods created by PowerLog.
	 * @param options The PowerLog options.
	 */
	public constructor(options: TLogOptions<LogLevels>) {
		super(options.levels, options.enabled);
		this.#levels = options.levels;
		this.#defaultFormatter = options.formatter;
		this.name = options.name;
		for (const key in options.levels) {
			if (typeof key !== 'string') continue;
			(this as any)[key] = (message: string, ...args: unknown[]) =>
				this._push((this.#levels as any)[key], message, args);
		}
	}

	/**
	 * Push each transport into the log queue.
	 * @param level The level of the log entry.
	 * @param message The message of the log entry.
	 * @param args The
	 */
	private _push(level: number, message: string, args: unknown[]): this {
		if (!this.emits(level)) return this;

		// Must be defined here so all transports have an
		// equal timestamp.
		const t = new Date();

		for (const transport of this.#transports) {
			if (!transport.emits(level)) continue;
			this.#queue.push(async () => {
				try {
					await transport.push({ level, message, arguments: args, name: this.name, timestamp: t });
				} catch (error) {
					this.onerror.dispatch(error);
				}
			});
		}
		return this;
	}

	/**
	 * Add an initialize transports to this instance.
	 * @param transports The transports.
	 */
	public async use(...transports: ITransport<LogLevels>[]) {
		for (const transport of transports) {
			if (!TransportBase.isTransport(transport)) {
				throw new Error('Not a transport!');
			}
			if (transport.disposed) {
				throw new Error('Transport has already been disposed of!');
			}
			if (!transport.initialized) {
				await transport.init();
			}
			if (
				typeof (transport as any).format === 'function' && (transport as any)
						.format() === undefined &&
				this.#defaultFormatter !== undefined
			) {
				(transport as any).format(this.#defaultFormatter);
			}
			this.#transports.add(transport);
		}
	}

	/**
	 * Remove transports from this instance.
	 *
	 * **Note** that this will also dispose of the
	 * transports.
	 *
	 * @param transports The transports.
	 */
	public async remove(...transports: ITransport<LogLevels>[]) {
		for (const transport of transports) {
			if (!this.#transports.has(transport)) continue;
			if (!transport.disposed && transport.initialized) {
				await transport.dispose();
			}
			this.#transports.delete(transport);
		}
	}

	/** Get the default formatter. */
	public format(): TFormatter | undefined;

	/**
	 * Set the default formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter: TFormatter): this;

	/**
	 * Set/get the default formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter?: TFormatter): this | TFormatter | undefined;
	public format(formatter?: TFormatter): this | TFormatter | undefined {
		if (typeof formatter === 'function') {
			this.#defaultFormatter = formatter;
			return this;
		}
		return this.#defaultFormatter;
	}

	/**
	 * Call dispose on the transports on this instance.
	 */
	public async dispose(): Promise<void> {
		for (const transport of this.#transports) {
			try {
				await transport.dispose();
			} catch (error) {}
		}
	}
}
