// Imports
import Powerlog from "./Powerlog.ts";

/**
 * A level emitter manager to enable or disable certain
 * levels after construction.
 */
export interface ILevelEmitter<Levels> {

	/**
	 * The levels that are emitted.
	 */
	levels: number | keyof Levels;

	/**
	 * Enable one or more levels.
	 * @param levels The levels to enable.
	 */
	enable(...levels: (keyof Levels | number)[]): any;

	/**
	 * Disable one or more levels.
	 * @param levels The levels to disable.
	 */
	disable(...levels: (keyof Levels | number)[]): any;

	/**
	 * Check whether one or more levels are emitted.
	 * @param levels The levels to check.
	 */
	emits(...levels: (keyof Levels | number)[]): boolean;
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
export interface ITransport<Levels> extends ILevelEmitter<Levels> {

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

export type TLevelMethods<Levels> = {
	[key in keyof Levels]: (message: string, ...args: unknown[]) => Powerlog<Levels> & TLevelMethods<Levels>;
}

export type TFormatter = (data: ILogData) => Promise<string | Uint8Array> | string | Uint8Array;

export type TFormatTransportBaseOptions<Levels> = {
	levels: Levels;
	enabled?: (number | keyof Levels)[] | -1;
	formatter?: TFormatter;
}

export type TWriterTransportOptions<Levels> = TFormatTransportBaseOptions<Levels> & {
	stream?: Deno.Writer & Deno.Closer;
	close?: boolean;
};

export type TFileTransportOptions<Levels> = TFormatTransportBaseOptions<Levels> & {
	filename: string;
	reset?: boolean;
};

export type TStdTransportOptions<Levels> = TFormatTransportBaseOptions<Levels> & {
	std?: "out" | "err";
};

export type TPowerlogOptions<Levels> = TFormatTransportBaseOptions<Levels> & {
	name: string;
};
