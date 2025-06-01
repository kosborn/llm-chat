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
const IPV4_REGEX =
	/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

// IPv6 address regex - matches various IPv6 formats
const IPV6_REGEX =
	/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b|\b::1\b|\b::\b/g;

// Combined IP regex for both IPv4 and IPv6
const IP_REGEX = new RegExp(`(${IPV4_REGEX.source})|(${IPV6_REGEX.source})`, 'g');

// Global static cache for valid tool names - only updated when tools change
let staticValidToolsSet: Set<string> = new Set();
let staticCacheInitialized = false;

// Initialize the static tool cache once
function initializeStaticToolCache(): void {
	try {
		if (staticCacheInitialized) return;

		const tools = toolRegistry.getEnabledTools();
		if (tools && typeof tools === 'object') {
			staticValidToolsSet = new Set(Object.keys(tools));
		}
		staticCacheInitialized = true;
	} catch (error) {
		console.warn('Failed to initialize tool cache:', error);
		staticValidToolsSet = new Set();
	}
}

// Function to invalidate cache when tools change
export function invalidateToolCache(): void {
	staticValidToolsSet.clear();
	staticCacheInitialized = false;
	// Clear parse cache as tool validation affects parsing
	parseCache.clear();
	// Re-initialize immediately for next use
	initializeStaticToolCache();
}

// Create optimized tool rule that pre-compiles valid tools (only highlights enabled tools)
function createOptimizedToolRule(): FormatRule {
	// Pre-initialize tool cache for immediate validation
	if (!staticCacheInitialized) {
		initializeStaticToolCache();
	}

	return {
		pattern: TOOL_REGEX,
		className: 'text-blue-800 dark:text-blue-200',
		validate: (match: string) => {
			const toolName = match.slice(1); // Remove @ symbol
			// Direct set lookup - only highlight enabled tools
			return staticValidToolsSet.has(toolName);
		}
	};
}

// Default formatting rules
export const defaultFormatRules: FormatRule[] = [
	{
		pattern: URL_REGEX,
		className:
			'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
	},
	createOptimizedToolRule(),
	{
		pattern: IP_REGEX,
		className:
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
	}
];

// Helper to extract tool mentions from text (all valid tools, even if disabled)
export function extractToolMentions(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];

		const matches = text.match(TOOL_REGEX) || [];
		return matches
			.map((match) => match.slice(1)) // Remove @ symbol
			.filter((toolName) => {
				// Check if tool exists in registry (regardless of enabled state)
				const allTools = toolRegistry.getAllTools();
				return toolName in allTools;
			});
	} catch (error) {
		console.error('Error extracting tool mentions:', error);
		return [];
	}
}

// Helper to extract enabled tool mentions from text (for formatting only)
export function extractEnabledToolMentions(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];

		// Ensure tool cache is initialized
		if (!staticCacheInitialized) {
			initializeStaticToolCache();
		}

		const matches = text.match(TOOL_REGEX) || [];
		return matches
			.map((match) => match.slice(1)) // Remove @ symbol
			.filter((toolName) => staticValidToolsSet.has(toolName));
	} catch (error) {
		console.error('Error extracting enabled tool mentions:', error);
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

// Helper to extract IPv4 addresses specifically
export function extractIpv4(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];
		return text.match(IPV4_REGEX) || [];
	} catch (error) {
		console.error('Error extracting IPv4 addresses:', error);
		return [];
	}
}

// Helper to extract IPv6 addresses specifically
export function extractIpv6(text: string): string[] {
	try {
		if (!text || typeof text !== 'string') return [];
		return text.match(IPV6_REGEX) || [];
	} catch (error) {
		console.error('Error extracting IPv6 addresses:', error);
		return [];
	}
}

// Cache for parsed text to prevent excessive re-parsing
const parseCache = new Map<string, { segments: FormatSegment[]; timestamp: number }>();
const PARSE_CACHE_DURATION = 5000; // 5 seconds cache for parsed segments (increased)

// Debounced parsing map to prevent excessive calls
const debounceTimeouts = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 50; // 50ms debounce

// Parse text and apply formatting rules with caching and debouncing
export function parseFormattedText(
	text: string,
	rules: FormatRule[] = defaultFormatRules
): FormatSegment[] {
	try {
		if (!text || typeof text !== 'string') return [];
		if (!rules || !Array.isArray(rules)) return [{ text, isFormatted: false }];

		// Simplified cache key for better performance
		const cacheKey = `${text.length}_${text.slice(0, 50)}_${rules.length}`;
		const now = Date.now();
		const cached = parseCache.get(cacheKey);

		// Return cached result if still valid
		if (cached && now - cached.timestamp < PARSE_CACHE_DURATION) {
			return cached.segments;
		}

		const segments = parseFormattedTextInternal(text, rules);

		// Cache the result
		parseCache.set(cacheKey, { segments, timestamp: now });

		// Clean up old cache entries periodically
		if (parseCache.size > 100) {
			const cutoff = now - PARSE_CACHE_DURATION;
			for (const [key, value] of parseCache.entries()) {
				if (value.timestamp < cutoff) {
					parseCache.delete(key);
				}
			}
		}

		return segments;
	} catch (error) {
		console.error('Error parsing formatted text:', error);
		return [{ text: text || '', isFormatted: false }];
	}
}

// Internal parsing function (non-cached)
function parseFormattedTextInternal(text: string, rules: FormatRule[]): FormatSegment[] {
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
}

// Debounced version of parseFormattedText for high-frequency calls
export function parseFormattedTextDebounced(
	text: string,
	rules: FormatRule[] = defaultFormatRules,
	callback: (segments: FormatSegment[]) => void
): void {
	// Clear existing timeout for this text
	const existingTimeout = debounceTimeouts.get(text);
	if (existingTimeout) {
		clearTimeout(existingTimeout);
	}

	// Set new timeout
	const timeout = setTimeout(() => {
		const segments = parseFormattedText(text, rules);
		callback(segments);
		debounceTimeouts.delete(text);
	}, DEBOUNCE_DELAY);

	debounceTimeouts.set(text, timeout);
}

// Get CSS classes for formatted text display
export function getFormattedTextClasses(): string {
	return 'whitespace-pre-wrap break-words';
}

// Custom rule builder helpers
export function createToolRule(className?: string): FormatRule {
	// Pre-initialize tool cache for immediate validation
	if (!staticCacheInitialized) {
		initializeStaticToolCache();
	}

	return {
		pattern: TOOL_REGEX,
		className: className || 'text-blue-800 dark:text-blue-200',
		validate: (match: string) => {
			const toolName = match.slice(1);
			// Direct set lookup - only highlight enabled tools for formatting
			return staticValidToolsSet.has(toolName);
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
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
	};
}

export function createIpv4Rule(className?: string): FormatRule {
	return {
		pattern: IPV4_REGEX,
		className:
			className ||
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
	};
}

export function createIpv6Rule(className?: string): FormatRule {
	return {
		pattern: IPV6_REGEX,
		className:
			className ||
			'text-amber-600 dark:text-amber-400 cursor-pointer hover:text-amber-800 dark:hover:text-amber-300 transition-colors'
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

// Create pre-optimized default rules for high-performance scenarios
export function createOptimizedDefaultRules(): FormatRule[] {
	// Ensure tool cache is ready
	if (!staticCacheInitialized) {
		initializeStaticToolCache();
	}

	return [
		{
			pattern: URL_REGEX,
			className:
				'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
		},
		{
			pattern: TOOL_REGEX,
			className: 'text-blue-800 dark:text-blue-200',
			validate: (match: string) => {
				const toolName = match.slice(1);
				// Only highlight enabled tools in formatting
				return staticValidToolsSet.has(toolName);
			}
		},
		{
			pattern: IP_REGEX,
			className:
				'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
		}
	];
}
