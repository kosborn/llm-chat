import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const weatherConfig: ToolConfig = {
	name: 'weather',
	description: 'Get the current weather for a location',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['weather', 'location', 'temperature'],
	enabled: true,
	requiresNetwork: true
};

const weatherParameters = z.object({
	location: z.string().describe('The city and state/country to get weather for'),
	unit: z.enum(['celsius', 'fahrenheit']).default('celsius').describe('Temperature unit')
});

async function executeWeather(params: Record<string, unknown>) {
	const { location, unit } = weatherParameters.parse(params);
	// Simulate API call delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	const temperature = Math.round(Math.random() * 30 + 5);
	const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'][Math.floor(Math.random() * 5)];

	return {
		location,
		temperature: unit === 'fahrenheit' ? Math.round((temperature * 9) / 5 + 32) : temperature,
		unit,
		conditions,
		humidity: Math.round(Math.random() * 100),
		timestamp: new Date().toISOString()
	};
}

export const weatherTool = new BaseTool(weatherConfig, weatherParameters, executeWeather);
