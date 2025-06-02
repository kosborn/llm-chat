// Comprehensive provider management system
// Consolidates all provider and model handling into a single abstraction

import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { browser } from '$app/environment';
import type { ModelConfig, Provider, ProviderId } from './index.js';
import { PROVIDERS, getAllProviders, getProvider } from './index.js';
import { debugConsole } from '../utils/console.js';

export interface ProviderStatus {
	canSend: boolean;
	hasApiKey: boolean;
	isValidApiKey: boolean;
	isServerAvailable: boolean;
	provider: ProviderId;
	model: string;
	displayName: string;
	errorMessage?: string;
}

export interface ModelSelection {
	provider: ProviderId;
	model: string;
	displayName: string;
	cost: {
		input: number;
		output: number;
	};
}

export interface ProviderCapabilities {
	availableProviders: ProviderId[];
	serverProviders: ProviderId[];
	clientProviders: ProviderId[];
	canUseServer: boolean;
	requiresApiKey: boolean;
}

class ProviderManager {
	private apiKeyStorage: Map<ProviderId, string> = new Map();
	private currentProvider: ProviderId = 'groq';
	private currentModel: string = 'llama-3.3-70b-versatile';
	private serverAvailable: boolean = false;
	private lastServerCheck: number = 0;
	private providerInstances: Map<string, any> = new Map();

	constructor() {
		if (browser) {
			this.loadFromLocalStorage();
		}
	}

	// === API Key Management ===

	setApiKey(provider: ProviderId, apiKey: string): void {
		if (this.validateApiKeyFormat(apiKey, provider)) {
			this.apiKeyStorage.set(provider, apiKey);
			if (browser) {
				localStorage.setItem(`apiKey_${provider}`, apiKey);
			}
		} else {
			throw new Error(`Invalid API key format for ${provider}`);
		}
	}

	getApiKey(provider?: ProviderId): string | null {
		const targetProvider = provider || this.currentProvider;
		return this.apiKeyStorage.get(targetProvider) || null;
	}

	clearApiKey(provider?: ProviderId): void {
		const targetProvider = provider || this.currentProvider;
		this.apiKeyStorage.delete(targetProvider);
		if (browser) {
			localStorage.removeItem(`apiKey_${targetProvider}`);
		}
	}

	clearAllApiKeys(): void {
		this.apiKeyStorage.clear();
		if (browser) {
			Object.keys(PROVIDERS).forEach((provider) => {
				localStorage.removeItem(`apiKey_${provider}`);
			});
		}
	}

	validateApiKeyFormat(apiKey: string, provider: ProviderId): boolean {
		const providerConfig = getProvider(provider);
		if (!providerConfig || !apiKey) return false;
		return apiKey.startsWith(providerConfig.apiKeyPrefix);
	}

	hasValidApiKey(provider?: ProviderId): boolean {
		const targetProvider = provider || this.currentProvider;
		const apiKey = this.getApiKey(targetProvider);
		return apiKey !== null && this.validateApiKeyFormat(apiKey, targetProvider);
	}

	// === Provider Selection ===

	setCurrentProvider(provider: ProviderId, model?: string): void {
		if (!this.isValidProvider(provider)) {
			throw new Error(`Invalid provider: ${provider}`);
		}

		this.currentProvider = provider;

		if (model) {
			if (this.isValidModelForProvider(provider, model)) {
				this.currentModel = model;
			} else {
				this.currentModel = this.getDefaultModelForProvider(provider);
			}
		} else {
			this.currentModel = this.getDefaultModelForProvider(provider);
		}

		if (browser) {
			localStorage.setItem('currentProvider', provider);
			localStorage.setItem('currentModel', this.currentModel);
		}
	}

	getCurrentProvider(): ProviderId {
		return this.currentProvider;
	}

	getCurrentModel(): string {
		return this.currentModel;
	}

	getCurrentSelection(): ModelSelection {
		const provider = getProvider(this.currentProvider)!;
		const model = this.getModelConfig(this.currentProvider, this.currentModel)!;

		return {
			provider: this.currentProvider,
			model: this.currentModel,
			displayName: `${provider.displayName} - ${model.displayName}`,
			cost: {
				input: model.inputCostPer1kTokens,
				output: model.outputCostPer1kTokens
			}
		};
	}

	// === Provider Information ===

	getAllProviders(): Provider[] {
		return getAllProviders();
	}

	getProvider(provider: ProviderId): Provider | undefined {
		return getProvider(provider);
	}

	getProviderDisplayName(provider: ProviderId): string {
		return getProvider(provider)?.displayName || provider;
	}

	isValidProvider(provider: string): provider is ProviderId {
		return provider in PROVIDERS;
	}

	// === Model Information ===

	getAvailableModels(provider: ProviderId): ModelConfig[] {
		return getProvider(provider)?.models || [];
	}

	getModelConfig(provider: ProviderId, model: string): ModelConfig | undefined {
		const providerConfig = getProvider(provider);
		return providerConfig?.models.find((m) => m.id === model);
	}

	getModelDisplayName(provider: ProviderId, model: string): string {
		const modelConfig = this.getModelConfig(provider, model);
		return modelConfig?.displayName || model;
	}

	isValidModelForProvider(provider: ProviderId, model: string): boolean {
		return this.getAvailableModels(provider).some((m) => m.id === model);
	}

	getDefaultModelForProvider(provider: ProviderId): string {
		return getProvider(provider)?.defaultModel || '';
	}

	// === Server Capabilities ===

	async checkServerAvailability(): Promise<boolean> {
		if (!browser) return false;

		// Import networkStore dynamically to avoid circular dependencies
		const { networkStore } = await import('../stores/network-store.svelte.js');

		// If we're offline, server is definitely not available
		if (!networkStore.isOnline) {
			this.serverAvailable = false;
			return false;
		}

		const now = Date.now();
		// Use shorter cache time and reset when offline
		if (now - this.lastServerCheck < 5000) {
			return this.serverAvailable;
		}

		this.lastServerCheck = now;

		try {
			const response = await fetch('/api/health', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				signal: AbortSignal.timeout(3000) // 3 second timeout
			});

			this.serverAvailable = response.ok;
		} catch {
			this.serverAvailable = false;
		}

		return this.serverAvailable;
	}

	getServerAvailableProviders(): ProviderId[] {
		if (browser) return [];
		// Server provider detection is handled server-side
		// This will be populated by server calls
		return [];
	}

	getClientAvailableProviders(): ProviderId[] {
		return Array.from(this.apiKeyStorage.keys()).filter((provider) =>
			this.hasValidApiKey(provider)
		);
	}

	// === Provider Instances ===

	getServerProviderInstance(provider: ProviderId): any {
		throw new Error('Server provider instances should be created server-side only');
	}

	getClientProviderInstance(provider: ProviderId): any {
		const apiKey = this.getApiKey(provider);
		if (!apiKey) {
			throw new Error(`No API key available for ${provider}`);
		}

		const cacheKey = `client_${provider}_${apiKey.slice(-8)}`;
		if (this.providerInstances.has(cacheKey)) {
			return this.providerInstances.get(cacheKey);
		}

		let instance;
		switch (provider) {
			case 'groq':
				instance = createGroq({ apiKey });
				break;
			case 'anthropic':
				instance = createAnthropic({ apiKey });
				break;
			case 'openai':
				instance = createOpenAI({ apiKey });
				break;
			case 'google':
				instance = createGoogleGenerativeAI({ apiKey });
				break;
			default:
				throw new Error(`Unsupported client provider: ${provider}`);
		}

		this.providerInstances.set(cacheKey, instance);
		return instance;
	}

	// === Status and Capabilities ===

	async getProviderStatus(provider?: ProviderId, model?: string): Promise<ProviderStatus> {
		const targetProvider = provider || this.currentProvider;
		const targetModel = model || this.currentModel;
		const providerConfig = getProvider(targetProvider);

		if (!providerConfig) {
			return {
				canSend: false,
				hasApiKey: false,
				isValidApiKey: false,
				isServerAvailable: false,
				provider: targetProvider,
				model: targetModel,
				displayName: targetProvider,
				errorMessage: 'Invalid provider'
			};
		}

		const hasApiKey = !!this.getApiKey(targetProvider);
		const isValidApiKey = this.hasValidApiKey(targetProvider);
		const isServerAvailable = await this.checkServerAvailability();

		const canSend = isServerAvailable || isValidApiKey;

		let errorMessage: string | undefined;
		if (!canSend) {
			if (!hasApiKey) {
				errorMessage = `No ${providerConfig.displayName} API key configured`;
			} else if (!isValidApiKey) {
				errorMessage = `Invalid ${providerConfig.displayName} API key format`;
			} else {
				errorMessage = 'Cannot send messages';
			}
		}

		return {
			canSend,
			hasApiKey,
			isValidApiKey,
			isServerAvailable,
			provider: targetProvider,
			model: targetModel,
			displayName: `${providerConfig.displayName} - ${this.getModelDisplayName(targetProvider, targetModel)}`,
			errorMessage
		};
	}

	// Force refresh server availability status
	async refreshServerAvailability(): Promise<boolean> {
		this.lastServerCheck = 0; // Force refresh
		return this.checkServerAvailability();
	}

	// Reset server availability when going offline
	markServerOffline(): void {
		this.serverAvailable = false;
		this.lastServerCheck = 0;
	}

	async getCapabilities(): Promise<ProviderCapabilities> {
		const serverProviders = this.getServerAvailableProviders();
		const clientProviders = this.getClientAvailableProviders();
		const availableProviders = [...new Set([...serverProviders, ...clientProviders])];
		const canUseServer = await this.checkServerAvailability();
		const requiresApiKey = !canUseServer && clientProviders.length === 0;

		return {
			availableProviders,
			serverProviders,
			clientProviders,
			canUseServer,
			requiresApiKey
		};
	}

	// === Provider Selection Logic ===

	selectBestProvider(requestedProvider?: ProviderId): ProviderId | null {
		const serverProviders = this.getServerAvailableProviders();
		const clientProviders = this.getClientAvailableProviders();

		// If a specific provider was requested
		if (requestedProvider) {
			if (
				serverProviders.includes(requestedProvider) ||
				clientProviders.includes(requestedProvider)
			) {
				return requestedProvider;
			}
		}

		// Prefer server providers first (by priority)
		const sortedProviders = getAllProviders();
		for (const provider of sortedProviders) {
			if (serverProviders.includes(provider.id as ProviderId)) {
				return provider.id as ProviderId;
			}
		}

		// Fallback to client providers
		for (const provider of sortedProviders) {
			if (clientProviders.includes(provider.id as ProviderId)) {
				return provider.id as ProviderId;
			}
		}

		return null;
	}

	getFallbackProvider(currentProvider: ProviderId): ProviderId | null {
		const allAvailable = [
			...this.getServerAvailableProviders(),
			...this.getClientAvailableProviders()
		].filter((p) => p !== currentProvider);

		return this.selectBestProvider() || (allAvailable.length > 0 ? allAvailable[0] : null);
	}

	// === Cost Calculation ===

	calculateCost(
		provider: ProviderId,
		model: string,
		inputTokens: number,
		outputTokens: number
	): number {
		const modelConfig = this.getModelConfig(provider, model);
		if (!modelConfig) return 0;

		const inputCost = (inputTokens / 1000) * modelConfig.inputCostPer1kTokens;
		const outputCost = (outputTokens / 1000) * modelConfig.outputCostPer1kTokens;

		return inputCost + outputCost;
	}

	formatCost(cost: number): string {
		if (cost === 0) return 'Free';
		if (cost < 0.01) return '<$0.01';
		return `$${cost.toFixed(3)}`;
	}

	isProviderFree(provider: ProviderId): boolean {
		const providerConfig = getProvider(provider);
		if (!providerConfig) return false;
		return providerConfig.models.every(
			(model) => model.inputCostPer1kTokens === 0 && model.outputCostPer1kTokens === 0
		);
	}

	// === Persistence ===

	private loadFromLocalStorage(): void {
		try {
			// Load API keys
			Object.keys(PROVIDERS).forEach((provider) => {
				const apiKey = localStorage.getItem(`apiKey_${provider}`);
				if (apiKey) {
					this.apiKeyStorage.set(provider as ProviderId, apiKey);
				}
			});

			// Load current provider and model
			const savedProvider = localStorage.getItem('currentProvider') as ProviderId;
			const savedModel = localStorage.getItem('currentModel');

			if (savedProvider && this.isValidProvider(savedProvider)) {
				this.currentProvider = savedProvider;
			}

			if (savedModel && this.isValidModelForProvider(this.currentProvider, savedModel)) {
				this.currentModel = savedModel;
			}
		} catch (error) {
			debugConsole.warn('Failed to load provider settings from localStorage:', error);
		}
	}

	// === Validation ===

	validateConfiguration(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];
		const serverProviders = this.getServerAvailableProviders();
		const clientProviders = this.getClientAvailableProviders();

		if (serverProviders.length === 0 && clientProviders.length === 0) {
			errors.push(
				'No providers available. Configure at least one API key or ensure server has API keys.'
			);
		}

		if (!this.isValidProvider(this.currentProvider)) {
			errors.push(`Current provider "${this.currentProvider}" is invalid.`);
		}

		if (!this.isValidModelForProvider(this.currentProvider, this.currentModel)) {
			errors.push(
				`Current model "${this.currentModel}" is not valid for provider "${this.currentProvider}".`
			);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	// === Debug and Utilities ===

	getDebugInfo(): Record<string, any> {
		return {
			currentProvider: this.currentProvider,
			currentModel: this.currentModel,
			apiKeysConfigured: Array.from(this.apiKeyStorage.keys()),
			serverAvailable: this.serverAvailable,
			lastServerCheck: this.lastServerCheck,
			serverProviders: this.getServerAvailableProviders(),
			clientProviders: this.getClientAvailableProviders()
		};
	}

	reset(): void {
		this.clearAllApiKeys();
		this.currentProvider = 'groq';
		this.currentModel = 'llama-3.3-70b-versatile';
		this.serverAvailable = false;
		this.lastServerCheck = 0;
		this.providerInstances.clear();

		if (browser) {
			localStorage.removeItem('currentProvider');
			localStorage.removeItem('currentModel');
		}
	}
}

// Create singleton instance
export const providerManager = new ProviderManager();

// Export types for TypeScript
export type { ProviderStatus, ModelSelection, ProviderCapabilities };
