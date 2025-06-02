import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const timeConfig: ToolConfig = {
	name: 'time',
	description: 'Get current time for a timezone or UTC',
	category: 'utility',
	version: '1.0.0',
	author: 'System',
	tags: ['time', 'timezone', 'datetime'],
	enabled: true,
	requiresNetwork: false
};

const timeParameters = z.object({
	timezone: z
		.string()
		.optional()
		.describe('Timezone (e.g., "America/New_York", "Europe/London") or leave empty for UTC')
});

async function executeTime({ timezone }: z.infer<typeof timeParameters>) {
	try {
		const now = new Date();
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		};

		if (timezone) {
			options.timeZone = timezone;
		}

		const formatter = new Intl.DateTimeFormat('en-US', options);
		const formattedTime = formatter.format(now);

		return {
			timestamp: now.toISOString(),
			timezone: timezone || 'UTC',
			formattedTime,
			unixTimestamp: Math.floor(now.getTime() / 1000)
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : 'Failed to get time',
			timestamp: new Date().toISOString()
		};
	}
}

export const timeTool = new BaseTool(timeConfig, timeParameters, executeTime);
