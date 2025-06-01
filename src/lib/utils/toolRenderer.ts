import type { ToolInvocation } from '../../app.d.ts';
import type { ComponentType } from 'svelte';

// Import all tool components
import WeatherTool from '../components/tools/WeatherTool.svelte';
import CalculatorTool from '../components/tools/CalculatorTool.svelte';
import TimeTool from '../components/tools/TimeTool.svelte';
import RandomTool from '../components/tools/RandomTool.svelte';
import UrlTool from '../components/tools/UrlTool.svelte';
import MaxmindTool from '../components/tools/MaxmindTool.svelte';
import DefaultTool from '../components/tools/DefaultTool.svelte';

// Map tool names to their corresponding components
// This map includes ALL available tools, regardless of enabled/disabled state
// Tool enablement is handled at the execution level, not the rendering level
const toolComponentMap: Record<string, ComponentType> = {
	weather: WeatherTool,
	calculator: CalculatorTool,
	time: TimeTool,
	random: RandomTool,
	url: UrlTool,
	maxmind: MaxmindTool,
	// Add additional tools here as they are implemented
	'text-processor': DefaultTool, // Use DefaultTool for tools without specific components
	'json-formatter': DefaultTool
};

/**
 * Get the appropriate component for a given tool invocation
 * This function ensures that ANY tool invocation can be rendered,
 * regardless of whether the tool is currently enabled or disabled.
 * @param toolInvocation - The tool invocation to render
 * @returns The component class to use for rendering
 */
export function getToolComponent(toolInvocation: ToolInvocation): ComponentType {
	if (!toolInvocation || !toolInvocation.toolName) {
		console.warn('Invalid tool invocation provided to getToolComponent');
		return DefaultTool;
	}

	const component = toolComponentMap[toolInvocation.toolName];

	// Always return a valid component - either the specific one or DefaultTool
	// This ensures that disabled tools that were temporarily executed can still be rendered
	return component || DefaultTool;
}

/**
 * Register a new tool component
 * This allows dynamic registration of tool components at runtime
 * @param toolName - The name of the tool
 * @param component - The Svelte component to use for rendering
 */
export function registerToolComponent(toolName: string, component: ComponentType): void {
	if (!toolName || typeof toolName !== 'string') {
		console.warn('Invalid tool name provided to registerToolComponent');
		return;
	}

	if (!component) {
		console.warn('Invalid component provided to registerToolComponent');
		return;
	}

	toolComponentMap[toolName] = component;
	console.debug(`Registered tool component: ${toolName}`);
}

/**
 * Get all registered tool names
 * @returns Array of registered tool names
 */
export function getRegisteredToolNames(): string[] {
	return Object.keys(toolComponentMap);
}

/**
 * Check if a tool component is registered
 * @param toolName - The name of the tool to check
 * @returns True if the tool has a registered component
 */
export function hasToolComponent(toolName: string): boolean {
	return toolName in toolComponentMap;
}

/**
 * Ensure a tool invocation can be rendered by checking component availability
 * @param _toolInvocation - The tool invocation to validate (unused but kept for API consistency)
 * @returns True if the tool can be rendered (always true since we fallback to DefaultTool)
 */
export function canRenderToolInvocation(_toolInvocation: ToolInvocation): boolean {
	return true; // We can always render since we have DefaultTool fallback
}
