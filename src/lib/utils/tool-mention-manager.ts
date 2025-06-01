import { extractToolMentions } from '$lib/utils/text-formatter-manager.js';
import { toolRegistry } from '$lib/tools/registry.js';
import { toolSettingsStore } from '$lib/stores/tool-settings-store.svelte.js';

export interface ToolMentionContext {
	mentionedTools: string[];
	temporarySettings: Record<string, boolean>;
	hasDisabledMentions: boolean;
}

export class ToolMentionManager {
	/**
	 * Extract tool mentions from a message and create context for temporary enabling
	 */
	static analyzeMessage(message: string): ToolMentionContext {
		const mentionedTools = extractToolMentions(message);
		const currentSettings = toolSettingsStore.getAllSettings();
		const hasDisabledMentions = mentionedTools.some((tool) => !currentSettings[tool]);

		// Create temporary settings that enable all mentioned tools
		const temporarySettings = toolSettingsStore.createTemporaryRegistry(mentionedTools);

		return {
			mentionedTools,
			temporarySettings,
			hasDisabledMentions
		};
	}

	/**
	 * Apply temporary tool settings for a specific request
	 */
	static applyTemporarySettings(context: ToolMentionContext): void {
		if (context.hasDisabledMentions) {
			toolSettingsStore.applyTemporarySettings(context.temporarySettings);
		}
	}

	/**
	 * Restore original tool settings after a request
	 */
	static restoreOriginalSettings(): void {
		toolSettingsStore.restoreSettings();
	}

	/**
	 * Get tools registry with temporarily enabled tools for server-side use
	 */
	static getTemporaryToolsRegistry(mentionedTools: string[]): Record<string, any> {
		const originalSettings = toolSettingsStore.getAllSettings();
		const tempSettings = toolSettingsStore.createTemporaryRegistry(mentionedTools);

		// Apply temporary settings
		toolSettingsStore.applyTemporarySettings(tempSettings);

		// Get enabled tools
		const enabledTools = toolRegistry.getEnabledTools();
		const toolsForRegistry: Record<string, any> = {};

		for (const [name, metadata] of Object.entries(enabledTools)) {
			toolsForRegistry[name] = metadata.tool;
		}

		// Restore original settings
		toolSettingsStore.restoreSettings();

		return toolsForRegistry;
	}

	/**
	 * Create a scoped execution context for tool usage
	 */
	static async withTemporaryTools<T>(
		mentionedTools: string[],
		callback: () => Promise<T>
	): Promise<T> {
		const context = this.analyzeMessage(`@${mentionedTools.join(' @')}`);

		try {
			this.applyTemporarySettings(context);
			return await callback();
		} finally {
			this.restoreOriginalSettings();
		}
	}

	/**
	 * Check if a tool mention should enable a disabled tool
	 */
	static shouldEnableTool(toolName: string): boolean {
		const tool = toolRegistry.getToolByName(toolName);
		if (!tool) return false;

		const currentSetting = toolSettingsStore.getToolSetting(toolName);
		return !currentSetting; // Should enable if currently disabled
	}

	/**
	 * Get a summary of what tools will be temporarily enabled
	 */
	static getEnablementSummary(message: string): {
		willEnable: string[];
		alreadyEnabled: string[];
		invalid: string[];
	} {
		const mentionedTools = extractToolMentions(message);
		const willEnable: string[] = [];
		const alreadyEnabled: string[] = [];
		const invalid: string[] = [];

		for (const toolName of mentionedTools) {
			const tool = toolRegistry.getToolByName(toolName);
			if (!tool) {
				invalid.push(toolName);
				continue;
			}

			const isCurrentlyEnabled = toolSettingsStore.getToolSetting(toolName);
			if (isCurrentlyEnabled) {
				alreadyEnabled.push(toolName);
			} else {
				willEnable.push(toolName);
			}
		}

		return { willEnable, alreadyEnabled, invalid };
	}
}
