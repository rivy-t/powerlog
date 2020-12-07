// Imports
import type { ITransport, TFormatter, TLevelMethods, TPowerlogOperions } from "./types.ts";
import { Queue, Event } from "./deps.ts";
import LevelManager from "./LevelManager.ts";
import TransportBase from "./TransportBase.ts";

export const cached = new Map<string, Powerlog<unknown>>();

export default class Powerlog<Levels> extends LevelManager<Levels> {

	/**
	 * This is a static method used to create a new
	 * Powerlog instance. It is most recommended to use
	 * this method instead of initiating a new instance of
	 * Powerlog yourself. This is because the powerlog
	 * instance adds some extra function properties to
	 * itself that aren't typed. Using
	 * `Powerlog.get(options)` those function properties
	 * will be typed.
	 * @param options The powerlog options.
	 */
	public static get<Levels>(options: TPowerlogOperions<Levels>): Powerlog<Levels> & TLevelMethods<Levels> {
		if (cached.has(options.name)) {
			const logger = cached.get(options.name)!;
			if (logger.enum !== options.levels)
				throw new Error("Levels between existing powerlog and requested powerlog mismatch!");
			if (options.formatter)
				logger.format(options.formatter);
			return logger as any;
		}
		const logger = new Powerlog(options) as any;
		cached.set(logger.name, logger);
		return logger;
	}

	/**
	 * A queue for new log entry transport pushes to
	 * prevent race conditions between transports.
	 */
	#queue = new Queue();

	/** The levels enumerable. */
	#levels: Levels;

	/** A default formatter to apply to new transports. */
	#defaultFormatter?: TFormatter;

	/** Transports to send log entries to. */
	#transports = new Set<ITransport<Levels>>();

	/** The name of this logger. */
	public readonly name: string;

	/** Emitted when an error occurs. */
	public readonly onerror = new Event<[Error]>();

	/**
	 * Avoid using this method yourself, this will not add
	 * typings to the level methods created by Powerlog.
	 * @param options The powerlog options.
	 */
	public constructor(options: TPowerlogOperions<Levels>) {
		super(options.levels, options.enabled);
		this.#levels = options.levels;
		this.#defaultFormatter = options.formatter;
		this.name = options.name;
		for (const key in options.levels) {
			if (typeof key !== "string") continue;
			(this as any)[key] = (message: string, ...args: unknown[]) => this._push((this.#levels as any)[key], message, args);
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
					await transport.push({
						level,
						message,
						arguments: args,
						name: this.name,
						timestamp: t,
					});
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
	public async use(...transports: ITransport<Levels>[]) {
		for (const transport of transports) {
			if (!TransportBase.isTransport(transport))
				throw new Error("Not a transport!");
			if (transport.disposed)
				throw new Error("Transport has already been disposed of!");
			if (!transport.initialized)
				await transport.init();
			if (typeof (transport as any).format === "function" && (transport as any).format() === undefined && this.#defaultFormatter !== undefined)
				(transport as any).format(this.#defaultFormatter);
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
	public async unsuse(...transports: ITransport<Levels>[]) {
		for (const transport of transports) {
			if (!this.#transports.has(transport)) continue;
			if (!transport.disposed && transport.initialized)
				await transport.dispose();
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
	public format(formatter?: TFormatter): this | TFormatter | undefined
	public format(formatter?: TFormatter): this | TFormatter | undefined {
		if (typeof formatter === "function") {
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
			} catch (error) { }
		}
	}
}
