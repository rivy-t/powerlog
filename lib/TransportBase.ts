// Imports
import { Queue, sprintf } from './deps.ts';
import LevelManager from './LevelManager.ts';
import type { ILogData, ITransport } from './types.ts';

/**
 * A transportation base.
 */
export default class TransportBase<Levels> extends LevelManager<Levels>
	implements ITransport<Levels> {
	#init = false;
	#disp = false;

	public get initialized(): boolean {
		return this.#init;
	}
	public get disposed(): boolean {
		return this.#disp;
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
		this.#init = true;
		this.#queue.start();
	}

	/** Dispose / stop the transport. */
	public dispose(): void {
		this.#disp = true;
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
		return sprintf('%s ' + data.message, (this.enum as any)[data.level], ...data.arguments);
	}
}
