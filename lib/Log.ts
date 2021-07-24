// spell-checker:ignore () Deno rivy ; (func) sprintf ; (strings) dbug trac

// ToDO: [2021-07-23; rivy] research best typings
// * see enum type explanations...
// @ <https://stackoverflow.com/questions/50376977/generic-type-to-get-enum-keys-as-union-string-in-typescript> @@ <https://archive.is/IFW1l>
// @ <https://stackoverflow.com/questions/63746463/how-to-create-enum-values-as-type-interface-in-typescript> @@ <https://archive.is/xtDuY>
// # playground code @ <https://www.typescriptlang.org/play?#code/MYewdgzgLgBApmArgWxgFTtGBvAUDAmAQRgF4YByAQwoBp9CAhMygIwtwF9dcoBPAA5x0mKAFkqAgDxp4ADygIAJhBjQATgEswAcwB8LbAG0A1nD4xt6ALoAuNVC27uuUJFhz7GaBOneoBuR4hDBG1BR2lBraOnQMBGHskdRgIFAAFnDqDk6xXLgA9AUwAKLq6iDqXgDKAEwAzLW1XoLCFNih4ZHRugDcnUn2PTr9nBSWqqmwVBAQmjpgVKwANsJQIDD8QpT+FAB0uEA>
// # playground code @ <https://www.typescriptlang.org/play#code/KYDwDg9gTgLgBAYwgOwM72MgrgWzgZRmDADkBDHYVOAbwCg5G4Vg4BeOAchc4BoGmMAO4R2XYRD4DGAMwCWyMgBsxneYqWc6AXzp1QkWHBgBPMK0LExNANoBrYCbgKCRUhSoBdAPwAuWgAWwGQAJsBQ-uhQCgDm2toA3HRIaPAslmD+GdZcPP40cEGh4f6cAGJyUOiccNq1SUA>

import ConsoleTransport from './transport/ConsoleTransport.ts';
import TransportBase from './transport/TransportBase.ts';
import { Event, Queue } from './deps.ts';
import LogLevelManager from './LogLevelManager.ts';
import type {
	GenericFunction,
	ITransport,
	TFormatter,
	TLevelMethods,
	TLogOptions,
} from './types.ts';

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

export interface LogRecordOptions<TLogLevel> {
	msg: string;
	args: unknown[];
	level: TLogLevel;
	levelSet: Set<TLogLevel>;
	loggerName: string;
}

export class LogRecord<TLogLevel> {
	readonly msg: string;
	#args: unknown[];
	#dateTime: Date;
	readonly level: TLogLevel;
	// readonly levelName: string;
	readonly loggerName: string;

	constructor(options: LogRecordOptions<TLogLevel>) {
		this.msg = options.msg;
		this.#args = [...options.args];
		this.level = options.level;
		this.loggerName = options.loggerName;
		this.#dateTime = new Date();
		// this.levelName = getLevelName(options.level);
	}
	get args(): unknown[] {
		return [...this.#args];
	}
	get dateTime(): Date {
		return new Date(this.#dateTime.getTime());
	}
}

/**
 * Default global logger container.
 */
export const loggers = new Container();

export class PowerLog<TLogLevel> extends LogLevelManager<TLogLevel> {
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
	public static get<TLogLevel>(
		options: TLogOptions<TLogLevel>,
	): PowerLog<TLogLevel> & TLevelMethods<TLogLevel> {
		if (loggers.has(options.name)) {
			const logger = loggers.get(options.name)!;
			if (logger.enum !== options.levels) {
				throw new Error(
					'Mismatched TLogLevel type between existing PowerLog and requested PowerLog!',
				);
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

	public log(level: keyof TLogLevel, message: string, ...args: unknown[]): this {
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
	#levels: TLogLevel;

	/** A default formatter to apply to new transports. */
	#defaultFormatter?: TFormatter;

	/** Transports to send log entries to. */
	#transports = new Set<ITransport<TLogLevel>>();

	/** The name of this logger. */
	public readonly name: string;

	/** Emitted when an error occurs. */
	public readonly onerror = new Event<[Error]>();

	/**
	 * Avoid using this method yourself, this will not add
	 * typings to the level methods created by PowerLog.
	 * @param options The PowerLog options.
	 */
	public constructor(options: TLogOptions<TLogLevel>) {
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
	public async use(...transports: ITransport<TLogLevel>[]) {
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
	public async remove(...transports: ITransport<TLogLevel>[]) {
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

// export type LL<TLogLevel> = Set<keyof TLogLevel>;
// export type LogLevelColor = (_: string) => string;

export namespace LogLevels {
	export namespace Properties {
		export type $default = { color?: typeof Colors.reset; badge?: string };
	}

	export enum $default {
		critical,
		error,
		warn,
		warning = warn,
		notice,
		info,
		informational = info,
		debug,
		trace,
	}

	export enum syslog {
		emergency,
		alert,
		critical,
		error,
		warning,
		notice,
		informational,
		debug,
	}

	export namespace colors {
		export const $default = new Map([
			[LogLevels.$default.trace, Colors.yellow],
			[LogLevels.$default.debug, Colors.yellow],
			[LogLevels.$default.info, Colors.brightBlue],
			[LogLevels.$default.notice, Colors.cyan],
			[LogLevels.$default.warn, Colors.magenta],
			[LogLevels.$default.error, Colors.red],
			[LogLevels.$default.critical, (s: string) =>
				Colors.bgBrightRed(Colors.brightWhite(s))],
		]);
	}
	export namespace prefixes {
		export const $default = new Map([
			[LogLevels.$default.trace, 'trac'],
			[LogLevels.$default.debug, 'dbug'],
			[LogLevels.$default.info, 'info'],
			[LogLevels.$default.notice, 'Note'],
			[LogLevels.$default.warn, 'WARN'],
			[LogLevels.$default.error, 'ERR!'],
			[LogLevels.$default.critical, 'CRIT'],
		]);
	}
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
	`(${data.name}) ${LogLevels.prefixes.$default.get(data.level) || ''} ${
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
		(LogLevels
			.colors
			.$default
			.get(data.level) || Colors.reset)(
				LogLevels
					.prefixes
					.$default
					.get(data.level) || '',
			)
	} ${sprintf(data.message, ...data.arguments)}`;

export const logger = PowerLog.get<typeof LogLevels.$default>({
	levels: LogLevels.$default, // level.color level.prefix
	name: '$default',
	formatter: noColorFormatter,
});
await logger.use(
	new ConsoleTransport({
		levels: LogLevels.$default,
		formatter: colorFormatter,
		std: 'err',
		// enabled: [defaultLogLevel.critical],
	}),
);

loggers.set('$default', logger);
