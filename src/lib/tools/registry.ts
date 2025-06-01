import type { ToolRegistry, ToolMetadata, ToolDiscovery } from './types.js';

// Import all tool implementations
import { weatherTool } from './implementations/weather.js';
import { calculatorTool } from './implementations/calculator.js';
import { timeTool } from './implementations/time.js';
import { randomTool } from './implementations/random.js';
import { urlTool } from './implementations/url.js';
import { textProcessorTool } from './implementations/text-processor.js';
import { jsonFormatterTool } from './implementations/json-formatter.js';
import { maxmindTool } from './implementations/maxmind.js';

class ToolRegistryManager implements ToolDiscovery {
	private tools: Map<string, ToolMetadata> = new Map();
	private initialized = false;

	constructor() {
		this.init();
	}

	private init() {
		if (this.initialized) return;

		// Auto-register all available tools
		const availableTools = [
			weatherTool,
			calculatorTool,
			timeTool,
			randomTool,
			urlTool,
			textProcessorTool,
			jsonFormatterTool,
			maxmindTool
		];

		for (const toolInstance of availableTools) {
			this.registerTool(toolInstance.getMetadata());
		}

		this.initialized = true;
	}

	async scanTools(): Promise<ToolMetadata[]> {
		// In a more advanced implementation, this could dynamically scan
		// the implementations directory for new tools
		return Array.from(this.tools.values());
	}

	registerTool(toolMetadata: ToolMetadata): void {
		if (this.tools.has(toolMetadata.name)) {
			console.warn(`Tool '${toolMetadata.name}' is already registered. Overwriting...`);
		}

		this.tools.set(toolMetadata.name, toolMetadata);
		console.log(`Registered tool: ${toolMetadata.name} v${toolMetadata.version}`);
		// Notify text formatter to invalidate cache
		this.notifyToolCacheInvalidation();
	}

	unregisterTool(name: string): void {
		if (this.tools.has(name)) {
			this.tools.delete(name);
			console.log(`Unregistered tool: ${name}`);
			// Notify text formatter to invalidate cache
			this.notifyToolCacheInvalidation();
		} else {
			console.warn(`Tool '${name}' not found in registry`);
		}
	}

	getEnabledTools(): ToolRegistry {
		const enabledTools: ToolRegistry = {};

		for (const [name, metadata] of this.tools.entries()) {
			if (metadata.enabled !== false) {
				enabledTools[name] = metadata;
			}
		}

		return enabledTools;
	}

	getAllTools(): ToolRegistry {
		const allTools: ToolRegistry = {};

		for (const [name, metadata] of this.tools.entries()) {
			allTools[name] = metadata;
		}

		return allTools;
	}

	getToolByName(name: string): ToolMetadata | undefined {
		return this.tools.get(name);
	}

	getToolsByCategory(category: string): ToolMetadata[] {
		return Array.from(this.tools.values()).filter((tool) => tool.category === category);
	}

	getToolsByTag(tag: string): ToolMetadata[] {
		return Array.from(this.tools.values()).filter((tool) => tool.tags?.includes(tag));
	}

	enableTool(name: string): boolean {
		const tool = this.tools.get(name);
		if (tool) {
			tool.enabled = true;
			// Notify text formatter to invalidate cache
			this.notifyToolCacheInvalidation();
			return true;
		}
		return false;
	}

	disableTool(name: string): boolean {
		const tool = this.tools.get(name);
		if (tool) {
			tool.enabled = false;
			// Notify text formatter to invalidate cache
			this.notifyToolCacheInvalidation();
			return true;
		}
		return false;
	}

	getAvailableCategories(): string[] {
		const categories = new Set<string>();
		for (const tool of this.tools.values()) {
			if (tool.category) {
				categories.add(tool.category);
			}
		}
		return Array.from(categories);
	}

	getAvailableTags(): string[] {
		const tags = new Set<string>();
		for (const tool of this.tools.values()) {
			if (tool.tags) {
				for (const tag of tool.tags) {
					tags.add(tag);
				}
			}
		}
		return Array.from(tags);
	}

	getToolStats() {
		const stats = {
			total: this.tools.size,
			enabled: 0,
			disabled: 0,
			categories: this.getAvailableCategories().length,
			tags: this.getAvailableTags().length
		};

		for (const tool of this.tools.values()) {
			if (tool.enabled !== false) {
				stats.enabled++;
			} else {
				stats.disabled++;
			}
		}

		return stats;
	}

	private notifyToolCacheInvalidation(): void {
		// Dynamically import to avoid circular dependency
		import('$lib/utils/text-formatter.js')
			.then((module) => {
				if (module.invalidateToolCache) {
					module.invalidateToolCache();
				}
			})
			.catch((error) => {
				console.warn('Failed to invalidate text formatter cache:', error);
			});
	}
}

// Create singleton instance
export const toolRegistry = new ToolRegistryManager();

// Legacy compatibility - export tools in the old format for existing code
export const toolsRegistry = (() => {
	const tools: Record<string, unknown> = {};
	const enabledTools = toolRegistry.getEnabledTools();

	for (const [name, metadata] of Object.entries(enabledTools)) {
		tools[name] = metadata.tool;
	}

	return tools;
})();

// Helper functions for backward compatibility
export const getAvailableTools = () => {
	return Object.keys(toolRegistry.getEnabledTools());
};

export const getToolDescriptions = () => {
	const enabledTools = toolRegistry.getEnabledTools();
	return Object.entries(enabledTools).map(([name, metadata]) => ({
		name,
		description: metadata.description,
		category: metadata.category,
		tags: metadata.tags
	}));
};

// New enhanced helper functions
export const getToolsByCategory = (category: string) => {
	return toolRegistry.getToolsByCategory(category);
};

export const getToolsByTag = (tag: string) => {
	return toolRegistry.getToolsByTag(tag);
};

export const getToolStats = () => {
	return toolRegistry.getToolStats();
};

// Configuration functions
export const enableTool = (name: string) => {
	return toolRegistry.enableTool(name);
};

export const disableTool = (name: string) => {
	return toolRegistry.disableTool(name);
};

// Export the registry instance for advanced usage
export { toolRegistry as registry };
