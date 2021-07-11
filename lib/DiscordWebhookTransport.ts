// Imports
import { sprintf } from './deps.ts';
import TransportBase from './TransportBase.ts';
import type { ILogData, TFormatTransportBaseOptions } from './types.ts';

// #region Discord Message Interfaces

export interface IDiscordEmbedImage {
	url: string;
	image: { url: string };
}

export interface IDiscordEmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface IDiscordEmbedAuthor {
	author: string;
	icon_url?: string;
	url?: string;
}

export interface IDiscordEmbedUrl {
	url: string;
}

export interface IDiscordEmbed {
	fields?: [
		field0?: IDiscordEmbedField | undefined,
		field1?: IDiscordEmbedField | undefined,
		field2?: IDiscordEmbedField | undefined,
		field3?: IDiscordEmbedField | undefined,
		field4?: IDiscordEmbedField | undefined,
		field5?: IDiscordEmbedField | undefined,
		field6?: IDiscordEmbedField | undefined,
		field7?: IDiscordEmbedField | undefined,
		field8?: IDiscordEmbedField | undefined,
		field9?: IDiscordEmbedField | undefined,
		field10?: IDiscordEmbedField | undefined,
		field11?: IDiscordEmbedField | undefined,
		field12?: IDiscordEmbedField | undefined,
		field13?: IDiscordEmbedField | undefined,
		field14?: IDiscordEmbedField | undefined,
		field15?: IDiscordEmbedField | undefined,
		field16?: IDiscordEmbedField | undefined,
		field17?: IDiscordEmbedField | undefined,
		field18?: IDiscordEmbedField | undefined,
		field19?: IDiscordEmbedField | undefined,
		field20?: IDiscordEmbedField | undefined,
		field21?: IDiscordEmbedField | undefined,
		field22?: IDiscordEmbedField | undefined,
		field23?: IDiscordEmbedField | undefined,
		field24?: IDiscordEmbedField | undefined,
	];
	title?: string | null;
	description?: string | null;
	url?: string | null;
	color?: number | null;
	author?: IDiscordEmbedAuthor;
	thumbnail?: IDiscordEmbedUrl;
	image?: IDiscordEmbedUrl;
}

export type ei = IDiscordEmbed | IDiscordEmbedImage;

export interface IDiscordMessage {
	content?: string | null;
	embeds?: [
		embed0?: ei | undefined,
		embed1?: ei | undefined,
		embed2?: ei | undefined,
		embed3?: ei | undefined,
		embed4?: ei | undefined,
		embed5?: ei | undefined,
		embed6?: ei | undefined,
		embed7?: ei | undefined,
		embed8?: ei | undefined,
		embed9?: ei | undefined,
	];
	username?: string | null;
	avatar_url?: string | null;
}

export type TDiscordFormatter = (data: ILogData) => Promise<IDiscordMessage> | IDiscordMessage;

export type TDiscordOptions<Levels> = {
	enabled?: (number | keyof Levels)[] | -1;
	formatter?: TDiscordFormatter;
	levels: Levels;
	url: string;
	username?: string;
	avatar_url?: string;
	delay?: number;
};

// #endregion

/**
 * A transport that sends messages to a discord webhook.
 */
export default class DiscordWebhookTransport<Levels> extends TransportBase<Levels> {
	#formatter: undefined | TDiscordFormatter;
	#url: string;
	#username?: string;
	#avatar_url?: string;
	#delay: number;

	/**
	 * Create a new Discord webhook Transport.
	 * @param options The discord webhook transport
	 *  options.
	 */
	public constructor(options: TDiscordOptions<Levels>) {
		super(options.levels, options.enabled);
		this.#formatter = options.formatter;
		this.#url = options.url;
		this.#username = options.username;
		this.#avatar_url = options.avatar_url;
		this.#delay = options.delay || 200;
	}
	public async push(data: ILogData): Promise<unknown> {
		if (!this.emits(data.level)) return;
		this._push(() => new Promise((resolve) => setTimeout(resolve, this.#delay)));
		return await this._push(async () => {
			let message = typeof this.#formatter === 'function'
				? (await this.#formatter(data)) as IDiscordMessage
				: {
					content: sprintf('%s ' + data.message, (this.enum as any)[data.level], ...data.arguments),
				} as IDiscordMessage;
			if (message instanceof Uint8Array) (message as any) = new TextDecoder().decode(message);
			if (typeof message === 'string') message = { content: message };
			if (!message.username && this.#username) {
				message.username = this.#username;
			}
			if (!message.avatar_url && this.#avatar_url) {
				message.avatar_url = this.#avatar_url;
			}
			const json = JSON.stringify(message);
			const response = await fetch(this.#url, {
				headers: { 'Content-Type': 'application/json', 'Accepts': 'application/json' },
				method: 'POST',
				body: json,
			});
			const text = await response.text();
			try {
				const json = JSON.parse(text);
				if (json.message) {
					throw new Error(json.message);
				}
			} catch (error) {}
		});
	}

	/** Get the current formatter. */
	public format(): TDiscordFormatter | undefined;

	/**
	 * Set the current formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter: TDiscordFormatter): this;

	/**
	 * Set/get the current formatter.
	 * @param formatter The formatter.
	 */
	public format(formatter?: TDiscordFormatter): this | TDiscordFormatter | undefined;
	public format(formatter?: TDiscordFormatter): this | TDiscordFormatter | undefined {
		if (typeof formatter === 'function') {
			this.#formatter = formatter;
			return this;
		}
		return this.#formatter;
	}
}
