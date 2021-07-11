// spell-checker:ignore () Deno

import PowerLog from './PowerLog.ts';

/**
 * A level emitter manager to enable or disable certain
 * levels after construction.
 */
export interface ILevelEmitter<LogLevels> {
	/**
	 * The levels that are emitted.
	 */
	levels: number | keyof LogLevels;

	/**
	 * Enable one or more levels.
	 * @param levels The levels to enable.
	 */
	enable(...levels: (keyof LogLevels | number)[]): any;

	/**
	 * Disable one or more levels.
	 * @param levels The levels to disable.
	 */
	disable(...levels: (keyof LogLevels | number)[]): any;

	/**
	 * Check whether one or more levels are emitted.
	 * @param levels The levels to check.
	 */
	emits(...levels: (keyof LogLevels | number)[]): boolean;
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
export interface ITransport<LogLevels> extends ILevelEmitter<LogLevels> {
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

export type TLevelMethods<LogLevels> = {
	[key in keyof LogLevels]: (
		message: string,
		...args: unknown[]
	) => PowerLog<LogLevels> & TLevelMethods<LogLevels>;
};

export type TFormatter = (data: ILogData) => Promise<string | Uint8Array> | string | Uint8Array;

export type TFormatTransportBaseOptions<LogLevels> = {
	levels: LogLevels;
	enabled?: (number | keyof LogLevels)[] | -1;
	formatter?: TFormatter;
};

export type TWriterTransportOptions<LogLevels> = TFormatTransportBaseOptions<LogLevels> & {
	stream?: Deno.Writer & Deno.Closer;
	close?: boolean;
};

export type TFileTransportOptions<LogLevels> = TFormatTransportBaseOptions<LogLevels> & {
	filename: string;
	reset?: boolean;
};

export type TConsoleTransportOptions<LogLevels> = TFormatTransportBaseOptions<LogLevels> & {
	std?: 'out' | 'err';
};

export type TLogOptions<LogLevels> = TFormatTransportBaseOptions<LogLevels> & { name: string };
