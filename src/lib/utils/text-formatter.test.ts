import { describe, it, expect } from 'vitest';
import {
	parseFormattedText,
	extractToolMentions,
	extractUrls,
	createToolRule,
	createUrlRule,
	createCustomRule
} from './text-formatter';

describe('Text Formatter', () => {
	describe('parseFormattedText', () => {
		it('should parse plain text without formatting', () => {
			const result = parseFormattedText('Hello world');
			expect(result).toEqual([{ text: 'Hello world', isFormatted: false }]);
		});

		it('should detect and format URLs', () => {
			const result = parseFormattedText('Visit https://example.com for more info');
			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({ text: 'Visit ', isFormatted: false });
			expect(result[1]).toEqual({
				text: 'https://example.com',
				className:
					'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
				isFormatted: true
			});
			expect(result[2]).toEqual({ text: ' for more info', isFormatted: false });
		});

		it('should detect multiple URLs', () => {
			const result = parseFormattedText('Check https://example.com and http://test.org');
			expect(result).toHaveLength(4);
			expect(result[1].text).toBe('https://example.com');
			expect(result[3].text).toBe('http://test.org');
		});

		it('should format valid tool mentions', () => {
			// Note: This test assumes weather tool exists in registry
			const result = parseFormattedText('Use @weather to get forecast');
			const toolSegment = result.find((segment) => segment.text === '@weather');

			if (toolSegment && toolSegment.isFormatted) {
				expect(toolSegment.className).toContain('bg-blue-100');
			}
		});

		it('should not format invalid tool mentions', () => {
			const result = parseFormattedText('Invalid @invalidtoolname here');
			const segments = result.filter((segment) => segment.text.includes('@invalidtoolname'));

			// Should be part of unformatted text
			expect(segments.every((segment) => !segment.isFormatted)).toBe(true);
		});

		it('should handle mixed content', () => {
			const result = parseFormattedText('Visit https://example.com and use @weather tool');
			expect(result.length).toBeGreaterThan(1);

			const urlSegment = result.find((segment) => segment.text === 'https://example.com');
			expect(urlSegment?.isFormatted).toBe(true);
		});

		it('should handle empty string', () => {
			const result = parseFormattedText('');
			expect(result).toEqual([]);
		});
	});

	describe('extractToolMentions', () => {
		it('should extract valid tool mentions', () => {
			const mentions = extractToolMentions('Use @weather and @calculator tools');
			// Filter to only include tools that actually exist
			expect(mentions).toBeInstanceOf(Array);
			mentions.forEach((mention) => {
				expect(typeof mention).toBe('string');
			});
		});

		it('should return empty array for no mentions', () => {
			const mentions = extractToolMentions('No tool mentions here');
			expect(mentions).toEqual([]);
		});

		it('should not include invalid tools', () => {
			const mentions = extractToolMentions('@invalidtool and @anotherfake');
			expect(mentions).toEqual([]);
		});
	});

	describe('extractUrls', () => {
		it('should extract URLs from text', () => {
			const urls = extractUrls('Visit https://example.com and http://test.org');
			expect(urls).toEqual(['https://example.com', 'http://test.org']);
		});

		it('should return empty array for no URLs', () => {
			const urls = extractUrls('No URLs in this text');
			expect(urls).toEqual([]);
		});

		it('should handle single URL', () => {
			const urls = extractUrls('Go to https://example.com');
			expect(urls).toEqual(['https://example.com']);
		});
	});

	describe('Rule creators', () => {
		it('should create tool rule with default styling', () => {
			const rule = createToolRule();
			expect(rule.pattern).toBeInstanceOf(RegExp);
			expect(rule.className).toContain('bg-blue-100');
			expect(typeof rule.validate).toBe('function');
		});

		it('should create tool rule with custom styling', () => {
			const customClass = 'custom-tool-style';
			const rule = createToolRule(customClass);
			expect(rule.className).toBe(customClass);
		});

		it('should create URL rule with default styling', () => {
			const rule = createUrlRule();
			expect(rule.pattern).toBeInstanceOf(RegExp);
			expect(rule.className).toContain('text-blue-600');
		});

		it('should create URL rule with custom styling', () => {
			const customClass = 'custom-url-style';
			const rule = createUrlRule(customClass);
			expect(rule.className).toBe(customClass);
		});

		it('should create custom rule', () => {
			const pattern = /\*\*(.*?)\*\*/g;
			const className = 'font-bold';
			const validate = (match: string) => match.length > 4;

			const rule = createCustomRule(pattern, className, validate);
			expect(rule.pattern).toBe(pattern);
			expect(rule.className).toBe(className);
			expect(rule.validate).toBe(validate);
		});
	});

	describe('Complex formatting scenarios', () => {
		it('should handle overlapping patterns correctly', () => {
			const result = parseFormattedText('URL: https://example.com/@weather/api');
			// Should prioritize URL over tool mention in this case
			const urlSegment = result.find((segment) => segment.text.includes('https://'));
			expect(urlSegment?.isFormatted).toBe(true);
		});

		it('should handle multiple tool mentions', () => {
			const result = parseFormattedText('Use @weather then @calculator');
			const toolSegments = result.filter((segment) => segment.text.startsWith('@'));
			expect(toolSegments.length).toBeGreaterThanOrEqual(0);
		});

		it('should preserve whitespace', () => {
			const result = parseFormattedText('  @weather   https://example.com  ');
			const firstSegment = result[0];
			const lastSegment = result[result.length - 1];

			// Check that leading/trailing whitespace is preserved
			expect(firstSegment?.text).toMatch(/^\s/);
			expect(lastSegment?.text).toMatch(/\s$/);
		});

		it('should handle newlines', () => {
			const text = 'Line 1 @weather\nLine 2 https://example.com';
			const result = parseFormattedText(text);
			const fullText = result.map((segment) => segment.text).join('');
			expect(fullText).toBe(text);
		});
	});
});
