// Provider abstraction system for AI chat application
// This centralizes all provider configuration and makes it easy to add/modify providers

export interface ModelConfig {
	id: string;
	displayName: string;
	inputCostPer1kTokens: number;
	outputCostPer1kTokens: number;
}

export interface Provider {
	id: string;
	name: string;
	displayName: string;
	description: string;
	apiKeyPrefix: string;
	signupUrl: string;
	docsUrl: string;
	defaultModel: string;
	models: ModelConfig[];
	icon: string;
	priority: number; // Lower numbers = higher priority for fallbacks
}

export const PROVIDERS: Record<string, Provider> = {
	groq: {
		id: 'groq',
		name: 'groq',
		displayName: 'Groq',
		description: 'Fast, free tier available',
		apiKeyPrefix: 'gsk_',
		signupUrl: 'https://console.groq.com',
		docsUrl: 'https://console.groq.com/docs',
		defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
		icon: '🚀',
		priority: 1,
		models: [
			{
				id: 'llama-3.3-70b-versatile',
				displayName: 'Llama 3.3 70B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'llama-3.1-405b-reasoning',
				displayName: 'Llama 3.1 405B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'llama-3.1-70b-versatile',
				displayName: 'Llama 3.1 70B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'llama-3.1-8b-instant',
				displayName: 'Llama 3.1 8B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'deepseek-r1-distill-llama-70b',
				displayName: 'DeepSeek R1 Distill 70B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
				displayName: 'Llama 4 Maverick 17B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'meta-llama/llama-4-scout-17b-16e-instruct',
				displayName: 'Llama 4 Scout 17B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'llama3-groq-70b-8192-tool-use-preview',
				displayName: 'Llama 3 70B (Tool Use)',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'llama3-groq-8b-8192-tool-use-preview',
				displayName: 'Llama 3 8B (Tool Use)',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'mixtral-8x7b-32768',
				displayName: 'Mixtral 8x7B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'gemma2-9b-it',
				displayName: 'Gemma 2 9B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			},
			{
				id: 'gemma-7b-it',
				displayName: 'Gemma 7B',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			}
		]
	},
	google: {
		id: 'google',
		name: 'google',
		displayName: 'Google',
		description: 'Gemini models',
		apiKeyPrefix: 'AIza',
		signupUrl: 'https://ai.google.dev/',
		docsUrl: 'https://ai.google.dev/docs',
		defaultModel: 'gemini-1.5-pro',
		icon: '🔍',
		priority: 2,
		models: [
			{
				id: 'gemini-1.5-pro',
				displayName: 'Gemini 1.5 Pro',
				inputCostPer1kTokens: 0.00125,
				outputCostPer1kTokens: 0.005
			},
			{
				id: 'gemini-1.5-flash',
				displayName: 'Gemini 1.5 Flash',
				inputCostPer1kTokens: 0.000075,
				outputCostPer1kTokens: 0.0003
			},
			{
				id: 'gemini-2.0-flash-exp',
				displayName: 'Gemini 2.0 Flash (Experimental)',
				inputCostPer1kTokens: 0.0,
				outputCostPer1kTokens: 0.0
			}
		]
	},
	anthropic: {
		id: 'anthropic',
		name: 'anthropic',
		displayName: 'Anthropic',
		description: 'Claude models',
		apiKeyPrefix: 'sk-ant-',
		signupUrl: 'https://console.anthropic.com',
		docsUrl: 'https://docs.anthropic.com',
		defaultModel: 'claude-3-5-sonnet-20241022',
		icon: '🎭',
		priority: 3,
		models: [
			{
				id: 'claude-3-5-sonnet-20241022',
				displayName: 'Claude 3.5 Sonnet (Oct 2024)',
				inputCostPer1kTokens: 0.003,
				outputCostPer1kTokens: 0.015
			},
			{
				id: 'claude-3-5-sonnet-20240620',
				displayName: 'Claude 3.5 Sonnet (Jun 2024)',
				inputCostPer1kTokens: 0.003,
				outputCostPer1kTokens: 0.015
			},
			{
				id: 'claude-3-5-haiku-20241022',
				displayName: 'Claude 3.5 Haiku',
				inputCostPer1kTokens: 0.00025,
				outputCostPer1kTokens: 0.00125
			},
			{
				id: 'claude-3-opus-20240229',
				displayName: 'Claude 3 Opus',
				inputCostPer1kTokens: 0.015,
				outputCostPer1kTokens: 0.075
			},
			{
				id: 'claude-3-sonnet-20240229',
				displayName: 'Claude 3 Sonnet',
				inputCostPer1kTokens: 0.003,
				outputCostPer1kTokens: 0.015
			},
			{
				id: 'claude-3-haiku-20240307',
				displayName: 'Claude 3 Haiku',
				inputCostPer1kTokens: 0.00025,
				outputCostPer1kTokens: 0.00125
			}
		]
	},
	openai: {
		id: 'openai',
		name: 'openai',
		displayName: 'OpenAI',
		description: 'GPT models',
		apiKeyPrefix: 'sk-',
		signupUrl: 'https://platform.openai.com/api-keys',
		docsUrl: 'https://platform.openai.com/docs',
		defaultModel: 'gpt-4o-mini',
		icon: '🤖',
		priority: 4,
		models: [
			{
				id: 'gpt-4o',
				displayName: 'GPT-4o',
				inputCostPer1kTokens: 0.005,
				outputCostPer1kTokens: 0.015
			},
			{
				id: 'gpt-4o-mini',
				displayName: 'GPT-4o Mini',
				inputCostPer1kTokens: 0.00015,
				outputCostPer1kTokens: 0.0006
			},
			{
				id: 'gpt-4-turbo',
				displayName: 'GPT-4 Turbo',
				inputCostPer1kTokens: 0.01,
				outputCostPer1kTokens: 0.03
			},
			{
				id: 'gpt-4',
				displayName: 'GPT-4',
				inputCostPer1kTokens: 0.03,
				outputCostPer1kTokens: 0.06
			},
			{
				id: 'gpt-3.5-turbo',
				displayName: 'GPT-3.5 Turbo',
				inputCostPer1kTokens: 0.0015,
				outputCostPer1kTokens: 0.002
			}
		]
	}
};

// Utility functions for working with providers
export type ProviderId = keyof typeof PROVIDERS;
export type ProviderIds = ProviderId[];

export function getProvider(id: string): Provider | undefined {
	return PROVIDERS[id];
}

export function getAllProviders(): Provider[] {
	return Object.values(PROVIDERS).sort((a, b) => a.priority - b.priority);
}

export function getProviderIds(): ProviderId[] {
	return Object.keys(PROVIDERS) as ProviderId[];
}

export function getDefaultProvider(): Provider {
	return PROVIDERS.groq;
}

export function getProviderByPriority(): Provider[] {
	return getAllProviders();
}

export function isValidProviderId(id: string): id is ProviderId {
	return id in PROVIDERS;
}

export function getModel(providerId: string, modelId: string): ModelConfig | undefined {
	const provider = getProvider(providerId);
	return provider?.models.find((model) => model.id === modelId);
}

export function getSupportedModels(providerId: string): ModelConfig[] {
	const provider = getProvider(providerId);
	return provider?.models || [];
}

export function getModelIds(providerId: string): string[] {
	return getSupportedModels(providerId).map((model) => model.id);
}

export function validateApiKey(key: string, providerId: string): boolean {
	const provider = getProvider(providerId);
	if (!provider || !key) return false;
	return key.startsWith(provider.apiKeyPrefix);
}

export function isModelValidForProvider(providerId: string, modelId: string): boolean {
	return getModelIds(providerId).includes(modelId);
}

export function getDefaultModelForProvider(providerId: string): string {
	const provider = getProvider(providerId);
	return provider?.defaultModel || '';
}

export function isFreeProvider(providerId: string): boolean {
	const provider = getProvider(providerId);
	if (!provider) return false;
	// A provider is considered free if all its models have 0 cost
	return provider.models.every(
		(model) => model.inputCostPer1kTokens === 0 && model.outputCostPer1kTokens === 0
	);
}
