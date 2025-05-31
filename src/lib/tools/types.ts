import { tool } from 'ai';
import { z } from 'zod';

// Base tool configuration interface
export interface ToolConfig {
	name: string;
	description: string;
	category?: string;
	enabled?: boolean;
	version?: string;
	author?: string;
	tags?: string[];
}

// Tool metadata for registry
export interface ToolMetadata extends ToolConfig {
	tool: ReturnType<typeof tool>;
}

// Tool execution context
export interface ToolContext {
	userId?: string;
	sessionId?: string;
	timestamp: string;
	requestId?: string;
}

// Tool execution result wrapper
export interface ToolResult<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	metadata?: {
		executionTime?: number;
		timestamp: string;
		toolName: string;
	};
}

// Base tool class that all tools can extend
export class BaseTool {
	public readonly config: ToolConfig;
	public readonly tool: ReturnType<typeof tool>;

	constructor(
		config: ToolConfig,
		parameters: z.ZodSchema,
		execute: (params: Record<string, unknown>) => Promise<unknown> | unknown
	) {
		this.config = {
			enabled: true,
			version: '1.0.0',
			category: 'general',
			...config
		};

		this.tool = tool({
			description: this.config.description,
			parameters,
			execute: this.wrapExecute(execute)
		}) as ReturnType<typeof tool>;
	}

	private wrapExecute(execute: (params: Record<string, unknown>) => Promise<unknown> | unknown) {
		return async (params: Record<string, unknown>) => {
			const startTime = Date.now();
			const timestamp = new Date().toISOString();

			try {
				const result = await execute(params);
				const executionTime = Date.now() - startTime;

				return {
					success: true,
					data: result,
					metadata: {
						executionTime,
						timestamp,
						toolName: this.config.name
					}
				} as ToolResult;
			} catch (error) {
				const executionTime = Date.now() - startTime;

				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					metadata: {
						executionTime,
						timestamp,
						toolName: this.config.name
					}
				} as ToolResult;
			}
		};
	}

	// Method to check if tool should be available
	public isEnabled(): boolean {
		return this.config.enabled ?? true;
	}

	// Method to get tool metadata
	public getMetadata(): ToolMetadata {
		return {
			...this.config,
			tool: this.tool
		};
	}
}

// Tool registry interface
export interface ToolRegistry {
	[key: string]: ToolMetadata;
}

// Tool discovery interface
export interface ToolDiscovery {
	scanTools(): Promise<ToolMetadata[]>;
	registerTool(tool: ToolMetadata): void;
	unregisterTool(name: string): void;
	getEnabledTools(): ToolRegistry;
	getAllTools(): ToolRegistry;
}
