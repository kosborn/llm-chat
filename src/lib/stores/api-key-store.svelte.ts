import { browser } from '$app/environment';

interface ApiKeys {
	groq?: string;
	openai?: string;
	anthropic?: string;
}

class ApiKeyStore {
	apiKeys = $state<ApiKeys>({});
	isConfigured = $state(false);
	provider = $state<'groq' | 'openai' | 'anthropic'>('groq');

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	private loadFromStorage(): void {
		try {
			const storedKeys = localStorage.getItem('ai-chat-api-keys');
			const storedProvider = localStorage.getItem('ai-chat-provider') as
				| 'groq'
				| 'openai'
				| 'anthropic';

			if (storedKeys) {
				this.apiKeys = JSON.parse(storedKeys);
				this.updateConfiguredState();
			}

			if (storedProvider) {
				this.provider = storedProvider;
			}
		} catch (error) {
			console.warn('Failed to load API keys from storage:', error);
		}
	}

	private updateConfiguredState(): void {
		this.isConfigured = Object.values(this.apiKeys).some((key) => !!key);
	}

	setApiKey(key: string, provider: 'groq' | 'openai' | 'anthropic'): void {
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

	clearApiKey(provider?: 'groq' | 'openai' | 'anthropic'): void {
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

	getApiKey(provider?: 'groq' | 'openai' | 'anthropic'): string | null {
		const targetProvider = provider || this.provider;
		return this.apiKeys[targetProvider] || null;
	}

	hasApiKey(provider: 'groq' | 'openai' | 'anthropic'): boolean {
		return !!this.apiKeys[provider];
	}

	validateApiKey(key: string, provider?: 'groq' | 'openai' | 'anthropic'): boolean {
		if (!key || key.trim().length === 0) {
			return false;
		}

		const targetProvider = provider || this.provider;

		// Basic validation based on provider
		switch (targetProvider) {
			case 'groq':
				return key.startsWith('gsk_');
			case 'openai':
				return key.startsWith('sk-');
			case 'anthropic':
				return key.startsWith('sk-ant-');
			default:
				return key.length > 10; // Basic length check
		}
	}

	getProviderName(provider?: 'groq' | 'openai' | 'anthropic'): string {
		const targetProvider = provider || this.provider;
		switch (targetProvider) {
			case 'groq':
				return 'Groq';
			case 'openai':
				return 'OpenAI';
			case 'anthropic':
				return 'Anthropic';
			default:
				return 'Unknown';
		}
	}

	getModelForProvider(provider?: 'groq' | 'openai' | 'anthropic'): string {
		const targetProvider = provider || this.provider;
		switch (targetProvider) {
			case 'groq':
				return 'llama-3.1-70b-versatile';
			case 'openai':
				return 'gpt-4o-mini';
			case 'anthropic':
				return 'claude-3-5-sonnet-20241022';
			default:
				return 'llama-3.1-70b-versatile';
		}
	}

	getAvailableProviders(): Array<'groq' | 'openai' | 'anthropic'> {
		return (Object.keys(this.apiKeys) as Array<'groq' | 'openai' | 'anthropic'>).filter(
			(provider) => !!this.apiKeys[provider]
		);
	}

	getConfiguredProviderCount(): number {
		return this.getAvailableProviders().length;
	}
}

export const apiKeyStore = new ApiKeyStore();
