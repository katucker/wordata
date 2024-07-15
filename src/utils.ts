import seedrandom from "seedrandom";
import { GameMode, ms } from "./enums";
import wordList from "./words_5";

export const ROWS = 6;
export const COLS = 5;

export const words = {
	...wordList,
	contains: (word: string) => {
		return wordList.words.includes(word) || wordList.valid.includes(word) || wordList.depart.includes(word);
	},
};

export function checkHardMode(board: GameBoard, row: number): HardModeData {
	for (let i = 0; i < COLS; ++i) {
		if (board.state[row - 1][i] === "🟩" && board.words[row - 1][i] !== board.words[row][i]) {
			return { pos: i, char: board.words[row - 1][i], type: "🟩" };
		}
	}
	for (let i = 0; i < COLS; ++i) {
		if (board.state[row - 1][i] === "🟨" && !board.words[row].includes(board.words[row - 1][i])) {
			return { pos: i, char: board.words[row - 1][i], type: "🟨" };
		}
	}
	return { pos: -1, char: "", type: "⬛" };
}

class Tile {
	public value: string;
	public notSet: Set<string>;
	constructor() {
		this.notSet = new Set<string>();
	}
	not(char: string) {
		this.notSet.add(char);
	}
}

class WordData {
	public letterCounts: Map<string, [number, boolean]>;
	private notSet: Set<string>;
	public word: Tile[];
	constructor() {
		this.notSet = new Set<string>();
		this.letterCounts = new Map<string, [number, boolean]>();
		this.word = [];
		for (let col = 0; col < COLS; ++col) {
			this.word.push(new Tile());
		}
	}
	confirmCount(char: string) {
		let c = this.letterCounts.get(char);
		if (!c) {
			this.not(char);
		} else {
			c[1] = true;
		}
	}
	countConfirmed(char: string) {
		const val = this.letterCounts.get(char);
		return val ? val[1] : false;
	}
	setCount(char: string, count: number) {
		let c = this.letterCounts.get(char);
		if (!c) {
			this.letterCounts.set(char, [count, false]);
		} else {
			c[0] = count;
		}
	}
	incrementCount(char: string) {
		++this.letterCounts.get(char)[0];
	}
	not(char: string) {
		this.notSet.add(char);
	}
	inGlobalNotList(char: string) {
		return this.notSet.has(char);
	}
	lettersNotAt(pos: number) {
		return new Set([...this.notSet, ...this.word[pos].notSet]);
	}
}

export function getRowData(n: number, board: GameBoard) {
	const wd = new WordData();
	for (let row = 0; row < n; ++row) {
		const occured = new Set<string>();
		for (let col = 0; col < COLS; ++col) {
			const state = board.state[row][col];
			const char = board.words[row][col];
			if (state === "⬛") {
				wd.confirmCount(char);
				// if char isn't in the global not list add it to the not list for that position
				if (!wd.inGlobalNotList(char)) {
					wd.word[col].not(char);
				}
				continue;
			}
			// If this isn't the first time this letter has occured in this row
			if (occured.has(char)) {
				wd.incrementCount(char);
			} else if (!wd.countConfirmed(char)) {
				occured.add(char);
				wd.setCount(char, 1);
			}
			if (state === "🟩") {
				wd.word[col].value = char;
			}
			else {	// if (state === "🟨")
				wd.word[col].not(char);
			}
		}
	}

	let exp = "";
	for (let pos = 0; pos < wd.word.length; ++pos) {
		exp += wd.word[pos].value ? wd.word[pos].value : `[^${[...wd.lettersNotAt(pos)].join(" ")}]`;
	}
	return (word: string) => {
		if (new RegExp(exp).test(word)) {
			const chars = word.split("");
			for (const e of wd.letterCounts) {
				const occurences = countOccurences(chars, e[0]);
				if (!occurences || (e[1][1] && occurences !== e[1][0])) return false;
			}
			return true;
		}
		return false;
	};
}

function countOccurences<T>(arr: T[], val: T) {
	return arr.reduce((count, v) => v === val ? count + 1 : count, 0);
}

export function getState(word: string, guess: string): LetterState[] {
	const charArr = word.split("");
	const result = Array<LetterState>(5).fill("⬛");
	for (let i = 0; i < word.length; ++i) {
		if (charArr[i] === guess.charAt(i)) {
			result[i] = "🟩";
			charArr[i] = "$";
		}
	}
	for (let i = 0; i < word.length; ++i) {
		const pos = charArr.indexOf(guess[i]);
		if (result[i] !== "🟩" && pos >= 0) {
			charArr[pos] = "$";
			result[i] = "🟨";
		}
	}
	return result;
}

export function contractNum(n: number) {
	switch (n % 10) {
		case 1: return `${n}st`;
		case 2: return `${n}nd`;
		case 3: return `${n}rd`;
		default: return `${n}th`;
	}
}

export const keys = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function newSeed(mode: GameMode) {
	const now = Date.now();
	switch (mode) {
		case GameMode.daily:
			// Adds time zome offset to UTC time, calculates how many days that falls after 1/1/1970
			// and returns the unix time for the beginning of that day.
			return Date.UTC(1970, 0, 1 + Math.floor((now - (new Date().getTimezoneOffset() * ms.MINUTE)) / ms.DAY));
		case GameMode.hourly:
			return now - (now % ms.HOUR);
		// case GameMode.minutely:
		// 	return now - (now % ms.MINUTE);
		case GameMode.infinite:
			return now - (now % ms.SECOND);
		case GameMode.final:
				return now - (now % ms.SECOND);
		}
}

export const modeData: ModeData = {
	default: GameMode.daily,
	modes: [
		{
			name: "Daily",
			unit: ms.DAY,
			start: 1642370400000,	// 17/01/2022 UTC+2
			seed: newSeed(GameMode.daily),
			historical: false,
			streak: true,
			useTimeZone: true,
		},
		{
			name: "Hourly",
			unit: ms.HOUR,
			start: 1642528800000,	// 18/01/2022 8:00pm UTC+2
			seed: newSeed(GameMode.hourly),
			historical: false,
			icon: "m50,7h100v33c0,40 -35,40 -35,60c0,20 35,20 35,60v33h-100v-33c0,-40 35,-40 35,-60c0,-20 -35,-20 -35,-60z",
			streak: true,
		},
		{
			name: "Infinite",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
			icon: "m7,100c0,-50 68,-50 93,0c25,50 93,50 93,0c0,-50 -68,-50 -93,0c-25,50 -93,50 -93,0z",
		},
		{
			name: "Final",
			unit: ms.SECOND,
			start: 840456000000,	// 19/08/1996 12:00:00pm UTC
			seed: newSeed(GameMode.final),
			historical: false,
			// Icon created by Gan Khoon Lay.
			icon: "M179.615,47.294c-1.74-1.711-4.002-3.123-6.61-4.057c-6.858-3.334-30.569-13.958-58.205-14.043   c-7.788,0-15.904,0.871-24.003,3.093c-4.263,1.169-6.769,5.57-5.6,9.832c1.169,4.26,5.572,6.766,9.834,5.597   c6.489-1.782,13.173-2.523,19.769-2.523c1.205-0.001,2.405,0.032,3.602,0.079c5.416-2.905,11.373-4.448,17.441-4.448h0.134   c6.116,0.021,12.132,1.406,18.263,4.169c1.514,0.682,3.032,1.425,4.564,2.28c5.043,2.84,8.347,5.656,9.238,6.45   c1.659,1.503,2.727,3.436,3.131,5.558c0.087,0.457,0.153,0.919,0.177,1.392c0.132,2.669-0.783,5.228-2.578,7.207   c-1.892,2.088-4.593,3.284-7.411,3.284c-2.486,0-4.87-0.919-6.716-2.59l-0.04-0.034l-0.143-0.119   c-0.253-0.213-0.622-0.511-1.115-0.883c-0.926-0.696-2.431-1.754-4.336-2.825c-4.353-2.471-9.063-3.886-12.931-3.886   c-0.007,0-0.013,0.001-0.019,0.001c-5.432,5.904-9.77,11.931-13.86,19.293c-3.229,0.123-6.461,0.24-9.643,0.331   c-1.812,1.642-4.18,2.607-6.707,2.607c-1.648,0-3.289-0.417-4.749-1.205c-0.647-0.349-1.239-0.768-1.783-1.235   c-7.407-0.072-13.96-0.527-18.51-1.617c-2.505-0.585-4.365-1.387-5.35-2.15c-0.986-0.816-1.133-1.197-1.176-1.99   c-0.002-0.11,0.007-0.24,0.028-0.396c0.049-0.419,0.076-0.816,0.076-1.225c0.036-2.69-1.327-5.122-3.206-6.668   c-2.83-2.358-6.622-3.481-10.934-4.242c-4.314-0.731-9.18-0.985-14.04-0.985c-13.293,0.002-26.555,1.918-26.632,1.927   c-1.642,0.236-2.778,1.758-2.543,3.397c0.236,1.64,1.757,2.777,3.398,2.543l-0.003-0.002c0.009,0,3.222-0.463,8.085-0.931   c4.858-0.468,11.33-0.936,17.694-0.934c6.186-0.008,12.305,0.463,16.523,1.671c2.107,0.589,3.699,1.375,4.561,2.124   c0.861,0.787,1.062,1.24,1.096,2.099c0.002,0.134-0.009,0.294-0.03,0.479c-0.047,0.349-0.074,0.74-0.074,1.142   c-0.045,2.773,1.488,5.271,3.549,6.77c3.102,2.299,7.289,3.354,12.359,4.078c5.067,0.691,11.029,0.919,17.451,0.921   c5.553-0.001,11.454-0.174,17.359-0.387c-1.174,2.379-2.346,4.896-3.538,7.587c-1.015,2.86-1.542,5.43-1.682,7.751   c1.038,0.016,2.084,0.024,3.137,0.024h0.257c2.297,0,4.547-0.042,6.75-0.117c7.35-0.248,14.125-0.902,19.882-1.935   c0.694-0.123,1.373-0.255,2.044-0.391c3.616-0.735,6.867-1.66,9.574-2.717c2.455-3.34,5.053-6.559,7.65-9.623   c1.342,0.358,2.316,0.786,2.797,1.133c0.604,0.494,0.416,0.396,0.461,0.506c0,0.025,0,0.032,0.001,0.053   c-0.084,1.82-0.756,3.373-2.192,4.906c-0.418,0.446-0.891,0.89-1.443,1.338c-2.156,1.736-5.375,3.268-9.305,4.528   c-1.783,0.572-3.712,1.088-5.757,1.542c-1.128,0.25-2.285,0.483-3.478,0.694c-6.383,1.146-13.616,1.772-20.959,1.99   c-2.005,0.059-4.017,0.094-6.023,0.094c-1.141,0.002-2.279-0.009-3.415-0.026c-15.209-0.234-29.685-2.116-36.499-4.358   c-5.938-1.931-11.156-2.726-15.884-2.724c-8.996,0-16.019,2.857-22.842,5.469c-6.862,2.628-13.554,5.064-22.588,5.071   c-3.655,0-7.705-0.404-12.315-1.394c-1.62-0.349-3.217,0.683-3.566,2.3c-0.349,1.621,0.683,3.217,2.303,3.566   c4.99,1.072,9.479,1.529,13.578,1.529c0.012,0,0.023,0,0.034,0c10.144,0,17.821-2.831,24.701-5.469   c6.925-2.662,13.018-5.073,20.694-5.073c4.056,0.002,8.604,0.67,14.029,2.433c8.209,2.641,23.474,4.495,39.663,4.661   c0.701,0.007,1.401,0.016,2.105,0.017c1.231,0,2.466-0.015,3.699-0.036c9.735-0.17,19.455-1.012,27.815-2.839   c1.285-0.28,2.535-0.585,3.75-0.914c0.323-0.087,0.652-0.171,0.97-0.262c5.144-1.48,9.605-3.402,13.017-6.096   c0.75-0.585,1.44-1.231,2.078-1.917c2.254-2.422,3.737-5.437,3.827-8.873c0.001-0.023-0.005-0.045-0.005-0.069   c0.001-0.034,0.009-0.066,0.008-0.1c-0.003-0.038-0.003-0.038-0.003-0.038c0.045-2.296-1.371-4.344-3.029-5.429   c-0.623-0.421-1.288-0.781-1.995-1.093c2.931-3.313,5.753-6.401,8.235-9.197C183.072,65.631,185.888,53.462,179.615,47.294z M119.913,111.587c-0.938,0.012-1.859,0.02-2.736,0.021c-0.362-0.001-0.724-0.006-1.086-0.008   c0.643,1.076,1.392,2.065,2.217,2.978c-1.325,2.312-2.935,4.764-4.879,7.142c-3.467,4.275-7.872,8.308-13.472,11.283   c-5.62,2.967-12.462,5.003-21.563,5.022c-5.734,0-12.376-0.842-20.069-2.941c-6.659-1.819-13.531,2.107-15.351,8.767   c-1.818,6.659,2.106,13.534,8.768,15.352c9.584,2.616,18.462,3.822,26.652,3.822c13.41,0.021,24.938-3.305,34.167-8.416   c12.779-7.064,21.059-17.104,26.315-25.7c4.476,6.495,8.119,14.648,8.073,23.148c-0.074,7.521-2.42,16.005-11.394,26.559   c-4.503,5.234-3.91,13.128,1.324,17.628c2.36,2.03,5.261,3.024,8.147,3.024c3.515,0.001,7.009-1.474,9.482-4.347   c12.26-14.129,17.515-29.246,17.44-42.864c0-8.561-1.944-16.362-4.707-23.09c-3.708-8.989-8.814-16.156-13.34-21.47   c-2.089,0.594-4.262,1.103-6.479,1.544C138.085,110.896,127.961,111.482,119.913,111.587z M102.05,80.093c0.405,0.219,0.823,0.386,1.245,0.529c0.838,0.284,1.698,0.436,2.553,0.436c0.949,0,1.884-0.184,2.768-0.509   c1.764-0.648,3.313-1.903,4.277-3.686c4.181-7.725,8.44-12.166,12.255-14.694c3.832-2.514,7.297-3.317,10.82-3.341   c0.629-0.004,1.261,0.025,1.893,0.082c4.383,0.393,8.76,2.148,12.129,4.061c1.923,1.08,3.503,2.175,4.56,2.971   c0.527,0.397,0.925,0.719,1.172,0.925c0.123,0.102,0.208,0.177,0.253,0.215l0.013,0.011c3.274,2.969,8.334,2.72,11.303-0.555   c1.925-2.124,2.487-5,1.756-7.569c-0.396-1.389-1.163-2.689-2.312-3.73h-0.002c-0.307-0.273-3.558-3.205-8.905-6.216   c-1.691-0.943-3.601-1.907-5.707-2.784c-4.546-1.896-10.004-3.39-16.151-3.411c-4.294-0.016-8.912,0.791-13.473,2.689   c-2.087,0.869-4.163,1.966-6.189,3.318c-6.475,4.291-12.38,10.964-17.486,20.416C96.717,73.137,98.163,77.992,102.05,80.093z",
		},
		// {
		// 	name: "Minutely",
		// 	unit: ms.MINUTE,
		// 	start: 1642528800000,	// 18/01/2022 8:00pm
		// 	seed: newSeed(GameMode.minutely),
		// 	historical: false,
		// 	icon: "m7,200v-200l93,100l93,-100v200",
		// 	streak: true,
		// },
	]
};

export function getWordNumber(mode: GameMode) {
	return Math.round((modeData.modes[mode].seed - modeData.modes[mode].start) / modeData.modes[mode].unit) + 1;
}

export function seededRandomInt(min: number, max: number, seed: number) {
	const rng = seedrandom(`${seed}`);
	return Math.floor(min + (max - min) * rng());
}

export const DELAY_INCREMENT = 200;

export const PRAISE = [
	"Genius",
	"Magnificent",
	"Impressive",
	"Splendid",
	"Great",
	"Phew",
];

export function createNewGame(mode: GameMode): GameState {
	return {
		active: true,
		guesses: 0,
		time: modeData.modes[mode].seed,
		wordNumber: getWordNumber(mode),
		validHard: true,
		board: {
			words: Array(ROWS).fill(""),
			state: Array.from({ length: ROWS }, () => (Array(COLS).fill("🔳")))
		},
	};
}

export function createDefaultSettings(): Settings {
	return {
		hard: new Array(modeData.modes.length).map(() => false),
		dark: true,
		colorblind: false,
		tutorial: 3,
	};
}

export function createDefaultStats(mode: GameMode): Stats {
	const stats = {
		played: 0,
		lastGame: 0,
		guesses: {
			fail: 0,
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
			6: 0,
		}
	};
	if (!modeData.modes[mode].streak) return stats;
	return {
		...stats,
		streak: 0,
		maxStreak: 0,
	};
};

export function createLetterStates(): { [key: string]: LetterState; } {
	return {
		a: "🔳",
		b: "🔳",
		c: "🔳",
		d: "🔳",
		e: "🔳",
		f: "🔳",
		g: "🔳",
		h: "🔳",
		i: "🔳",
		j: "🔳",
		k: "🔳",
		l: "🔳",
		m: "🔳",
		n: "🔳",
		o: "🔳",
		p: "🔳",
		q: "🔳",
		r: "🔳",
		s: "🔳",
		t: "🔳",
		u: "🔳",
		v: "🔳",
		w: "🔳",
		x: "🔳",
		y: "🔳",
		z: "🔳",
	};
}

export function timeRemaining(m: Mode) {
	if (m.useTimeZone) {
		return m.unit - (Date.now() - (m.seed + new Date().getTimezoneOffset() * ms.MINUTE));
	}
	return m.unit - (Date.now() - m.seed);
}

export function failed(s: GameState) {
	return !(s.active || (s.guesses > 0 && s.board.state[s.guesses - 1].join("") === "🟩".repeat(COLS)));
}