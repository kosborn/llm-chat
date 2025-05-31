import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const textProcessorConfig: ToolConfig = {
	name: 'text-processor',
	description: 'Process text with various operations like formatting, counting, and transforming',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['text', 'formatting', 'transformation', 'analysis'],
	enabled: true
};

const textProcessorParameters = z.object({
	text: z.string().describe('The text to process'),
	operation: z
		.enum([
			'uppercase',
			'lowercase',
			'titlecase',
			'reverse',
			'count_words',
			'count_chars',
			'remove_spaces',
			'add_line_numbers',
			'extract_emails',
			'extract_urls'
		])
		.describe('The operation to perform on the text'),
	options: z
		.object({
			preserveCase: z.boolean().default(false).describe('Preserve original case when applicable'),
			includeSpaces: z.boolean().default(true).describe('Include spaces in character count'),
			startNumber: z.number().default(1).describe('Starting number for line numbering')
		})
		.optional()
});

async function executeTextProcessor(params: Record<string, unknown>) {
	const parsed = textProcessorParameters.parse(params);
	const { text, operation } = parsed;
	const options = parsed.options || {
		preserveCase: false,
		includeSpaces: true,
		startNumber: 1
	};
	const { preserveCase = false, includeSpaces = true, startNumber = 1 } = options;

	try {
		let result: any;
		let metadata: any = {};

		switch (operation) {
			case 'uppercase':
				result = text.toUpperCase();
				break;

			case 'lowercase':
				result = text.toLowerCase();
				break;

			case 'titlecase':
				result = text.replace(
					/\w\S*/g,
					(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
				);
				break;

			case 'reverse':
				result = text.split('').reverse().join('');
				break;

			case 'count_words':
				const words = text
					.trim()
					.split(/\s+/)
					.filter((word) => word.length > 0);
				result = words.length;
				metadata = {
					words: words,
					averageWordLength:
						words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0
				};
				break;

			case 'count_chars':
				result = includeSpaces ? text.length : text.replace(/\s/g, '').length;
				metadata = {
					withSpaces: text.length,
					withoutSpaces: text.replace(/\s/g, '').length,
					spaces: text.length - text.replace(/\s/g, '').length
				};
				break;

			case 'remove_spaces':
				result = text.replace(/\s+/g, preserveCase ? ' ' : '');
				break;

			case 'add_line_numbers':
				const lines = text.split('\n');
				result = lines.map((line, index) => `${startNumber + index}. ${line}`).join('\n');
				metadata = {
					totalLines: lines.length,
					startNumber,
					endNumber: startNumber + lines.length - 1
				};
				break;

			case 'extract_emails':
				const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
				const emails = text.match(emailRegex) || [];
				result = emails;
				metadata = {
					count: emails.length,
					unique: [...new Set(emails)].length
				};
				break;

			case 'extract_urls':
				const urlRegex =
					/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
				const urls = text.match(urlRegex) || [];
				result = urls;
				metadata = {
					count: urls.length,
					unique: [...new Set(urls)].length,
					domains: [...new Set(urls.map((url) => new URL(url).hostname))]
				};
				break;

			default:
				throw new Error(`Unknown operation: ${operation}`);
		}

		return {
			operation,
			originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
			result,
			metadata,
			options: options,
			timestamp: new Date().toISOString(),
			statistics: {
				originalLength: text.length,
				resultLength: typeof result === 'string' ? result.length : null,
				processingTime: Date.now()
			}
		};
	} catch (error) {
		throw new Error(
			`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

export const textProcessorTool = new BaseTool(
	textProcessorConfig,
	textProcessorParameters,
	executeTextProcessor
);
