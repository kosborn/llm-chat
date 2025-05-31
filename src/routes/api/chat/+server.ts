import { streamText } from 'ai';
import { toolsRegistry } from '$lib/tools/index.js';
import {
	getProviderInstance,
	getAvailableProviders,
	getDefaultModels,
	selectBestAvailableProvider,
	getFallbackProvider
} from '$lib/providers/server.js';
import { getDefaultModelForProvider } from '$lib/providers/index.js';

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
					defaultModels: getDefaultModels()
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
		const selectedProvider = selectBestAvailableProvider(provider);
		if (!selectedProvider) {
			throw new Error('No available providers');
		}

		let selectedModel = model;
		if (!selectedModel) {
			selectedModel = getDefaultModelForProvider(selectedProvider);
		}

		if (provider && provider !== selectedProvider) {
			debugLog(`[${requestId}] Provider ${provider} not available, using ${selectedProvider}`);
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
			const fallbackProvider = getFallbackProvider(selectedProvider);

			if (fallbackProvider) {
				const fallbackModel = getDefaultModelForProvider(fallbackProvider);

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
