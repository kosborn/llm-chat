import { browser } from '$app/environment';
import { toolRegistry } from '$lib/tools/registry.js';

interface ToolSettings {
	[toolName: string]: boolean;
}

class ToolSettingsStore {
	private static STORAGE_KEY = 'ai-tool-chat-tool-settings';
	private settings = $state<ToolSettings>({});
	private initialized = false;

	constructor() {
		if (browser) {
			this.loadSettings();
		}
	}

	private loadSettings(): void {
		try {
			const stored = localStorage.getItem(ToolSettingsStore.STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.settings = { ...parsed };
			}
			this.syncWithRegistry();
			this.initialized = true;
		} catch (error) {
			console.warn('Failed to load tool settings from localStorage:', error);
			this.settings = {};
			this.initialized = true;
		}
	}

	private saveSettings(): void {
		if (!browser || !this.initialized) return;

		try {
			localStorage.setItem(ToolSettingsStore.STORAGE_KEY, JSON.stringify(this.settings));
		} catch (error) {
			console.warn('Failed to save tool settings to localStorage:', error);
		}
	}

	private syncWithRegistry(): void {
		// Apply stored settings to registry
		for (const [toolName, enabled] of Object.entries(this.settings)) {
			if (enabled) {
				toolRegistry.enableTool(toolName);
			} else {
				toolRegistry.disableTool(toolName);
			}
		}

		// Initialize settings for tools not in storage (default to enabled)
		const allTools = toolRegistry.getAllTools();
		for (const [toolName, metadata] of Object.entries(allTools)) {
			if (!(toolName in this.settings)) {
				this.settings[toolName] = metadata.enabled !== false;
			}
		}
	}

	public getToolSetting(toolName: string): boolean {
		return this.settings[toolName] ?? true;
	}

	public setToolSetting(toolName: string, enabled: boolean): void {
		this.settings[toolName] = enabled;

		// Update registry
		if (enabled) {
			toolRegistry.enableTool(toolName);
		} else {
			toolRegistry.disableTool(toolName);
		}

		this.saveSettings();
	}

	public getAllSettings(): ToolSettings {
		return { ...this.settings };
	}

	public resetToDefaults(): void {
		const allTools = toolRegistry.getAllTools();
		for (const [toolName, metadata] of Object.entries(allTools)) {
			const defaultEnabled = metadata.enabled !== false;
			this.settings[toolName] = defaultEnabled;

			if (defaultEnabled) {
				toolRegistry.enableTool(toolName);
			} else {
				toolRegistry.disableTool(toolName);
			}
		}
		this.saveSettings();
	}

	public exportSettings(): string {
		return JSON.stringify(this.settings, null, 2);
	}

	public importSettings(settingsJson: string): boolean {
		try {
			const imported = JSON.parse(settingsJson);
			if (typeof imported === 'object' && imported !== null) {
				this.settings = { ...imported };
				this.syncWithRegistry();
				this.saveSettings();
				return true;
			}
			return false;
		} catch (error) {
			console.warn('Failed to import tool settings:', error);
			return false;
		}
	}

	public getStats() {
		const total = Object.keys(this.settings).length;
		const enabled = Object.values(this.settings).filter(Boolean).length;
		const disabled = total - enabled;

		return {
			total,
			enabled,
			disabled,
			initialized: this.initialized
		};
	}

	// For temporary tool enabling (for @mentions)
	public createTemporaryRegistry(enabledTools: string[]): ToolSettings {
		const tempSettings = { ...this.settings };

		// Temporarily enable mentioned tools
		for (const toolName of enabledTools) {
			if (toolRegistry.getToolByName(toolName)) {
				tempSettings[toolName] = true;
			}
		}

		return tempSettings;
	}

	public applyTemporarySettings(tempSettings: ToolSettings): void {
		for (const [toolName, enabled] of Object.entries(tempSettings)) {
			if (enabled) {
				toolRegistry.enableTool(toolName);
			} else {
				toolRegistry.disableTool(toolName);
			}
		}
	}

	public restoreSettings(): void {
		this.syncWithRegistry();
	}
}

export const toolSettingsStore = new ToolSettingsStore();
