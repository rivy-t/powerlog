// spell-checker:ignore () Deno printf sprintf

// Imports
import { Queue, sprintf } from '../deps.ts';
import LogLevelManager from '../LogLevelManager.ts';
import type { ILogData, ITransport } from '../types.ts';

/**
 * A transportation base.
 */
export default class TransportBase<TLogLevel> extends LogLevelManager<TLogLevel>
	implements ITransport<TLogLevel> {
	#initialized = false;
	#disposed = false;

	public get initialized(): boolean {
		return this.#initialized;
	}
	public get disposed(): boolean {
		return this.#disposed;
	}

	/**
	 * Check if a value is a valid transport.
	 * @param value The value to check.
	 */
	public static isTransport(value: unknown): boolean {
		return true &&
			typeof value === 'object' &&
			value !== null &&
			typeof (value as { init(): void }).init === 'function' &&
			typeof (value as { dispose(): void }).dispose === 'function' &&
			typeof (value as { push(): void }).push === 'function';
	}

	/** A writing queue. */
	#queue = new Queue(false);

	/**
	 * Initialize the transport.
	 */
	public init(): void {
		this.#initialized = true;
		this.#queue.start();
	}

	/** Dispose / stop the transport. */
	public dispose(): void {
		this.#disposed = true;
		this.#queue.stop();
	}

	/**
	 * Push the log data onto the queue.
	 * @param data The log data.
	 */
	public async push(data: ILogData): Promise<unknown | undefined> {
		if (!this.emits(data.level)) return;
		return await this._push(async () => await this.handle(await this.dataToByteArray(data)));
	}

	/**
	 * Push a function onto the queue.
	 * @param fn The function.
	 * @param args The arguments to pass to the function.
	 */
	public async _push(fn: (...args: any[]) => any, ...args: any[]): Promise<unknown> {
		return await this.#queue.push(fn, ...args);
	}

	/**
	 * Handle the log data.
	 * @param data The log data.
	 */
	public async handle(data: Uint8Array): Promise<void> {
		throw new Error('<Transport>.handle not implemented!');
	}

	/**
	 * Turn the log data into a byte array.
	 * @param data The log data.
	 */
	public dataToByteArray(data: ILogData): Promise<Uint8Array> | Uint8Array {
		console.warn({ _: 'TransportBase/dataToByteArray', data });
		return new Promise(async (resolve, reject) => {
			try {
				resolve(new TextEncoder().encode(await this.dataToString(data)));
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Turn the log data into a string.
	 * @param data The log data.
	 */
	public dataToString(data: ILogData): Promise<string> | string {
		console.warn({ _: 'TransportBase/dataToString', data });
		// use Deno `printf` format verbs; ref: <https://deno.land/std@0.103.0/fmt>
		const formatRegex = /%[-+# 0<](?[0-9*]?[.]?[0-9*])?[bcoxXeEfFgGstTvj%]/;
		const message = (data && data.arguments) ? this.asString(data.arguments.shift()) : '';
		const isFmtString = message.match(formatRegex);
		if (isFmtString) {
			return sprintf('%s ' + message, (this.enum as any)[data.level], ...data.arguments);
		} else {
			let s = '';
			for (const o in data) {
				s += ' ' + Deno.inspect(o, { colors: true });
			}
			return s;
		}
	}

	asString(data: unknown): string {
		if (typeof data === 'string') {
			return data;
		} else if (
			data === null ||
			typeof data === 'number' ||
			typeof data === 'bigint' ||
			typeof data === 'boolean' ||
			typeof data === 'undefined' ||
			typeof data === 'symbol'
		) {
			return String(data);
		} else if (data instanceof Error) {
			return data.stack!;
		} else if (typeof data === 'object') {
			return JSON.stringify(data);
		}
		return 'undefined';
	}
}
