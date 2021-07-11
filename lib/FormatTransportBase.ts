// Imports
import TransportBase from './TransportBase.ts';
import { ILogData, TFormatter, TFormatTransportBaseOptions } from './types.ts';

/**
 * The transport base, but adds the ability for an external formatter.
 */
export default class FormatTransportBase<LogLevels> extends TransportBase<LogLevels> {
	#formatter: undefined | TFormatter;

	/**
	 * Initialize the format transport base.
	 * @param levels The levels enum.
	 * @param formatter The formatter function.
	 */
	public constructor(
		levels: LogLevels,
		options?: Omit<TFormatTransportBaseOptions<LogLevels>, 'levels'>,
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
		if (typeof this.#formatter === 'function') {
			const _ = await this.#formatter(data);
			if (typeof _ === 'string') {
				return new TextEncoder().encode(_);
			}
			return _;
		}
		return await super.dataToByteArray(data);
	}
}
