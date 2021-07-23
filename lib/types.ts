// spell-checker:ignore () Deno

import * as PowerLog from './Log.ts';

export type GenericFunction = (...args: any[]) => any;

/**
 * A level emitter manager to enable or disable certain
 * levels after construction.
 */
export interface ILevelEmitter<TLogLevel> {
	/**
	 * The levels that are emitted.
	 */
	levels: number | keyof TLogLevel;

	/**
	 * Enable one or more levels.
	 * @param levels The levels to enable.
	 */
	enable(...levels: (keyof TLogLevel | number)[]): any;

	/**
	 * Disable one or more levels.
	 * @param levels The levels to disable.
	 */
	disable(...levels: (keyof TLogLevel | number)[]): any;

	/**
	 * Check whether one or more levels are emitted.
	 * @param levels The levels to check.
	 */
	emits(...levels: (keyof TLogLevel | number)[]): boolean;
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
export interface ITransport<TLogLevel> extends ILevelEmitter<TLogLevel> {
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

export type TLevelMethods<TLogLevel> = {
	[key in keyof TLogLevel]: (
		message: string,
		...args: unknown[]
	) => PowerLog.PowerLog<TLogLevel> & TLevelMethods<TLogLevel>;
};

export type TFormatter = (data: ILogData) => Promise<string | Uint8Array> | string | Uint8Array;

export type TFormatTransportBaseOptions<TLogLevel> = {
	levels: TLogLevel;
	enabled?: (number | keyof TLogLevel)[] | -1;
	formatter?: TFormatter;
};

export type TConsoleTransportOptions<TLogLevel> = TFormatTransportBaseOptions<TLogLevel> & {
	std?: 'out' | 'err';
};

export type TFileTransportOptions<TLogLevel> = TFormatTransportBaseOptions<TLogLevel> & {
	filename: string;
	reset?: boolean;
};

export type TWriterTransportOptions<TLogLevel> = TFormatTransportBaseOptions<TLogLevel> & {
	stream?: Deno.Writer & Deno.Closer;
	close?: boolean;
};

export type TTcpTransportOptions<TLogLevel> = TWriterTransportOptions<TLogLevel> & {
	timeout?: number;
};

export type TLogOptions<TLogLevel> = TFormatTransportBaseOptions<TLogLevel> & { name: string };
