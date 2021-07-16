// spell-checker:ignore () Deno

import FormatTransportBase from './FormatTransportBase.ts';
import type { TWriterTransportOptions } from './types.ts';

/**
 * A transport that writes to a stream.
 */
export default class WriterTransport<LogLevel> extends FormatTransportBase<LogLevel> {
	/** The stream. */
	#stream: Deno.Writer & Deno.Closer | undefined;
	#close: boolean = true;

	/**
	 * Create a new writer transport.
	 * @param levels The levels enumerable.
	 * @param stream The write stream.
	 */
	public constructor(options: TWriterTransportOptions<LogLevel>) {
		super(options.levels, { formatter: options.formatter, enabled: options.enabled });
		this.#stream = options.stream;
		if (this.#close === false) {
			this.#close = false;
		}
	}

	/**
	 * Set the stream.
	 * @param stream The write stream.
	 */
	public __setStream(stream: Deno.Writer & Deno.Closer): this {
		if (this.#stream !== undefined) {
			throw new Error('Stream is already set!');
		}
		this.#stream = stream;
		return this;
	}

	/**
	 * Write data to the stream.
	 * @param data The produced log data.
	 */
	public async handle(data: Uint8Array): Promise<void> {
		await this.#stream!.write(data);
	}

	/**
	 * Initialize the stream.
	 */
	public init(): Promise<void> | void {
		if (this.#stream === undefined) {
			throw new Error('Initialization failed, no stream found!');
		}
		super.init();
	}

	/**
	 * Dispose of the stream.
	 */
	public dispose() {
		if (this.#close) {
			this.#stream?.close();
		}
		super.dispose();
	}
}
