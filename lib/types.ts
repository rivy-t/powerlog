// spell-checker:ignore () Deno

import * as PowerLog from './Log.ts';

export type GenericFunction = (...args: any[]) => any;

/**
 * A level emitter manager to enable or disable certain
 * levels after construction.
 */
export interface ILevelEmitter<LogLevel> {
	/**
	 * The levels that are emitted.
	 */
	levels: number | keyof LogLevel;

	/**
	 * Enable one or more levels.
	 * @param levels The levels to enable.
	 */
	enable(...levels: (keyof LogLevel | number)[]): any;

	/**
	 * Disable one or more levels.
	 * @param levels The levels to disable.
	 */
	disable(...levels: (keyof LogLevel | number)[]): any;

	/**
	 * Check whether one or more levels are emitted.
	 * @param levels The levels to check.
	 */
	emits(...levels: (keyof LogLevel | number)[]): boolean;
}

export type TMessage = string;
export type TArguments = any[];

/**
 * The produced log data.
 */
export interface ILogData {
	/** The level that was used to produce the data. */
	readonly level: number;

	/** The message to use when producing the content. */
	readonly message: TMessage;

	/** The arguments to use when producing the content. */
	readonly arguments: TArguments;

	/** The date object of when *this* object was produced. */
	readonly timestamp: Date;

	/**
	 * The name of the logger that produced the *this*
	 * object.
	 */
	readonly name: string;
}

/**
 * A way to transfer information to a destination.
 */
export interface ITransport<LogLevel> extends ILevelEmitter<LogLevel> {
	/**
	 * Initialize the transport.
	 */
	init(): Promise<void> | void;

	/**
	 * The logger has requested that the transport is to be
	 * disposed of.
	 */
	dispose(): Promise<void> | void;

	/**
	 * Push some log data onto the transport queue.
	 */
	push(data: ILogData): Promise<unknown | void> | unknown | void;

	initialized: boolean;
	disposed: boolean;
}

export type TLevelMethods<LogLevel> = {
	[key in keyof LogLevel]: (
		message: string,
		...args: unknown[]
	) => PowerLog.PowerLog<LogLevel> & TLevelMethods<LogLevel>;
};

export type TFormatter = (data: ILogData) => Promise<string | Uint8Array> | string | Uint8Array;

export type TFormatTransportBaseOptions<LogLevel> = {
	levels: LogLevel;
	enabled?: (number | keyof LogLevel)[] | -1;
	formatter?: TFormatter;
};

export type TConsoleTransportOptions<LogLevel> = TFormatTransportBaseOptions<LogLevel> & {
	std?: 'out' | 'err';
};

export type TFileTransportOptions<LogLevel> = TFormatTransportBaseOptions<LogLevel> & {
	filename: string;
	reset?: boolean;
};

export type TWriterTransportOptions<LogLevel> = TFormatTransportBaseOptions<LogLevel> & {
	stream?: Deno.Writer & Deno.Closer;
	close?: boolean;
};

export type TTcpTransportOptions<LogLevel> = TWriterTransportOptions<LogLevel> & {
	timeout?: number;
};

export type TLogOptions<LogLevel> = TFormatTransportBaseOptions<LogLevel> & { name: string };
