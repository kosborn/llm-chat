import { browser } from '$app/environment';
import {
	getProvider,
	getAllProviders,
	getDefaultProvider,
	validateApiKey as validateProviderApiKey,
	getDefaultModelForProvider,
	getProviderIds,
	type ProviderId
} from '$lib/providers';

interface ApiKeys {
	[key: string]: string | undefined;
}

class ApiKeyStore {
	apiKeys = $state<ApiKeys>({});
	isConfigured = $state(false);
	provider = $state<ProviderId>(getDefaultProvider().id as ProviderId);

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	private loadFromStorage(): void {
		try {
			const storedKeys = localStorage.getItem('ai-chat-api-keys');
			const storedProvider = localStorage.getItem('ai-chat-provider') as ProviderId;

			if (storedKeys) {
				this.apiKeys = JSON.parse(storedKeys);
				this.updateConfiguredState();
			}

			if (storedProvider && getProvider(storedProvider)) {
				this.provider = storedProvider;
			}
		} catch (error) {
			console.warn('Failed to load API keys from storage:', error);
		}
	}

	private updateConfiguredState(): void {
		this.isConfigured = Object.values(this.apiKeys).some((key) => !!key);
	}

	setApiKey(key: string, provider: ProviderId): void {
		if (!browser) return;

		try {
			this.apiKeys = {
				...this.apiKeys,
				[provider]: key
			};
			this.provider = provider;
			this.updateConfiguredState();

			localStorage.setItem('ai-chat-api-keys', JSON.stringify(this.apiKeys));
			localStorage.setItem('ai-chat-provider', provider);
		} catch (error) {
			console.error('Failed to save API key:', error);
		}
	}

	clearApiKey(provider?: ProviderId): void {
		if (provider) {
			this.setApiKey('', provider);
		} else {
			this.apiKeys = {};
			this.updateConfiguredState();
			if (browser) {
				localStorage.removeItem('ai-chat-api-keys');
			}
		}
	}

	getApiKey(provider?: ProviderId): string | null {
		const targetProvider = provider || this.provider;
		return this.apiKeys[targetProvider] || null;
	}

	hasApiKey(provider: ProviderId): boolean {
		return !!this.apiKeys[provider];
	}

	validateApiKey(key: string, provider?: ProviderId): boolean {
		if (!key || key.trim().length === 0) {
			return false;
		}

		const targetProvider = provider || this.provider;
		return validateProviderApiKey(key, targetProvider);
	}

	getProviderName(provider?: ProviderId): string {
		const targetProvider = provider || this.provider;
		const providerConfig = getProvider(targetProvider);
		return providerConfig?.displayName || 'Unknown Provider';
	}

	getModelForProvider(provider?: ProviderId): string {
		const targetProvider = provider || this.provider;
		return getDefaultModelForProvider(targetProvider) || getDefaultProvider().defaultModel;
	}

	getAvailableProviders(): ProviderId[] {
		return getProviderIds().filter((provider) => !!this.apiKeys[provider]);
	}

	getConfiguredProviderCount(): number {
		return this.getAvailableProviders().length;
	}
}

export const apiKeyStore = new ApiKeyStore();
