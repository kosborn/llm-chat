import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const calculatorConfig: ToolConfig = {
	name: 'calculator',
	description: 'Perform basic mathematical calculations',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['math', 'calculation', 'arithmetic'],
	enabled: true,
	requiresNetwork: false
};

const calculatorParameters = z.object({
	expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4")')
});

async function executeCalculator(params: Record<string, unknown>) {
	const { expression } = calculatorParameters.parse(params);
	try {
		// Basic safety check - only allow numbers, operators, parentheses, and spaces
		if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
			throw new Error('Invalid characters in expression');
		}

		const result = Function(`"use strict"; return (${expression})`)();

		if (typeof result !== 'number' || !Number.isFinite(result)) {
			throw new Error('Invalid calculation result');
		}

		return {
			expression,
			result,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		return {
			expression,
			error: error instanceof Error ? error.message : 'Calculation failed',
			timestamp: new Date().toISOString()
		};
	}
}

export const calculatorTool = new BaseTool(
	calculatorConfig,
	calculatorParameters,
	executeCalculator
);
