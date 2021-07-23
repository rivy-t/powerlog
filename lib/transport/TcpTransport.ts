// spell-checker:ignore () Deno rivy

import type { TTcpTransportOptions } from '../types.ts';
import WriterTransport from './WriterTransport.ts';

/**
 * A transport that pushes logs to a tcp server or a unix sock.
 */
export default class TcpTransport<TLogLevel> extends WriterTransport<TLogLevel> {
	/** The connection options. */
	#connectOptions: Deno.ConnectOptions;
	#timeout?: number;

	/**
	 * Create a new file transport.
	 * @param options The file transport options.
	 */
	public constructor(options: TTcpTransportOptions<TLogLevel> & Deno.ConnectOptions) {
		super(options);
		this.#connectOptions = {
			port: options.port,
			hostname: options.hostname,
			transport: options.transport,
		};
		this.#timeout = options.timeout;
	}

	/**
	 * Initialize the writer.
	 */
	public async init(): Promise<void> {
		// ToDO: [2021-07-23; rivy] add hacked timeout...; await resolution of <https://github.com/denoland/deno/issues/3515> for a better solution
		// try {
		// 	const timeout = new Promise((_resolve, reject) => {
		// 		setTimeout(reject, 250);
		// 	});
		// 	return await Promise.race([
		// 		timeout,
		// 		Deno.connect({ port: 8080, /* hostname: '127.0.0.1', */ transport: 'tcp' }),
		// 	]) as any as (Deno.Writer & Deno.Closer) | undefined;
		// } catch {
		// 	logger.warn('Unable to connect to "http://127.0.0.1:8080"');
		// 	return undefined;
		// }
		const conn = await Deno.connect(this.#connectOptions);
		this.__setStream(conn);
		await super.init();
	}
}
