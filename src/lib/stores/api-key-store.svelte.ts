import { browser } from '$app/environment';

class ApiKeyStore {
	apiKey = $state<string | null>(null);
	isConfigured = $state(false);
	provider = $state<'groq' | 'openai' | 'anthropic'>('groq');

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem('ai-chat-api-key');
			const storedProvider = localStorage.getItem('ai-chat-provider') as
				| 'groq'
				| 'openai'
				| 'anthropic';

			if (stored) {
				this.apiKey = stored;
				this.isConfigured = true;
			}

			if (storedProvider) {
				this.provider = storedProvider;
			}
		} catch (error) {
			console.warn('Failed to load API key from storage:', error);
		}
	}

	setApiKey(key: string, provider: 'groq' | 'openai' | 'anthropic' = 'groq'): void {
		if (!browser) return;

		try {
			this.apiKey = key;
			this.provider = provider;
			this.isConfigured = !!key;

			if (key) {
				localStorage.setItem('ai-chat-api-key', key);
				localStorage.setItem('ai-chat-provider', provider);
			} else {
				localStorage.removeItem('ai-chat-api-key');
				localStorage.removeItem('ai-chat-provider');
			}
		} catch (error) {
			console.error('Failed to save API key:', error);
		}
	}

	clearApiKey(): void {
		this.setApiKey('');
	}

	getApiKey(): string | null {
		return this.apiKey;
	}

	validateApiKey(key: string): boolean {
		if (!key || key.trim().length === 0) {
			return false;
		}

		// Basic validation based on provider
		switch (this.provider) {
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

	getProviderName(): string {
		switch (this.provider) {
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

	getModelForProvider(): string {
		switch (this.provider) {
			case 'groq':
				return 'meta-llama/llama-4-scout-17b-16e-instruct';
			case 'openai':
				return 'gpt-4o-mini';
			case 'anthropic':
				return 'claude-3-haiku-20240307';
			default:
				return 'meta-llama/llama-4-scout-17b-16e-instruct';
		}
	}
}

export const apiKeyStore = new ApiKeyStore();
