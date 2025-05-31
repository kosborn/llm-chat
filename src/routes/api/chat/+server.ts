import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { toolsRegistry } from '$lib/tools/index.js';
import { GROQ_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY } from '$env/static/private';

// Debug logging utility for server-side debugging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
	if (DEBUG_MODE) {
		console.log(
			`[DEBUG] ${new Date().toISOString()} - ${message}`,
			data ? JSON.stringify(data, null, 2) : ''
		);
	}
}

// Provider instances
const groq = createGroq({ apiKey: GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

// Default models for each provider
const DEFAULT_MODELS = {
	groq: 'llama-3.1-70b-versatile',
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
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

	try {
		debugLog(`[${requestId}] Incoming chat request`);

		const { messages, provider, model } = await request.json();

		debugLog(`[${requestId}] Parsed request body`, {
			messageCount: messages.length,
			provider,
			model,
			lastMessage: messages[messages.length - 1]
		});

		// Handle health check requests
		if (messages.length === 1 && messages[0].content === 'health-check') {
			debugLog(`[${requestId}] Health check request - checking API key availability`);

			const availableProviders = getAvailableProviders();

			if (availableProviders.length === 0) {
				debugLog(`[${requestId}] No valid API keys configured`);
				return new Response(
					JSON.stringify({
						error: 'Server API keys not configured',
						available: false,
						providers: []
					}),
					{
						status: 503,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			// Return a simple success response for health checks
			return new Response(
				JSON.stringify({
					status: 'ok',
					available: true,
					providers: availableProviders,
					defaultModels: DEFAULT_MODELS
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const availableProviders = getAvailableProviders();

		// Check if any API keys are available for actual chat requests
		if (availableProviders.length === 0) {
			debugLog(`[${requestId}] No valid API keys configured for chat request`);
			return new Response(
				JSON.stringify({
					error: 'Server API keys not configured. Please configure your own API key.'
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
			debugLog(`[${requestId}] Provider ${provider} not available, using ${selectedProvider}`);
		}

		// Set default model if not specified
		if (!selectedModel) {
			selectedModel = DEFAULT_MODELS[selectedProvider];
		}

		debugLog(`[${requestId}] Using provider: ${selectedProvider}, model: ${selectedModel}`);
		debugLog(`[${requestId}] Available tools`, Object.keys(toolsRegistry));

		try {
			const providerInstance = getProviderInstance(selectedProvider);
			const modelInstance = providerInstance(selectedModel);

			const result = streamText({
				model: modelInstance,
				messages,
				tools: toolsRegistry as any,
				maxSteps: 5,
				temperature: 0.7,
				onStepFinish: (step) => {
					debugLog(`[${requestId}] Step finished`, {
						stepType: step.stepType,
						text: step.text?.slice(0, 100) + (step.text && step.text.length > 100 ? '...' : ''),
						toolCalls: step.toolCalls?.map((tc) => ({
							toolName: tc.toolName,
							args: tc.args
						})),
						toolResults: step.toolResults?.map((tr) => ({
							toolCallId: tr.toolCallId,
							result: typeof tr.result === 'string' ? tr.result.slice(0, 100) + '...' : tr.result
						}))
					});
				},
				onFinish: (result) => {
					debugLog(`[${requestId}] Generation finished`, {
						finishReason: result.finishReason,
						usage: result.usage,
						steps: result.steps?.length,
						provider: selectedProvider,
						model: selectedModel
					});
				}
			});

			debugLog(`[${requestId}] Streaming response started`);

			return result.toDataStreamResponse({
				headers: {
					'X-Provider': selectedProvider,
					'X-Model': selectedModel
				}
			});
		} catch (providerError) {
			debugLog(`[${requestId}] Provider error with ${selectedProvider}`, {
				error: providerError instanceof Error ? providerError.message : String(providerError)
			});

			// Try fallback to next available provider
			const remainingProviders = availableProviders.filter((p) => p !== selectedProvider);

			if (remainingProviders.length > 0) {
				const fallbackProvider = remainingProviders.includes('groq')
					? 'groq'
					: remainingProviders.includes('anthropic')
						? 'anthropic'
						: remainingProviders[0];
				const fallbackModel = DEFAULT_MODELS[fallbackProvider];

				debugLog(`[${requestId}] Trying fallback provider: ${fallbackProvider}`);

				try {
					const fallbackProviderInstance = getProviderInstance(fallbackProvider);
					const fallbackModelInstance = fallbackProviderInstance(fallbackModel);

					const result = streamText({
						model: fallbackModelInstance,
						messages,
						tools: toolsRegistry as any,
						maxSteps: 5,
						temperature: 0.7,
						onFinish: (result) => {
							debugLog(`[${requestId}] Fallback generation finished`, {
								finishReason: result.finishReason,
								usage: result.usage,
								provider: fallbackProvider,
								model: fallbackModel
							});
						}
					});

					return result.toDataStreamResponse({
						headers: {
							'X-Provider': fallbackProvider,
							'X-Model': fallbackModel,
							'X-Fallback': 'true'
						}
					});
				} catch (fallbackError) {
					debugLog(`[${requestId}] Fallback provider also failed`, {
						error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
					});
					throw fallbackError;
				}
			} else {
				throw providerError;
			}
		}
	} catch (error) {
		debugLog(`[${requestId}] Error occurred`, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});

		console.error('Chat API error:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
