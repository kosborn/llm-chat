import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { GROQ_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY } from '$env/static/private';

// Provider instances
const groq = createGroq({ apiKey: GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

// Default models for each provider
const DEFAULT_MODELS = {
	groq: 'llama-3.3-70b-versatile',
	anthropic: 'claude-3-5-sonnet-20241022',
	openai: 'gpt-4o-mini'
};

// Available API keys check
function getAvailableProviders(): string[] {
	const providers: string[] = [];

	if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
		providers.push('groq');
	}
	if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
		providers.push('anthropic');
	}
	if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
		providers.push('openai');
	}

	return providers;
}

function getProviderInstance(provider: string) {
	switch (provider) {
		case 'groq':
			return groq;
		case 'anthropic':
			return anthropic;
		case 'openai':
			return openai;
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

export async function POST({ request }: { request: Request }) {
	try {
		const { userMessage, assistantMessage, provider, model } = await request.json();

		const availableProviders = getAvailableProviders();

		// Check if any API keys are available
		if (availableProviders.length === 0) {
			return new Response(
				JSON.stringify({
					error: 'Server API keys not configured'
				}),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Determine provider and model to use
		let selectedProvider = provider || 'groq'; // Default to Groq
		let selectedModel = model;

		// If requested provider is not available, fall back to available ones
		if (!availableProviders.includes(selectedProvider)) {
			// Prefer Groq first, then Anthropic, then OpenAI
			if (availableProviders.includes('groq')) {
				selectedProvider = 'groq';
			} else if (availableProviders.includes('anthropic')) {
				selectedProvider = 'anthropic';
			} else {
				selectedProvider = availableProviders[0];
			}
		}

		// Set default model if not specified
		if (!selectedModel) {
			selectedModel = DEFAULT_MODELS[selectedProvider];
		}

		try {
			const providerInstance = getProviderInstance(selectedProvider);
			const modelInstance = providerInstance(selectedModel);

			const result = await generateText({
				model: modelInstance,
				messages: [
					{
						role: 'system',
						content:
							'Generate a concise, descriptive title (3-6 words) for this conversation. Return only the title, no quotes or extra text.'
					},
					{
						role: 'user',
						content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`
					}
				],
				temperature: 0.3,
				maxTokens: 50
			});

			// Get the text from the result
			const title = result.text.trim();

			return new Response(JSON.stringify({ title }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (providerError) {
			// Try fallback to next available provider
			const remainingProviders = availableProviders.filter((p) => p !== selectedProvider);

			if (remainingProviders.length > 0) {
				const fallbackProvider = remainingProviders.includes('groq')
					? 'groq'
					: remainingProviders.includes('anthropic')
						? 'anthropic'
						: remainingProviders[0];
				const fallbackModel = DEFAULT_MODELS[fallbackProvider];

				try {
					const fallbackProviderInstance = getProviderInstance(fallbackProvider);
					const fallbackModelInstance = fallbackProviderInstance(fallbackModel);

					const result = await generateText({
						model: fallbackModelInstance,
						messages: [
							{
								role: 'system',
								content:
									'Generate a concise, descriptive title (3-6 words) for this conversation. Return only the title, no quotes or extra text.'
							},
							{
								role: 'user',
								content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`
							}
						],
						temperature: 0.3,
						maxTokens: 50
					});

					const title = result.text.trim();

					return new Response(JSON.stringify({ title }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					});
				} catch (fallbackError) {
					throw fallbackError;
				}
			} else {
				throw providerError;
			}
		}
	} catch (error) {
		console.error('Title generation API error:', error);
		return new Response(JSON.stringify({ error: 'Failed to generate title' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
