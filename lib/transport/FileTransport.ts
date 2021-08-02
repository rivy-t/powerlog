// spell-checker:ignore () Deno

import type { ILogData, TFileTransportOptions } from '../types.ts';
import WriterTransport from './WriterTransport.ts';

/**
 * A transport that pushes logs to a file.
 */
export default class FileTransport<TLogLevel> extends WriterTransport<TLogLevel> {
	/** The filename to write to. */
	#filename: string;

	/** Whether or not to reset the file. */
	#reset: boolean = false;

	/**
	 * Create a new file transport.
	 * @param options The file transport options.
	 */
	public constructor(options: TFileTransportOptions<TLogLevel>) {
		super(options);
		this.#filename = options.filename;
		if (options.reset === true) {
			this.#reset = true;
		}
	}

	/**
	 * Initialize the writer.
	 */
	public async init(): Promise<void> {
		if (this.#reset) {
			try {
				await Deno.lstat(this.#filename);
				await Deno.remove(this.#filename, { recursive: true });
			} catch (error) {}
		}
		const file = await Deno.open(this.#filename, { create: true, append: true });
		this.__setStream(file);
		await super.init();
	}

	// Add a newline character to the message.
	public async dataToByteArray(data: ILogData): Promise<Uint8Array> {
		// console.warn({ _: 'FileTransport/dataToByteArray', data });
		const arr = await super.dataToByteArray(data);
		const Uint8LF = 10;
		return new Uint8Array([...arr, Uint8LF]);
	}
}
