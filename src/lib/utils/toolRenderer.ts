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
const toolComponentMap: Record<string, ComponentType> = {
	weather: WeatherTool,
	calculator: CalculatorTool,
	time: TimeTool,
	random: RandomTool,
	url: UrlTool,
	maxmind: MaxmindTool
};

/**
 * Get the appropriate component for a given tool invocation
 * @param toolInvocation - The tool invocation to render
 * @returns The component class to use for rendering
 */
export function getToolComponent(toolInvocation: ToolInvocation): ComponentType {
	const component = toolComponentMap[toolInvocation.toolName];
	return component || DefaultTool;
}

/**
 * Register a new tool component
 * @param toolName - The name of the tool
 * @param component - The Svelte component to use for rendering
 */
export function registerToolComponent(toolName: string, component: ComponentType): void {
	toolComponentMap[toolName] = component;
}

/**
 * Get all registered tool names
 * @returns Array of registered tool names
 */
export function getRegisteredToolNames(): string[] {
	return Object.keys(toolComponentMap);
}
