import { generateText } from 'ai';
import {
	getProviderInstance,
	getAvailableProviders,
	selectBestAvailableProvider,
	getFallbackProvider
} from '$lib/providers/server.js';
import { getDefaultModelForProvider } from '$lib/providers/index.js';

export async function POST({ request }: { request: Request }) {
	try {
		const { userMessage, assistantMessage, provider, model } = await request.json();

		// Filter out empty messages
		if (!userMessage?.trim() || !assistantMessage?.trim()) {
			return new Response(
				JSON.stringify({ error: 'Both user and assistant messages must have content' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

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
		const selectedProvider = selectBestAvailableProvider(provider);
		if (!selectedProvider) {
			throw new Error('No available providers');
		}

		let selectedModel = model;
		if (!selectedModel) {
			selectedModel = getDefaultModelForProvider(selectedProvider);
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
			const fallbackProvider = getFallbackProvider(selectedProvider);

			if (fallbackProvider) {
				const fallbackModel = getDefaultModelForProvider(fallbackProvider);

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
