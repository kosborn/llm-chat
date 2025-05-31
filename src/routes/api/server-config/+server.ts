import { json } from '@sveltejs/kit';
import {
	AI_PROVIDER,
	AI_MODEL,
	GROQ_API_KEY,
	OPENAI_API_KEY,
	ANTHROPIC_API_KEY
} from '$env/static/private';
import {
	getSupportedModels,
	getModelDisplayName,
	getProviderDisplayName
} from '$lib/utils/cost-calculator.js';

// Get current server configuration
export async function GET() {
	const provider = (AI_PROVIDER || 'groq').toLowerCase();
	const model = AI_MODEL || getDefaultModel(provider);

	const config = {
		provider,
		model,
		supportedProviders: ['groq', 'openai', 'anthropic'],
		availableModels: {
			groq: getSupportedModels('groq'),
			openai: getSupportedModels('openai'),
			anthropic: getSupportedModels('anthropic')
		},
		providerStatus: getProviderStatus(),
		displayNames: {
			provider: getProviderDisplayName(provider),
			model: getModelDisplayName(provider, model)
		}
	};

	return json(config);
}

// Update server configuration (for development/testing)
export async function POST({ request }) {
	try {
		const { provider, model } = await request.json();

		if (!provider) {
			return json({ error: 'Provider is required' }, { status: 400 });
		}

		if (!['groq', 'openai', 'anthropic'].includes(provider)) {
			return json({ error: 'Invalid provider' }, { status: 400 });
		}

		// Allow any model name - let the provider API validate it at runtime
		// This enables support for new models and custom fine-tuned models

		// Note: This endpoint returns the configuration but cannot actually update
		// environment variables at runtime. For production, update .env.local file.
		return json({
			message: 'Configuration validated. Update your .env.local file with these values:',
			config: {
				AI_PROVIDER: provider,
				AI_MODEL: model || getDefaultModel(provider)
			},
			instructions: [
				'1. Stop your development server',
				'2. Update .env.local with the new AI_PROVIDER and AI_MODEL values',
				'3. Add the appropriate API key for your chosen provider',
				'4. Restart your development server',
				'Note: If you use a custom model, the provider API will validate it at runtime'
			]
		});
	} catch (error) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
}

function getDefaultModel(provider: string): string {
	switch (provider) {
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

function getProviderStatus() {
	const status = {
		groq: {
			configured: !!(GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here'),
			keyFormat: 'gsk_...'
		},
		openai: {
			configured: !!(OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here'),
			keyFormat: 'sk-...'
		},
		anthropic: {
			configured: !!(ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here'),
			keyFormat: 'sk-ant-...'
		}
	};

	return status;
}
