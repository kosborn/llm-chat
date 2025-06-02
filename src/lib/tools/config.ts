// Tool configuration and management
export interface ToolsConfig {
	// Global tool settings
	enabled: boolean;
	maxConcurrentExecutions: number;
	defaultTimeout: number;

	// Individual tool configurations
	tools: {
		[toolName: string]: {
			enabled: boolean;
			config?: Record<string, unknown>;
			rateLimit?: {
				maxRequests: number;
				windowMs: number;
			};
			timeout?: number;
		};
	};

	// Categories configuration
	categories: {
		[categoryName: string]: {
			enabled: boolean;
			description: string;
			priority: number;
		};
	};
}

// Default configuration
export const defaultToolsConfig: ToolsConfig = {
	enabled: true,
	maxConcurrentExecutions: 5,
	defaultTimeout: 30000, // 30 seconds

	tools: {
		weather: {
			enabled: true,
			timeout: 10000,
			rateLimit: {
				maxRequests: 100,
				windowMs: 60000 // 1 minute
			}
		},
		calculator: {
			enabled: true,
			timeout: 5000
		},
		time: {
			enabled: true,
			timeout: 3000
		},
		random: {
			enabled: true,
			timeout: 2000
		},
		url: {
			enabled: true,
			timeout: 10000,
			rateLimit: {
				maxRequests: 50,
				windowMs: 60000
			}
		},
		'text-processor': {
			enabled: true,
			timeout: 5000,
			rateLimit: {
				maxRequests: 200,
				windowMs: 60000
			}
		}
	},

	categories: {
		utility: {
			enabled: true,
			description: 'General utility tools',
			priority: 1
		},
		web: {
			enabled: true,
			description: 'Web-related tools',
			priority: 2
		},
		data: {
			enabled: true,
			description: 'Data processing tools',
			priority: 3
		},
		ai: {
			enabled: true,
			description: 'AI and ML tools',
			priority: 4
		},
		development: {
			enabled: true,
			description: 'Development tools',
			priority: 5
		}
	}
};

// Environment-specific overrides
export const getToolsConfig = (): ToolsConfig => {
	// In a real application, this could load from environment variables,
	// database, or configuration files
	const config = { ...defaultToolsConfig };

	// Example environment-based overrides
	const nodeEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV;

	if (nodeEnv === 'development') {
		// Enable all tools in development
		for (const toolName of Object.keys(config.tools)) {
			config.tools[toolName].enabled = true;
		}
	}

	if (nodeEnv === 'production') {
		// More conservative settings in production
		config.maxConcurrentExecutions = 3;
		config.defaultTimeout = 15000;
	}

	return config;
};

// Helper functions for configuration management
export const isToolEnabled = (toolName: string, config?: ToolsConfig): boolean => {
	const cfg = config || getToolsConfig();
	return cfg.enabled && (cfg.tools[toolName]?.enabled ?? false);
};

export const isToolNetworkRequired = (toolName: string): boolean => {
	// This would need to be coordinated with the actual tool metadata
	// For now, we'll define which tools require network
	const networkRequiredTools = ['weather', 'url', 'maxmind'];
	return networkRequiredTools.includes(toolName);
};

export const isCategoryEnabled = (categoryName: string, config?: ToolsConfig): boolean => {
	const cfg = config || getToolsConfig();
	return cfg.enabled && (cfg.categories[categoryName]?.enabled ?? true);
};

export const getToolTimeout = (toolName: string, config?: ToolsConfig): number => {
	const cfg = config || getToolsConfig();
	return cfg.tools[toolName]?.timeout ?? cfg.defaultTimeout;
};

export const getToolRateLimit = (toolName: string, config?: ToolsConfig) => {
	const cfg = config || getToolsConfig();
	return cfg.tools[toolName]?.rateLimit;
};

export const getToolsRequiringNetwork = (config?: ToolsConfig): string[] => {
	const cfg = config || getToolsConfig();
	return Object.keys(cfg.tools).filter((toolName) => isToolNetworkRequired(toolName));
};

export const getOfflineCompatibleTools = (config?: ToolsConfig): string[] => {
	const cfg = config || getToolsConfig();
	return Object.keys(cfg.tools).filter((toolName) => !isToolNetworkRequired(toolName));
};
