import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const jsonFormatterConfig: ToolConfig = {
	name: 'json-formatter',
	description: 'Format, validate, and manipulate JSON data with various operations',
	category: 'data',
	version: '1.0.0',
	author: 'System',
	tags: ['json', 'format', 'validate', 'data', 'parse'],
	enabled: true
};

const jsonFormatterParameters = z.object({
	jsonString: z.string().describe('The JSON string to process'),
	operation: z
		.enum([
			'format',
			'minify',
			'validate',
			'extract_keys',
			'extract_values',
			'get_size',
			'flatten',
			'unflatten'
		])
		.describe('The operation to perform on the JSON'),
	options: z
		.object({
			indent: z.number().default(2).describe('Number of spaces for indentation when formatting'),
			sortKeys: z.boolean().default(false).describe('Sort object keys alphabetically'),
			includeArrayIndices: z
				.boolean()
				.default(false)
				.describe('Include array indices when flattening'),
			separator: z.string().default('.').describe('Separator for flattened keys')
		})
		.optional()
});

async function executeJsonFormatter(params: Record<string, unknown>) {
	const parsed = jsonFormatterParameters.parse(params);
	const { jsonString, operation } = parsed;
	const options = parsed.options || {
		indent: 2,
		sortKeys: false,
		includeArrayIndices: false,
		separator: '.'
	};
	const { indent = 2, sortKeys = false, includeArrayIndices = false, separator = '.' } = options;

	try {
		// First, try to parse the JSON to validate it
		let parsedJson: any;
		try {
			parsedJson = JSON.parse(jsonString);
		} catch (parseError) {
			if (operation === 'validate') {
				return {
					operation,
					valid: false,
					error: parseError instanceof Error ? parseError.message : 'Invalid JSON',
					position: getErrorPosition(jsonString, parseError),
					timestamp: new Date().toISOString()
				};
			}
			throw new Error(
				`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
			);
		}

		let result: any;
		let metadata: any = {};

		switch (operation) {
			case 'format':
				if (sortKeys) {
					parsedJson = sortObjectKeys(parsedJson);
				}
				result = JSON.stringify(parsedJson, null, indent);
				metadata = {
					originalSize: jsonString.length,
					formattedSize: result.length,
					indentLevel: indent,
					keysSorted: sortKeys
				};
				break;

			case 'minify':
				result = JSON.stringify(parsedJson);
				metadata = {
					originalSize: jsonString.length,
					minifiedSize: result.length,
					compressionRatio:
						(((jsonString.length - result.length) / jsonString.length) * 100).toFixed(2) + '%'
				};
				break;

			case 'validate':
				result = {
					valid: true,
					type: Array.isArray(parsedJson) ? 'array' : typeof parsedJson,
					message: 'Valid JSON'
				};
				metadata = getJsonMetadata(parsedJson);
				break;

			case 'extract_keys':
				result = extractAllKeys(parsedJson);
				metadata = {
					totalKeys: result.length,
					uniqueKeys: [...new Set(result)].length,
					duplicateKeys: result.length - [...new Set(result)].length
				};
				break;

			case 'extract_values':
				result = extractAllValues(parsedJson);
				metadata = {
					totalValues: result.length,
					valueTypes: getValueTypeStats(result)
				};
				break;

			case 'get_size':
				const size = calculateJsonSize(parsedJson);
				result = size;
				metadata = {
					bytesUtf8: new TextEncoder().encode(jsonString).length,
					characters: jsonString.length
				};
				break;

			case 'flatten':
				result = flattenObject(parsedJson, separator, includeArrayIndices);
				metadata = {
					originalDepth: getMaxDepth(parsedJson),
					flattenedKeys: Object.keys(result).length,
					separator,
					includeArrayIndices
				};
				break;

			case 'unflatten':
				result = unflattenObject(parsedJson, separator);
				metadata = {
					originalKeys: Object.keys(parsedJson).length,
					unflattenedDepth: getMaxDepth(result),
					separator
				};
				break;

			default:
				throw new Error(`Unknown operation: ${operation}`);
		}

		return {
			operation,
			result,
			metadata,
			options,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		throw new Error(
			`JSON processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

function getErrorPosition(jsonString: string, error: any): { line: number; column: number } | null {
	if (error && typeof error.message === 'string') {
		const match = error.message.match(/position (\d+)/);
		if (match) {
			const position = parseInt(match[1]);
			const lines = jsonString.substring(0, position).split('\n');
			return {
				line: lines.length,
				column: lines[lines.length - 1].length + 1
			};
		}
	}
	return null;
}

function sortObjectKeys(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys);
	} else if (obj !== null && typeof obj === 'object') {
		const sorted: any = {};
		Object.keys(obj)
			.sort()
			.forEach((key) => {
				sorted[key] = sortObjectKeys(obj[key]);
			});
		return sorted;
	}
	return obj;
}

function extractAllKeys(obj: any, keys: string[] = []): string[] {
	if (Array.isArray(obj)) {
		obj.forEach((item) => extractAllKeys(item, keys));
	} else if (obj !== null && typeof obj === 'object') {
		Object.keys(obj).forEach((key) => {
			keys.push(key);
			extractAllKeys(obj[key], keys);
		});
	}
	return keys;
}

function extractAllValues(obj: any, values: any[] = []): any[] {
	if (Array.isArray(obj)) {
		obj.forEach((item) => extractAllValues(item, values));
	} else if (obj !== null && typeof obj === 'object') {
		Object.values(obj).forEach((value) => {
			values.push(value);
			if (typeof value === 'object' && value !== null) {
				extractAllValues(value, values);
			}
		});
	} else {
		values.push(obj);
	}
	return values;
}

function getValueTypeStats(values: any[]): Record<string, number> {
	const stats: Record<string, number> = {};
	values.forEach((value) => {
		const type = Array.isArray(value) ? 'array' : typeof value;
		stats[type] = (stats[type] || 0) + 1;
	});
	return stats;
}

function calculateJsonSize(obj: any): { nodes: number; leaves: number; depth: number } {
	let nodes = 0;
	let leaves = 0;

	function traverse(item: any, currentDepth: number): number {
		let maxDepth = currentDepth;

		if (Array.isArray(item)) {
			nodes++;
			if (item.length === 0) {
				leaves++;
			} else {
				item.forEach((subItem) => {
					maxDepth = Math.max(maxDepth, traverse(subItem, currentDepth + 1));
				});
			}
		} else if (item !== null && typeof item === 'object') {
			nodes++;
			const keys = Object.keys(item);
			if (keys.length === 0) {
				leaves++;
			} else {
				keys.forEach((key) => {
					maxDepth = Math.max(maxDepth, traverse(item[key], currentDepth + 1));
				});
			}
		} else {
			leaves++;
		}

		return maxDepth;
	}

	const depth = traverse(obj, 0);
	return { nodes, leaves, depth };
}

function getMaxDepth(obj: any): number {
	if (Array.isArray(obj)) {
		return 1 + Math.max(0, ...obj.map(getMaxDepth));
	} else if (obj !== null && typeof obj === 'object') {
		return 1 + Math.max(0, ...Object.values(obj).map(getMaxDepth));
	}
	return 0;
}

function getJsonMetadata(obj: any): any {
	return {
		type: Array.isArray(obj) ? 'array' : typeof obj,
		size: calculateJsonSize(obj),
		structure: getStructureInfo(obj)
	};
}

function getStructureInfo(obj: any): any {
	if (Array.isArray(obj)) {
		return {
			type: 'array',
			length: obj.length,
			elementTypes: [...new Set(obj.map((item) => (Array.isArray(item) ? 'array' : typeof item)))]
		};
	} else if (obj !== null && typeof obj === 'object') {
		return {
			type: 'object',
			keys: Object.keys(obj).length,
			keyList: Object.keys(obj).slice(0, 10)
		};
	}
	return {
		type: typeof obj,
		value: obj
	};
}

function flattenObject(
	obj: any,
	separator: string = '.',
	includeArrayIndices: boolean = false,
	prefix: string = ''
): Record<string, any> {
	const flattened: Record<string, any> = {};

	function flatten(current: any, path: string) {
		if (Array.isArray(current)) {
			if (includeArrayIndices) {
				current.forEach((item, index) => {
					flatten(item, path ? `${path}${separator}${index}` : `${index}`);
				});
			} else {
				current.forEach((item, index) => {
					flatten(item, path ? `${path}${separator}[${index}]` : `[${index}]`);
				});
			}
		} else if (current !== null && typeof current === 'object') {
			Object.keys(current).forEach((key) => {
				flatten(current[key], path ? `${path}${separator}${key}` : key);
			});
		} else {
			flattened[path] = current;
		}
	}

	flatten(obj, prefix);
	return flattened;
}

function unflattenObject(obj: Record<string, any>, separator: string = '.'): any {
	const result: any = {};

	Object.keys(obj).forEach((key) => {
		const keys = key.split(separator);
		let current = result;

		keys.forEach((k, index) => {
			if (index === keys.length - 1) {
				current[k] = obj[key];
			} else {
				if (!(k in current)) {
					const nextKey = keys[index + 1];
					current[k] = /^\d+$/.test(nextKey) ? [] : {};
				}
				current = current[k];
			}
		});
	});

	return result;
}

export const jsonFormatterTool = new BaseTool(
	jsonFormatterConfig,
	jsonFormatterParameters,
	executeJsonFormatter
);
