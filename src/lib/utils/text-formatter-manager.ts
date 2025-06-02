import { toolRegistry } from '$lib/tools/registry.js';
import { debugConsole } from './console.js';

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

// Global singleton manager to handle all text formatting efficiently
class TextFormatterManager {
	private static instance: TextFormatterManager | null = null;

	// Pre-compiled regexes
	private readonly URL_REGEX = /(https?:\/\/[^\s]+)/g;
	private readonly TOOL_REGEX = /@(\w+)/g;
	private readonly IPV4_REGEX =
		/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
	private readonly IPV6_REGEX =
		/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b|\b::1\b|\b::\b/g;
	private readonly IP_REGEX = new RegExp(
		`(${this.IPV4_REGEX.source})|(${this.IPV6_REGEX.source})`,
		'g'
	);

	// Static tool validation cache
	private validToolsSet = new Set<string>();
	private allToolsSet = new Set<string>();
	private toolsCacheInitialized = false;
	private lastToolsUpdate = 0;

	// Parse result cache with improved limits
	private parseCache = new Map<string, { segments: FormatSegment[]; timestamp: number }>();
	private readonly PARSE_CACHE_DURATION = 15000; // 15 seconds for better reuse
	private readonly MAX_CACHE_SIZE = 100; // Reduced for memory efficiency

	// Default rules (compiled once)
	private defaultRules: FormatRule[] = [];

	private constructor() {
		this.initializeDefaultRules();
		this.initializeToolsCache();
	}

	public static getInstance(): TextFormatterManager {
		if (!TextFormatterManager.instance) {
			TextFormatterManager.instance = new TextFormatterManager();
		}
		return TextFormatterManager.instance;
	}

	private initializeDefaultRules(): void {
		this.defaultRules = [
			{
				pattern: this.URL_REGEX,
				className:
					'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
			},
			{
				pattern: this.TOOL_REGEX,
				className: 'text-blue-800 dark:text-blue-200 font-medium',
				validate: (match: string) => {
					const toolName = match.slice(1);
					return this.isValidTool(toolName);
				}
			},
			{
				pattern: this.TOOL_REGEX,
				className: 'text-amber-600 dark:text-amber-400 opacity-75 italic',
				validate: (match: string) => {
					const toolName = match.slice(1);
					return this.isDisabledTool(toolName);
				}
			},
			{
				pattern: this.IP_REGEX,
				className:
					'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
			}
		];
	}

	private initializeToolsCache(): void {
		try {
			const enabledTools = toolRegistry.getEnabledTools();
			const allTools = toolRegistry.getAllTools();

			if (enabledTools && typeof enabledTools === 'object') {
				this.validToolsSet = new Set(Object.keys(enabledTools));
			}

			if (allTools && typeof allTools === 'object') {
				this.allToolsSet = new Set(Object.keys(allTools));
			}

			this.toolsCacheInitialized = true;
			this.lastToolsUpdate = Date.now();
		} catch (error) {
			debugConsole.warn('Failed to initialize tools cache:', error);
			this.validToolsSet = new Set();
			this.allToolsSet = new Set();
		}
	}

	private isValidTool(toolName: string): boolean {
		if (!toolName || typeof toolName !== 'string') {
			return false;
		}

		if (!this.toolsCacheInitialized) {
			this.initializeToolsCache();
		}

		return this.validToolsSet.has(toolName);
	}

	private isDisabledTool(toolName: string): boolean {
		if (!toolName || typeof toolName !== 'string') {
			return false;
		}

		if (!this.toolsCacheInitialized) {
			this.initializeToolsCache();
		}

		return this.allToolsSet.has(toolName) && !this.validToolsSet.has(toolName);
	}

	public invalidateToolsCache(): void {
		this.validToolsSet.clear();
		this.allToolsSet.clear();
		this.toolsCacheInitialized = false;
		this.parseCache.clear();
		this.initializeToolsCache();
	}

	private createCacheKey(text: string, rules?: FormatRule[]): string {
		// Optimized cache key generation for better performance
		const rulesHash = rules ? rules.length.toString() : 'default';
		const textSample =
			text.length > 200 ? text.slice(0, 100) + text.slice(-100) : text.slice(0, 100);
		return `${text.length}_${rulesHash}_${textSample}`;
	}

	private cleanupCache(): void {
		if (this.parseCache.size <= this.MAX_CACHE_SIZE) return;

		const now = Date.now();
		const cutoff = now - this.PARSE_CACHE_DURATION;

		for (const [key, value] of this.parseCache.entries()) {
			if (value.timestamp < cutoff) {
				this.parseCache.delete(key);
			}
		}

		// If still too large, remove oldest entries
		if (this.parseCache.size > this.MAX_CACHE_SIZE) {
			const entries = Array.from(this.parseCache.entries()).sort(
				(a, b) => a[1].timestamp - b[1].timestamp
			);

			const toRemove = entries.slice(0, this.parseCache.size - this.MAX_CACHE_SIZE);
			for (const [key] of toRemove) {
				this.parseCache.delete(key);
			}
		}
	}

	public parseText(text: string, rules?: FormatRule[]): FormatSegment[] {
		if (!text || typeof text !== 'string') {
			return [];
		}

		// Use default rules if none provided
		const actualRules = rules || this.defaultRules;

		// Check cache first
		const cacheKey = this.createCacheKey(text, actualRules);
		const now = Date.now();
		const cached = this.parseCache.get(cacheKey);

		if (cached && now - cached.timestamp < this.PARSE_CACHE_DURATION) {
			return cached.segments;
		}

		// Parse text
		const segments = this.parseTextInternal(text, actualRules);

		// Cache result
		this.parseCache.set(cacheKey, { segments, timestamp: now });

		// Cleanup cache if needed
		if (this.parseCache.size > this.MAX_CACHE_SIZE) {
			this.cleanupCache();
		}

		return segments;
	}

	private parseTextInternal(text: string, rules: FormatRule[]): FormatSegment[] {
		const segments: FormatSegment[] = [];
		let lastIndex = 0;

		// For very large texts, limit processing to prevent UI freezing
		const MAX_TEXT_LENGTH = 10000;
		const shouldLimitProcessing = text.length > MAX_TEXT_LENGTH;
		const processedText = shouldLimitProcessing ? text.slice(0, MAX_TEXT_LENGTH) : text;

		// Collect all matches from all rules
		const allMatches: Array<{
			match: RegExpMatchArray;
			rule: FormatRule;
			start: number;
			end: number;
		}> = [];

		// Limit match processing for performance
		const MAX_MATCHES_PER_RULE = 500;

		for (const rule of rules) {
			try {
				if (!rule || !rule.pattern) continue;

				const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
				let match: RegExpExecArray | null;
				let matchCount = 0;

				while (matchCount < MAX_MATCHES_PER_RULE) {
					match = regex.exec(processedText);
					if (match === null) break;

					const start = match.index ?? 0;
					const end = start + match[0].length;

					// Validate if rule has validation function
					if (rule.validate) {
						try {
							if (!rule.validate(match[0])) {
								matchCount++;
								continue;
							}
						} catch (validateError) {
							debugConsole.warn('Error in rule validation:', validateError);
							matchCount++;
							continue;
						}
					}

					allMatches.push({
						match,
						rule,
						start,
						end
					});

					matchCount++;

					// Prevent infinite loop
					if (regex.lastIndex === start) {
						regex.lastIndex = start + 1;
					}
				}
			} catch (ruleError) {
				debugConsole.warn('Error processing rule:', ruleError);
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
				const unformattedText = processedText.slice(lastIndex, start);
				if (unformattedText) {
					segments.push({
						text: unformattedText,
						isFormatted: false
					});
				}
			}

			// Add formatted segment
			segments.push({
				text: match[0],
				className: rule.className,
				isFormatted: true
			});

			lastIndex = end;
		}

		// Add remaining text
		const remainingProcessedText = processedText.slice(lastIndex);
		if (remainingProcessedText) {
			segments.push({
				text: remainingProcessedText,
				isFormatted: false
			});
		}

		// Add any text that was truncated due to length limit
		if (shouldLimitProcessing && text.length > MAX_TEXT_LENGTH) {
			segments.push({
				text: text.slice(MAX_TEXT_LENGTH),
				isFormatted: false
			});
		}

		// If no segments created, return the entire text as unformatted
		if (segments.length === 0) {
			segments.push({
				text,
				isFormatted: false
			});
		}

		return segments;
	}

	public extractToolMentions(text: string): string[] {
		if (!text || typeof text !== 'string') return [];

		try {
			const matches = text.match(this.TOOL_REGEX) || [];
			return matches
				.map((match) => match.slice(1)) // Remove @ symbol
				.filter((toolName) => this.allToolsSet.has(toolName)); // All valid tools, even disabled ones
		} catch (error) {
			debugConsole.error('Error extracting tool mentions:', error);
			return [];
		}
	}

	public extractEnabledToolMentions(text: string): string[] {
		if (!text || typeof text !== 'string') return [];

		try {
			const matches = text.match(this.TOOL_REGEX) || [];
			return matches
				.map((match) => match.slice(1)) // Remove @ symbol
				.filter((toolName) => this.isValidTool(toolName)); // Only enabled tools
		} catch (error) {
			debugConsole.error('Error extracting enabled tool mentions:', error);
			return [];
		}
	}

	public extractUrls(text: string): string[] {
		if (!text || typeof text !== 'string') return [];

		try {
			return text.match(this.URL_REGEX) || [];
		} catch (error) {
			debugConsole.error('Error extracting URLs:', error);
			return [];
		}
	}

	public extractIps(text: string): string[] {
		if (!text || typeof text !== 'string') return [];

		try {
			return text.match(this.IP_REGEX) || [];
		} catch (error) {
			debugConsole.error('Error extracting IP addresses:', error);
			return [];
		}
	}

	public getCacheStats() {
		return {
			cacheSize: this.parseCache.size,
			maxCacheSize: this.MAX_CACHE_SIZE,
			toolsCacheInitialized: this.toolsCacheInitialized,
			validToolsCount: this.validToolsSet.size,
			allToolsCount: this.allToolsSet.size,
			lastToolsUpdate: new Date(this.lastToolsUpdate).toISOString()
		};
	}

	public getDefaultRules(): FormatRule[] {
		return this.defaultRules;
	}
}

// Export singleton instance and convenience functions
export const textFormatterManager = TextFormatterManager.getInstance();

// Convenience functions that use the manager
export function parseFormattedText(text: string, rules?: FormatRule[]): FormatSegment[] {
	return textFormatterManager.parseText(text, rules);
}

export function extractToolMentions(text: string): string[] {
	return textFormatterManager.extractToolMentions(text);
}

export function extractEnabledToolMentions(text: string): string[] {
	return textFormatterManager.extractEnabledToolMentions(text);
}

export function extractUrls(text: string): string[] {
	return textFormatterManager.extractUrls(text);
}

export function extractIps(text: string): string[] {
	return textFormatterManager.extractIps(text);
}

export function invalidateToolCache(): void {
	textFormatterManager.invalidateToolsCache();
}

export function getFormatterCacheStats() {
	return textFormatterManager.getCacheStats();
}

export function getFormattedTextClasses(): string {
	return 'whitespace-pre-wrap break-words';
}

// Rule creation helpers
export function createToolRule(className?: string): FormatRule {
	return {
		pattern: /@(\w+)/g,
		className: className || 'text-blue-800 dark:text-blue-200',
		validate: (match: string) => {
			const toolName = match.slice(1);
			return textFormatterManager.extractToolMentions(`@${toolName}`).length > 0;
		}
	};
}

export function createUrlRule(className?: string): FormatRule {
	return {
		pattern: /(https?:\/\/[^\s]+)/g,
		className:
			className ||
			'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
	};
}

export function createIpRule(className?: string): FormatRule {
	return {
		pattern:
			/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b|\b::1\b|\b::\b/g,
		className:
			className ||
			'text-orange-600 dark:text-orange-400 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 transition-colors'
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

export function createOptimizedDefaultRules(): FormatRule[] {
	// Return the pre-compiled default rules from the singleton
	return textFormatterManager.getDefaultRules();
}
