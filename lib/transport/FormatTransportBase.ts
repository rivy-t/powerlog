// Imports
import { ILogData, TFormatter, TFormatTransportBaseOptions } from '../types.ts';
import TransportBase from './$base.ts';

/**
 * The transport base, but adds the ability for an external formatter.
 */
export default class FormatTransportBase<TLogLevel> extends TransportBase<TLogLevel> {
	#formatter: undefined | TFormatter;

	/**
	 * Initialize the format transport base.
	 * @param levels The levels enum.
	 * @param formatter The formatter function.
	 */
	public constructor(
		levels: TLogLevel,
		options?: Omit<TFormatTransportBaseOptions<TLogLevel>, 'levels'>,
	) {
		super(levels, options?.enabled);
		this.#formatter = options?.formatter;
	}

	/** Get the current formatter. */
	public format(): TFormatter | undefined;

	/**
	 * Set the current formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter: TFormatter): this;

	/**
	 * Set/get the current formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter?: TFormatter): this | TFormatter | undefined;
	public format(formatter?: TFormatter): this | TFormatter | undefined {
		if (typeof formatter === 'function') {
			this.#formatter = formatter;
			return this;
		}
		return this.#formatter;
	}

	/**
	 * Turn the log data into a byte array using the
	 * formatter or the base transport formatter.
	 * @param data The log data.
	 */
	public async dataToByteArray(data: ILogData): Promise<Uint8Array> {
		// console.warn({ _: 'FormatTransportBase/dataToByteArray', data });
		if (typeof this.#formatter === 'function') {
			// console.warn({ _: 'FormatTransportBase/dataToByteArray: formatting...' });
			const _ = await this.#formatter(data);
			if (typeof _ === 'string') {
				return new TextEncoder().encode(_);
			}
			return _;
		}
		// console.warn({ _: 'FormatTransportBase/dataToByteArray: dataToByteArray...' });
		return await super.dataToByteArray(data);
	}
}
