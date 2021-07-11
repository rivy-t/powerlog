// Imports
import type { ILevelEmitter } from './types.ts';

const regex = /^\d+$/g;

/**
 * Manage what levels goes through or is ignored.
 */
export default class LogLevelManager<LogLevels> implements ILevelEmitter<LogLevels> {
	/** The levels that are currently enabled. */
	#levels: number = 0;
	#enum: LogLevels;

	/** Get the levels that are currently enabled. */
	public get levels(): number {
		return this.#levels;
	}
	public get enum(): LogLevels {
		return this.#enum;
	}

	/**
	 * Initialize a new level manager.
	 * @param levels The levels enumerable.
	 */
	public constructor(levels: LogLevels, enableArray: (keyof LogLevels | number)[] | -1 = -1) {
		this.#enum = levels;

		if (Array.isArray(enableArray)) {
			this.enable(...enableArray);
		} else if (enableArray === -1) {
			for (const _ in levels) {
				this.enable(_);
			}
		}
	}

	/**
	 * Enable one or more levels.
	 * @param levels The levels to enable.
	 */
	enable(...levels: (keyof LogLevels | number)[]): this {
		for (let level of levels) {
			if ((this.#enum as any)[level] === undefined) {
				throw new Error("Unknown level '" + level + "'");
			}
			if (typeof level === 'string' && !regex.test(level)) level = this.#enum[level] as any;
			level = Number(level);
			const l = 2 ** (level as number);
			if ((this.#levels & l) === l) continue;
			this.#levels |= l;
		}
		return this;
	}

	/**
	 * Disable one or more levels.
	 * @param levels The levels to disable.
	 */
	disable(...levels: (keyof LogLevels | number)[]): this {
		for (let level of levels) {
			if ((this.#enum as any)[level] === undefined) {
				throw new Error("Unknown level '" + level + "'");
			}
			if (typeof level === 'string' && !regex.test(level)) level = this.#enum[level] as any;
			const l = 2 ** (level as number);
			if ((this.#levels & l) !== l) continue;
			this.#levels -= l;
		}
		return this;
	}

	/**
	 * Check whether one or more levels are emitted.
	 * @param levels The levels to check.
	 */
	emits(...levels: (keyof LogLevels | number)[]): boolean {
		return levels.every((level) => {
			if ((this.#enum as any)[level] === undefined) {
				throw new Error("Unknown level '" + level + "'");
			}
			if (typeof level === 'string' && !regex.test(level)) level = this.#enum[level] as any;
			const l = 2 ** (level as number);
			return (this.#levels & l) === l;
		});
	}
}
