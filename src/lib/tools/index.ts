// Main tools entry point - now using modular registry system
import {
	toolsRegistry,
	getAvailableTools,
	getToolDescriptions,
	getToolsByCategory,
	getToolsByTag,
	getToolStats,
	enableTool,
	disableTool,
	registry
} from './registry.js';

export {
	toolsRegistry,
	getAvailableTools,
	getToolDescriptions,
	getToolsByCategory,
	getToolsByTag,
	getToolStats,
	enableTool,
	disableTool
};

// Re-export network-aware functions from registry
export { getOfflineTools, getNetworkTools, canUseTool } from './registry.js';

export {
	type ToolConfig,
	type ToolMetadata,
	type ToolRegistry,
	type ToolDiscovery,
	type ToolResult,
	type ToolContext,
	BaseTool
} from './types.js';

export { getToolsConfig, isToolEnabled, isCategoryEnabled } from './config.js';

// Individual tool exports for direct use
export { weatherTool } from './implementations/weather.js';
export { calculatorTool } from './implementations/calculator.js';
export { timeTool } from './implementations/time.js';
export { randomTool } from './implementations/random.js';
export { urlTool } from './implementations/url.js';
export { textProcessorTool } from './implementations/text-processor.js';
export { maxmindTool } from './implementations/maxmind.js';

// Convenience re-exports for the registry
export { registry, registry as tools };
