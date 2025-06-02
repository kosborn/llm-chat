import type { ToolRegistry, ToolMetadata, ToolDiscovery } from './types.js';
import { debugConsole } from '../utils/console.js';
import { networkStatus } from '../services/network-status.svelte.js';

// Import all tool implementations
import { weatherTool } from './implementations/weather.js';
import { calculatorTool } from './implementations/calculator.js';
import { timeTool } from './implementations/time.js';
import { randomTool } from './implementations/random.js';
import { urlTool } from './implementations/url.js';
import { textProcessorTool } from './implementations/text-processor.js';
import { jsonFormatterTool } from './implementations/json-formatter.js';
import { maxmindTool } from './implementations/maxmind.js';

// Lazy import to avoid circular dependency
let toolSettingsStore: any = null;
const getToolSettingsStore = async () => {
	if (!toolSettingsStore) {
		const module = await import('$lib/stores/tool-settings-store.svelte.js');
		toolSettingsStore = module.toolSettingsStore;
	}
	return toolSettingsStore;
};

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
			debugConsole.warn(`Tool '${toolMetadata.name}' is already registered. Overwriting...`);
		}

		this.tools.set(toolMetadata.name, toolMetadata);
		debugConsole.log(`Registered tool: ${toolMetadata.name} v${toolMetadata.version}`);
		// Notify text formatter to invalidate cache
		this.notifyToolCacheInvalidation();
	}

	unregisterTool(name: string): void {
		if (this.tools.has(name)) {
			this.tools.delete(name);
			debugConsole.log(`Unregistered tool: ${name}`);
			// Notify text formatter to invalidate cache
			this.notifyToolCacheInvalidation();
		} else {
			debugConsole.warn(`Tool '${name}' not found in registry`);
		}
	}

	getEnabledTools(): ToolRegistry {
		const enabledTools: ToolRegistry = {};

		for (const [name, metadata] of this.tools.entries()) {
			// ONLY use metadata.enabled which is synced with persistent settings
			// The metadata.enabled property is updated during initializePersistentSettings
			const isEnabled = metadata.enabled !== false;

			// Check if tool requires network and we're offline
			const requiresNetwork = metadata.requiresNetwork === true;
			const isNetworkAvailable = networkStatus.isOnline;
			const canUse = !requiresNetwork || isNetworkAvailable;

			if (isEnabled && canUse) {
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

	async enableToolPersistent(name: string): Promise<boolean> {
		const tool = this.tools.get(name);
		if (!tool) return false;

		// Update metadata directly (single source of truth)
		tool.enabled = true;

		// Persist to store
		try {
			const settingsStore = await getToolSettingsStore();
			settingsStore.setToolSetting(name, true);
		} catch (error) {
			debugConsole.warn('Failed to persist tool setting:', error);
		}

		// Notify cache invalidation
		this.notifyToolCacheInvalidation();
		return true;
	}

	async disableToolPersistent(name: string): Promise<boolean> {
		const tool = this.tools.get(name);
		if (!tool) return false;

		// Update metadata directly (single source of truth)
		tool.enabled = false;

		// Persist to store
		try {
			const settingsStore = await getToolSettingsStore();
			settingsStore.setToolSetting(name, false);
		} catch (error) {
			debugConsole.warn('Failed to persist tool setting:', error);
		}

		// Notify cache invalidation
		this.notifyToolCacheInvalidation();
		return true;
	}

	async initializePersistentSettings(): Promise<void> {
		try {
			const settingsStore = await getToolSettingsStore();
			// Store reference for future use
			toolSettingsStore = settingsStore;

			const allSettings = settingsStore.getAllSettings();

			// Apply persistent settings directly to tool metadata
			// This is the SINGLE SOURCE OF TRUTH for enabled/disabled state
			for (const [name, enabled] of Object.entries(allSettings)) {
				const tool = this.tools.get(name);
				if (tool) {
					tool.enabled = enabled;
				}
			}

			// Initialize any tools not in settings (default to enabled)
			for (const [name, tool] of this.tools.entries()) {
				if (!(name in allSettings)) {
					tool.enabled = true; // Default enabled
					settingsStore.setToolSetting(name, true);
				}
			}
		} catch (error) {
			debugConsole.warn('Failed to initialize persistent tool settings:', error);
		}
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
		const enabledTools = this.getEnabledTools();
		const networkTools = Array.from(this.tools.values()).filter(
			(tool) => tool.requiresNetwork === true
		);
		const offlineTools = Array.from(this.tools.values()).filter(
			(tool) => tool.requiresNetwork !== true
		);

		const stats = {
			total: this.tools.size,
			enabled: Object.keys(enabledTools).length,
			disabled: this.tools.size - Object.keys(enabledTools).length,
			requiresNetwork: networkTools.length,
			worksOffline: offlineTools.length,
			networkStatus: networkStatus.isOnline ? 'online' : 'offline',
			categories: this.getAvailableCategories().length,
			tags: this.getAvailableTags().length
		};

		return stats;
	}

	// Get tools that work offline (don't require network)
	getOfflineTools(): ToolRegistry {
		const offlineTools: ToolRegistry = {};

		for (const [name, metadata] of this.tools.entries()) {
			const isEnabled = metadata.enabled !== false;
			const worksOffline = metadata.requiresNetwork !== true;

			if (isEnabled && worksOffline) {
				offlineTools[name] = metadata;
			}
		}

		return offlineTools;
	}

	// Get tools that require network
	getNetworkTools(): ToolRegistry {
		const networkTools: ToolRegistry = {};

		for (const [name, metadata] of this.tools.entries()) {
			const isEnabled = metadata.enabled !== false;
			const requiresNetwork = metadata.requiresNetwork === true;

			if (isEnabled && requiresNetwork) {
				networkTools[name] = metadata;
			}
		}

		return networkTools;
	}

	// Check if a specific tool can be used in current network state
	canUseTool(toolName: string): boolean {
		const tool = this.tools.get(toolName);
		if (!tool || tool.enabled === false) {
			return false;
		}

		const requiresNetwork = tool.requiresNetwork === true;
		return !requiresNetwork || networkStatus.isOnline;
	}

	private notifyToolCacheInvalidation(): void {
		// Dynamically import to avoid circular dependency
		import('$lib/utils/text-formatter-manager.js')
			.then((module) => {
				if (module.invalidateToolCache) {
					module.invalidateToolCache();
				}
			})
			.catch((error) => {
				debugConsole.warn('Failed to invalidate text formatter cache:', error);
			});
	}
}

// Create singleton instance
export const toolRegistry = new ToolRegistryManager();

// Legacy compatibility - export tools in the old format for existing code
// Make this dynamic so it reflects current enabled state
export const toolsRegistry = new Proxy({} as Record<string, unknown>, {
	get(target, prop) {
		if (typeof prop === 'string') {
			const enabledTools = toolRegistry.getEnabledTools();
			const metadata = enabledTools[prop];
			return metadata?.tool;
		}
		return undefined;
	},
	ownKeys() {
		const enabledTools = toolRegistry.getEnabledTools();
		const keys = Object.keys(enabledTools);
		return keys;
	},
	has(target, prop) {
		if (typeof prop === 'string') {
			const enabledTools = toolRegistry.getEnabledTools();
			const hasKey = prop in enabledTools;
			return hasKey;
		}
		return false;
	},
	getOwnPropertyDescriptor(target, prop) {
		if (typeof prop === 'string') {
			const enabledTools = toolRegistry.getEnabledTools();
			if (prop in enabledTools) {
				return {
					enumerable: true,
					configurable: true,
					value: enabledTools[prop].tool
				};
			}
		}
		return undefined;
	}
});

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

// Network-aware helper functions
export const getOfflineTools = () => {
	return toolRegistry.getOfflineTools();
};

export const getNetworkTools = () => {
	return toolRegistry.getNetworkTools();
};

export const canUseTool = (toolName: string) => {
	return toolRegistry.canUseTool(toolName);
};

// Configuration functions
export const enableTool = (name: string) => {
	return toolRegistry.enableTool(name);
};

export const disableTool = (name: string) => {
	return toolRegistry.disableTool(name);
};

// Persistent configuration functions
export const enableToolPersistent = async (name: string) => {
	return toolRegistry.enableToolPersistent(name);
};

export const disableToolPersistent = async (name: string) => {
	return toolRegistry.disableToolPersistent(name);
};

export const initializePersistentSettings = async () => {
	return toolRegistry.initializePersistentSettings();
};

// Export the registry instance for advanced usage
export { toolRegistry as registry };
