import { debugStore } from '../stores/debug-store.svelte.js';

/**
 * Console wrapper that only logs when debug store is enabled
 */
export const debugConsole = {
	log: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.log(...args);
		}
	},

	error: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.error(...args);
		}
	},

	warn: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.warn(...args);
		}
	},

	info: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.info(...args);
		}
	},

	debug: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.debug(...args);
		}
	},

	trace: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.trace(...args);
		}
	},

	table: (data: unknown, properties?: string[]): void => {
		if (debugStore.isEnabled) {
			console.table(data, properties);
		}
	},

	group: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.group(...args);
		}
	},

	groupCollapsed: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.groupCollapsed(...args);
		}
	},

	groupEnd: (): void => {
		if (debugStore.isEnabled) {
			console.groupEnd();
		}
	},

	time: (label?: string): void => {
		if (debugStore.isEnabled) {
			console.time(label);
		}
	},

	timeEnd: (label?: string): void => {
		if (debugStore.isEnabled) {
			console.timeEnd(label);
		}
	},

	timeLog: (label?: string, ...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.timeLog(label, ...args);
		}
	},

	count: (label?: string): void => {
		if (debugStore.isEnabled) {
			console.count(label);
		}
	},

	countReset: (label?: string): void => {
		if (debugStore.isEnabled) {
			console.countReset(label);
		}
	},

	clear: (): void => {
		if (debugStore.isEnabled) {
			console.clear();
		}
	},

	dir: (obj: unknown, options?: object): void => {
		if (debugStore.isEnabled) {
			console.dir(obj, options);
		}
	},

	dirxml: (...args: unknown[]): void => {
		if (debugStore.isEnabled) {
			console.dirxml(...args);
		}
	}
};
