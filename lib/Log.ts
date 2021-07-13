// spell-checker:ignore (func) sprintf

import { Event, Queue } from './deps.ts';
import LogLevelManager from './LogLevelManager.ts';
import TransportBase from './TransportBase.ts';
import type { ITransport, TFormatter, TLevelMethods, TLogOptions } from './types.ts';

import * as Colors from 'https://deno.land/std@0.79.0/fmt/colors.ts';

// import ConsoleTransport from '../lib/ConsoleTransport.ts';
import { sprintf } from '../lib/deps.ts';
// import FileTransport from '../lib/FileTransport.ts';
// import PowerLog from '../lib/Log.ts';
// import TcpTransport from '../lib/TcpTransport.ts';
import type { ILogData } from '../lib/types.ts';
// import WriterTransport from '../lib/WriterTransport.ts';

export class Container extends Map<string, PowerLog<any> & TLevelMethods<any>> {
	constructor() {
		super();
	}
}

/**
 * Default global logger container.
 */
export const loggers = new Container();

export class PowerLog<LogLevels> extends LogLevelManager<LogLevels> {
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

	#suspensionQueue = new Queue();
	#suspended = false;

	public suspend() {
		this.#suspensionQueue.stop();
		this.#suspended = true;
	}
	public resume() {
		this.#suspended = false;
		this.#suspensionQueue.start();
	}

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

	private _pushToTransportQueue(
		logObject: {
			level: number;
			message: string;
			arguments: unknown[];
			name: string;
			timestamp: Date;
		},
	) {
		if (!this.emits(logObject.level)) return this;
		for (const transport of this.#transports) {
			if (!transport.emits(logObject.level)) continue;
			this.#queue.push(async () => {
				try {
					await transport.push(logObject);
				} catch (error) {
					this.onerror.dispatch(error);
				}
			});
		}
		return this;
	}

	/**
	 * Push each transport into the log queue.
	 * @param level The level of the log entry.
	 * @param message The message of the log entry.
	 * @param args The
	 */
	private _push(level: number, message: string, args: unknown[]): this {
		// Must be defined here so all transports have an equal timestamp.
		const t = new Date();
		const logRecord = { level, message, arguments: args, name: this.name, timestamp: t };

		if (this.#suspended) {
			this.#suspensionQueue.push(async () => {
				this._pushToTransportQueue(logRecord);
			});
		} else {
			this._pushToTransportQueue(logRecord);
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

// An array of colors ordered by the log levels order.
const defaultLogLevelColors = [
	Colors.yellow,
	Colors.yellow,
	Colors.brightBlue,
	Colors.cyan,
	Colors.magenta,
	Colors.red,
	(s: string) => Colors.bgBrightRed(Colors.brightWhite(s)),
];
const defaultLogLevelLabels = ['trac', 'dbug', 'info', 'Note', 'WARN', 'ERR!', 'CRIT']; // spell-checker:ignore (labels) dbug trac

export enum defaultLogLevels {
	trace,
	debug,
	info,
	notice,
	warn,
	error,
	critical,
}

// Formatting help.
const _n = (n: number | string) => n.toString().padStart(2, '0');
const _c = (n: number | string) => Colors.magenta(_n(n));
const _d = Colors.dim('/');
const _t = Colors.dim(':');

// A formatter that doesn't use colors.
export const noColorFormatter = (data: ILogData) =>
	`[${_n(data.timestamp.getDate())}/${
		_n(data.timestamp.getMonth() + 1)
	}/${data.timestamp.getFullYear()} ${_n(data.timestamp.getHours())}:${
		_n(data.timestamp.getMinutes())
	}:${_n(data.timestamp.getSeconds())}] ` +
	`(${data.name}) ${defaultLogLevelLabels[data.level]} ${
		sprintf(
			data.message,
			...data.arguments,
		)
	}`;

// A formatter that does use colors.
export const colorFormatter = (data: ILogData) =>
	`[${_c(data.timestamp.getDate())}${_d}${_c(data.timestamp.getMonth() + 1)}${_d}${
		_c(data.timestamp.getFullYear())
	} ${_c(data.timestamp.getHours())}${_t}${_c(data.timestamp.getMinutes())}${_t}${
		_c(data.timestamp.getSeconds())
	}] ` +
	`(${Colors.bold(data.name)}) ${
		defaultLogLevelColors[data.level](defaultLogLevelLabels[data.level])
	} ${sprintf(data.message, ...data.arguments)}`;

export const logger = PowerLog.get<typeof defaultLogLevels>({
	levels: defaultLogLevels,
	name: 'default',
	formatter: noColorFormatter,
});

loggers.set('default', logger);
