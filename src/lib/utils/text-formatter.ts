import { toolRegistry } from '$lib/tools/registry.js';

export interface FormatRule {
	pattern: RegExp;
	className: string;
	validate?: (match: string) => boolean;
}

export interface FormatSegment {
	text: string;
	className?: string;
	isFormatted: boolean;
}

// URL validation regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Tool mention regex - matches @toolname
const TOOL_REGEX = /@(\w+)/g;

// IP address regex - matches IPv4 addresses
const IP_REGEX =
	/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

// Get all available tool names for validation
function getValidToolNames(): Set<string> {
	try {
		const tools = toolRegistry.getEnabledTools();
		if (!tools || typeof tools !== 'object') {
			return new Set();
		}
		return new Set(Object.keys(tools));
	} catch (error) {
		console.warn('Tool registry not ready, returning empty tool set:', error);
		return new Set();
	}
}

// Validate if a tool name is real
function isValidTool(toolName: string): boolean {
	try {
		if (!toolName || typeof toolName !== 'string') {
			return false;
		}
		const validTools = getValidToolNames();
		return validTools.has(toolName);
	} catch (error) {
		console.warn('Error validating tool name:', error);
		return false;
	}
}

// Default formatting rules
export const defaultFormatRules: FormatRule[] = [
	{
		pattern: URL_REGEX,
		className:
			'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
	},
	{
		pattern: TOOL_REGEX,
		className: 'text-blue-800 dark:text-blue-200',
		validate: (match: string) => {
			const toolName = match.slice(1); // Remove @ symbol
			return isValidTool(toolName);
		}
	},
	{
		pattern: IP_REGEX,
		className:
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1 py-0.5 rounded transition-colors'
	}
];

// Helper to extract tool mentions from text
export function extractToolMentions(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];

		const matches = text.match(TOOL_REGEX) || [];
		return matches
			.map((match) => match.slice(1)) // Remove @ symbol
			.filter((toolName) => isValidTool(toolName));
	} catch (error) {
		console.error('Error extracting tool mentions:', error);
		return [];
	}
}

// Helper to extract URLs from text
export function extractUrls(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];
		return text.match(URL_REGEX) || [];
	} catch (error) {
		console.error('Error extracting URLs:', error);
		return [];
	}
}

// Helper to extract IP addresses from text
export function extractIps(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];
		return text.match(IP_REGEX) || [];
	} catch (error) {
		console.error('Error extracting IP addresses:', error);
		return [];
	}
}

// Parse text and apply formatting rules
export function parseFormattedText(
	text: string,
	rules: FormatRule[] = defaultFormatRules
): FormatSegment[] {
	try {
		if (!text || typeof text !== 'string') return [];
		if (!rules || !Array.isArray(rules)) return [{ text, isFormatted: false }];

		const segments: FormatSegment[] = [];
		let lastIndex = 0;

		// Collect all matches from all rules
		const allMatches: Array<{
			match: RegExpMatchArray;
			rule: FormatRule;
			start: number;
			end: number;
		}> = [];

		for (const rule of rules) {
			try {
				if (!rule || !rule.pattern) continue;

				const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
				let match: RegExpExecArray | null;

				match = regex.exec(text);
				while (match !== null) {
					const start = match.index ?? 0;
					const end = start + match[0].length;

					// Validate if rule has validation function
					if (rule.validate) {
						try {
							if (!rule.validate(match[0])) {
								continue;
							}
						} catch (validateError) {
							console.warn('Error in rule validation:', validateError);
							continue;
						}
					}

					allMatches.push({
						match,
						rule,
						start,
						end
					});

					// Prevent infinite loop
					if (regex.lastIndex === start) {
						regex.lastIndex = start + 1;
					}
					
					match = regex.exec(text);
				}
			} catch (ruleError) {
				console.warn('Error processing rule:', ruleError);
			}
		}

		// Sort matches by position
		allMatches.sort((a, b) => a.start - b.start);

		// Process matches and create segments
		for (const { match, rule, start, end } of allMatches) {
			// Skip overlapping matches
			if (start < lastIndex) {
				continue;
			}

			// Add unformatted text before this match
			if (start > lastIndex) {
				segments.push({
					text: text.slice(lastIndex, start),
					isFormatted: false
				});
			}

			// Add formatted segment
			segments.push({
				text: match[0],
				className: rule.className,
				isFormatted: true
			});

			lastIndex = end;
		}

		// Add remaining unformatted text
		if (lastIndex < text.length) {
			segments.push({
				text: text.slice(lastIndex),
				isFormatted: false
			});
		}

		// If no matches found, return the entire text as unformatted
		if (segments.length === 0) {
			segments.push({
				text,
				isFormatted: false
			});
		}

		return segments;
	} catch (error) {
		console.error('Error parsing formatted text:', error);
		return [{ text: text || '', isFormatted: false }];
	}
}

// Get CSS classes for formatted text display
export function getFormattedTextClasses(): string {
	return 'whitespace-pre-wrap break-words';
}

// Custom rule builder helpers
export function createToolRule(className?: string): FormatRule {
	return {
		pattern: TOOL_REGEX,
		className: className || 'text-blue-800 dark:text-blue-200',
		validate: (match: string) => {
			const toolName = match.slice(1);
			return isValidTool(toolName);
		}
	};
}

export function createUrlRule(className?: string): FormatRule {
	return {
		pattern: URL_REGEX,
		className:
			className ||
			'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
	};
}

export function createIpRule(className?: string): FormatRule {
	return {
		pattern: IP_REGEX,
		className:
			className ||
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1 py-0.5 rounded transition-colors'
	};
}

export function createCustomRule(
	pattern: RegExp,
	className: string,
	validate?: (match: string) => boolean
): FormatRule {
	return {
		pattern,
		className,
		validate
	};
}
