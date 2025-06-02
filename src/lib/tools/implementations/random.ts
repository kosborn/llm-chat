import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const randomConfig: ToolConfig = {
	name: 'random',
	description: 'Generate random numbers or pick random items',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['random', 'generator', 'choice'],
	enabled: true,
	requiresNetwork: false
};

const randomParameters = z.object({
	type: z.enum(['number', 'choice']).describe('Type of random generation'),
	min: z.number().optional().describe('Minimum number (for number type)'),
	max: z.number().optional().describe('Maximum number (for number type)'),
	choices: z
		.array(z.string())
		.optional()
		.describe('Array of choices to pick from (for choice type)')
});

async function executeRandom(params: Record<string, unknown>) {
	const { type, min = 1, max = 100, choices } = randomParameters.parse(params);
	if (type === 'number') {
		const result = Math.floor(Math.random() * (max - min + 1)) + min;
		return {
			type: 'number',
			result,
			range: { min, max },
			timestamp: new Date().toISOString()
		};
	} else if (type === 'choice') {
		if (!choices || choices.length === 0) {
			return {
				type: 'choice',
				error: 'No choices provided',
				timestamp: new Date().toISOString()
			};
		}
		const result = choices[Math.floor(Math.random() * choices.length)];
		return {
			type: 'choice',
			result,
			choices,
			timestamp: new Date().toISOString()
		};
	}
}

export const randomTool = new BaseTool(randomConfig, randomParameters, executeRandom);
