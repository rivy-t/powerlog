// spell-checker:ignore () Deno

import type { ILogData, TConsoleTransportOptions } from '../types.ts';
import WriterTransport from './WriterTransport.ts';

/**
 * A transport that uses either stdout or stderr.
 */
export default class ConsoleTransport<TLogLevel> extends WriterTransport<TLogLevel> {
	/**
	 * Create a new std transport.
	 * @param options The std transport options.
	 */
	public constructor(options: TConsoleTransportOptions<TLogLevel>) {
		let stream: Deno.Writer & Deno.Closer;
		if (options.std === 'out' || options.std === null || options.std === undefined) {
			stream = Deno.stdout;
		} else if (options.std === 'err') {
			stream = Deno.stderr;
		} else {
			throw new Error("Unknown std '" + options.std + "'");
		}
		super({ ...options, stream, close: false });
	}

	// Add a newline character to the message.
	public async dataToByteArray(data: ILogData): Promise<Uint8Array> {
		// console.warn({ _: 'ConsoleTransport/dataToByteArray', data });
		const arr = await super.dataToByteArray(data);
		const Uint8LF = 10;
		return new Uint8Array([...arr, Uint8LF]);
	}
}
