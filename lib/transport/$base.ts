// spell-checker:ignore () Deno printf sprintf

// Imports
import { Queue, sprintf } from '../deps.ts';
import LogLevelManager from '../LogLevelManager.ts';
import type { ILogData, ITransport } from '../types.ts';

import * as Util from 'https://deno.land/std@0.103.0/node/util.ts';

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
		// console.warn({ _: 'TransportBase/push(data)', data });
		if (!this.emits(data.level)) return;
		return await this._push(async () => await this.handle(await this.dataToByteArray(data)));
	}

	/**
	 * Push a function onto the queue.
	 * @param fn The function.
	 * @param args The arguments to pass to the function.
	 */
	public async _push(fn: (_: any[]) => any, ...args: any[]): Promise<unknown> {
		// console.warn({ _: 'TransportBase/#queue.push(fn, args)', args });
		return await this.#queue.push(fn, ...args);
	}

	/**
	 * Handle the log data.
	 * @param data The log data.
	 */
	public async handle(data: Uint8Array): Promise<void> {
		// console.warn({ _: 'TransportBase/handle(data)', data });
		throw new Error('<Transport>.handle not implemented!');
	}

	/**
	 * Turn the log data into a byte array.
	 * @param data The log data.
	 */
	public dataToByteArray(data: ILogData): Promise<Uint8Array> | Uint8Array {
		// console.warn({ _: 'TransportBase/dataToByteArray', data });
		// let s = this.dataToString(data);
		return new Promise(async (resolve, reject) => {
			try {
				let s = await this.dataToString(data);
				// console.warn({ _: 'TransportBase/dataToByteArray', s });
				resolve(new TextEncoder().encode(s));
			} catch (error) {
				console.error('REJECTED');
				reject(error);
			}
		});
	}

	/**
	 * Turn the log data into a string.
	 * @param data The log data.
	 */
	public dataToString(data: ILogData): Promise<string> | string {
		// console.warn({ _: 'TransportBase/dataToString', data });

		// use Deno `printf` format verbs; ref: <https://deno.land/std@0.103.0/fmt>
		const formatRegex = /%[-+# 0<]?([0-9*]?[.]?[0-9*])?[tbcoxXeEfFgGsTvj%]/; // spell-checker:disable-line

		let s = sprintf('%s', (this.enum as any)[data.level]);
		// console.warn({ _: 'TransportBase/dataToString', data, s });
		const args = (data && data.arguments) ? [...data.arguments] : [];
		const message = this.asString(args.shift() || '');
		// console.warn({ _: 'TransportBase/dataToString', message, args });
		const isFmtString = message.match(formatRegex);
		if (isFmtString) {
			// console.warn({ _: 'TransportBase/dataToString', s });
			s += ' ' + sprintf(message, ...args);
		} else {
			for (const o of [message, ...args]) {
				// console.warn({ _: 'TransportBase/dataToString (iter over objects)', s, o });
				const isString = typeof o === 'string';
				s += ' ' + (isString ? o : Deno.inspect(o, { colors: true }));
			}
		}
		// console.warn({ _: 'TransportBase/dataToString', s });
		// return s;
		return new Promise(async (resolve, _reject) => {
			resolve(s);
		});
		// return Util.format(data.arguments.shift(), ...data.arguments);
	}

	asString(data: unknown): string {
		const isString = typeof data === 'string';
		return isString ? data as string : Deno.inspect(data, { colors: true });
		// if (typeof data === 'string') {
		// 	return data;
		// } else if (
		// 	data === null ||
		// 	typeof data === 'number' ||
		// 	typeof data === 'bigint' ||
		// 	typeof data === 'boolean' ||
		// 	typeof data === 'undefined' ||
		// 	typeof data === 'symbol'
		// ) {
		// 	return String(data);
		// } else if (data instanceof Error) {
		// 	return data.stack!;
		// } else if (typeof data === 'object') {
		// 	return JSON.stringify(data);
		// }
		// return 'undefined';
	}
}
