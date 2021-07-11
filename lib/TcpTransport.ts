// spell-checker:ignore () Deno

import type { TWriterTransportOptions } from './types.ts';
import WriterTransport from './WriterTransport.ts';

/**
 * A transport that pushes logs to a tcp server or a unix sock.
 */
export default class TcpTransport<LogLevels> extends WriterTransport<LogLevels> {
	/** The connection options. */
	#connectOptions: Deno.ConnectOptions;

	/**
	 * Create a new file transport.
	 * @param options The file transport options.
	 */
	public constructor(options: TWriterTransportOptions<LogLevels> & Deno.ConnectOptions) {
		super(options);
		this.#connectOptions = {
			port: options.port,
			hostname: options.hostname,
			transport: options.transport,
		};
	}

	/**
	 * Initialize the writer.
	 */
	public async init(): Promise<void> {
		const conn = await Deno.connect(this.#connectOptions);
		this.__setStream(conn);
		await super.init();
	}
}
