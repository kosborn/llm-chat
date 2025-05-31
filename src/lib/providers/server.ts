// Server-side provider utilities for AI chat application
// This file provides server-specific functionality for the provider system

import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
	GROQ_API_KEY,
	ANTHROPIC_API_KEY,
	OPENAI_API_KEY,
	GOOGLE_API_KEY
} from '$env/static/private';
import { PROVIDERS, getProviderByPriority, type ProviderId } from './index.js';

// Provider instance cache
const providerInstances = new Map<string, any>();

export function getProviderInstance(providerId: string) {
	if (providerInstances.has(providerId)) {
		return providerInstances.get(providerId);
	}

	let instance;
	switch (providerId) {
		case 'groq':
			instance = createGroq({ apiKey: GROQ_API_KEY });
			break;
		case 'anthropic':
			instance = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
			break;
		case 'openai':
			instance = createOpenAI({ apiKey: OPENAI_API_KEY });
			break;
		case 'google':
			instance = createGoogleGenerativeAI({ apiKey: GOOGLE_API_KEY });
			break;
		default:
			throw new Error(`Unsupported provider: ${providerId}`);
	}

	providerInstances.set(providerId, instance);
	return instance;
}

export function getAvailableProviders(): ProviderId[] {
	const providers: ProviderId[] = [];

	if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
		providers.push('groq');
	}
	if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
		providers.push('anthropic');
	}
	if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
		providers.push('openai');
	}
	if (GOOGLE_API_KEY && GOOGLE_API_KEY !== 'your_google_api_key_here') {
		providers.push('google');
	}

	return providers;
}

export function getDefaultModels(): Record<string, string> {
	const defaultModels: Record<string, string> = {};

	Object.values(PROVIDERS).forEach((provider) => {
		defaultModels[provider.id] = provider.defaultModel;
	});

	return defaultModels;
}

export function selectBestAvailableProvider(requestedProvider?: string): ProviderId | null {
	const availableProviders = getAvailableProviders();

	if (availableProviders.length === 0) {
		return null;
	}

	// If a specific provider was requested and it's available, use it
	if (requestedProvider && availableProviders.includes(requestedProvider as ProviderId)) {
		return requestedProvider as ProviderId;
	}

	// Otherwise, return the highest priority available provider
	const sortedProviders = getProviderByPriority();
	for (const provider of sortedProviders) {
		if (availableProviders.includes(provider.id as ProviderId)) {
			return provider.id as ProviderId;
		}
	}

	// Fallback to first available
	return availableProviders[0];
}

export function getFallbackProvider(currentProvider: string): ProviderId | null {
	const availableProviders = getAvailableProviders().filter((p) => p !== currentProvider);
	return (
		selectBestAvailableProvider() || (availableProviders.length > 0 ? availableProviders[0] : null)
	);
}

export interface EnvironmentStatus {
	providers: Record<
		ProviderId,
		{
			hasKey: boolean;
			isValid: boolean;
			keyPrefix?: string;
			displayName: string;
		}
	>;
	summary: {
		totalProviders: number;
		availableProviders: number;
		configuredKeys: number;
		validKeys: number;
	};
}

export function getEnvironmentStatus(): EnvironmentStatus {
	const providerStatus: Record<ProviderId, any> = {};
	let configuredKeys = 0;
	let validKeys = 0;

	// Check Groq
	const groqHasKey = !!GROQ_API_KEY;
	const groqIsValid = groqHasKey && GROQ_API_KEY !== 'your_groq_api_key_here';
	if (groqHasKey) configuredKeys++;
	if (groqIsValid) validKeys++;
	providerStatus.groq = {
		hasKey: groqHasKey,
		isValid: groqIsValid,
		keyPrefix: groqIsValid ? GROQ_API_KEY.substring(0, 8) + '...' : undefined,
		displayName: PROVIDERS.groq.displayName
	};

	// Check Anthropic
	const anthropicHasKey = !!ANTHROPIC_API_KEY;
	const anthropicIsValid = anthropicHasKey && ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
	if (anthropicHasKey) configuredKeys++;
	if (anthropicIsValid) validKeys++;
	providerStatus.anthropic = {
		hasKey: anthropicHasKey,
		isValid: anthropicIsValid,
		keyPrefix: anthropicIsValid ? ANTHROPIC_API_KEY.substring(0, 8) + '...' : undefined,
		displayName: PROVIDERS.anthropic.displayName
	};

	// Check OpenAI
	const openaiHasKey = !!OPENAI_API_KEY;
	const openaiIsValid = openaiHasKey && OPENAI_API_KEY !== 'your_openai_api_key_here';
	if (openaiHasKey) configuredKeys++;
	if (openaiIsValid) validKeys++;
	providerStatus.openai = {
		hasKey: openaiHasKey,
		isValid: openaiIsValid,
		keyPrefix: openaiIsValid ? OPENAI_API_KEY.substring(0, 8) + '...' : undefined,
		displayName: PROVIDERS.openai.displayName
	};

	// Check Google
	const googleHasKey = !!GOOGLE_API_KEY;
	const googleIsValid = googleHasKey && GOOGLE_API_KEY !== 'your_google_api_key_here';
	if (googleHasKey) configuredKeys++;
	if (googleIsValid) validKeys++;
	providerStatus.google = {
		hasKey: googleHasKey,
		isValid: googleIsValid,
		keyPrefix: googleIsValid ? GOOGLE_API_KEY.substring(0, 8) + '...' : undefined,
		displayName: PROVIDERS.google.displayName
	};

	const availableProviders = getAvailableProviders();

	return {
		providers: providerStatus,
		summary: {
			totalProviders: Object.keys(PROVIDERS).length,
			availableProviders: availableProviders.length,
			configuredKeys,
			validKeys
		}
	};
}

export function getRequiredEnvironmentVariables(): string[] {
	return ['GROQ_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY'];
}
