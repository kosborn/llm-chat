/**
 * Utility functions for serializing and deserializing data to avoid proxy object cloning issues
 */

/**
 * Deep clone an object and strip any proxy/reactive wrappers
 * This is necessary when storing reactive objects in IndexedDB or other storage
 */
export function serialize<T>(obj: T): T {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj !== 'object') {
		return obj;
	}

	if (obj instanceof Date) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(serialize) as T;
	}

	// Handle regular objects
	const serialized = {} as T;
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			serialized[key] = serialize(obj[key]);
		}
	}

	return serialized;
}

/**
 * Create a plain object copy that can be safely stored
 */
export function toPlainObject<T extends Record<string, unknown>>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely clone an object for reactive state
 */
export function cloneForState<T>(obj: T): T {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj !== 'object') {
		return obj;
	}

	// Use structured cloning if available (modern browsers)
	if (typeof structuredClone !== 'undefined') {
		try {
			return structuredClone(obj);
		} catch {
			// Fall back to JSON method if structured clone fails
		}
	}

	// Fallback to JSON serialization
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if an object is a plain object (not a proxy, array, or other special object)
 */
export function isPlainObject(obj: unknown): obj is Record<string, unknown> {
	return obj !== null && typeof obj === 'object' && obj.constructor === Object;
}
