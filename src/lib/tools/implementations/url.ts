import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const urlConfig: ToolConfig = {
	name: 'url',
	description: 'Shorten or expand URLs (mock implementation)',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['url', 'shortener', 'web'],
	enabled: true
};

const urlParameters = z.object({
	action: z.enum(['shorten', 'expand']).describe('Action to perform'),
	url: z.string().url().describe('URL to process')
});

async function executeUrl(params: Record<string, unknown>) {
	const { action, url } = urlParameters.parse(params);
	await new Promise((resolve) => setTimeout(resolve, 500));

	if (action === 'shorten') {
		// Mock shortened URL
		const shortCode = Math.random().toString(36).substring(2, 8);
		return {
			action: 'shorten',
			originalUrl: url,
			shortUrl: `https://short.ly/${shortCode}`,
			timestamp: new Date().toISOString()
		};
	} else {
		// Mock expand (just return a fake original URL)
		return {
			action: 'expand',
			shortUrl: url,
			originalUrl: 'https://example.com/very/long/url/path/to/resource',
			timestamp: new Date().toISOString()
		};
	}
}

export const urlTool = new BaseTool(urlConfig, urlParameters, executeUrl);
