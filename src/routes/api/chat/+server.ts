import { streamText } from 'ai';
import { toolsRegistry } from '$lib/tools/index.js';
import {
	getProviderInstance,
	getAvailableProviders,
	getDefaultModels,
	selectBestAvailableProvider,
	getFallbackProvider,
	getEnvironmentStatus,
	getRequiredEnvironmentVariables
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

		const {
			messages,
			provider,
			model,
			mentionedTools = [],
			enabledTools = []
		} = await request.json();

		debugLog(`[${requestId}] Parsed request body`, {
			messageCount: messages.length,
			provider,
			model,
			mentionedTools,
			enabledTools,
			lastMessage: messages[messages.length - 1]
		});

		// Handle health check requests
		if (messages.length === 1 && messages[0].content === 'health-check') {
			const availableProviders = getAvailableProviders();
			const defaultModels = getDefaultModels();
			const timestamp = new Date().toISOString();
			const uptime = process.uptime();
			const memoryUsage = process.memoryUsage();

			debugLog(`[${requestId}] Health check request - System Status Check`, {
				timestamp,
				availableProviders: availableProviders.length,
				providerList: availableProviders,
				uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
				memoryUsage: {
					rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
					heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
					heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
				},
				nodeVersion: process.version,
				platform: process.platform
			});

			if (availableProviders.length === 0) {
				debugLog(`[${requestId}] Health check FAILED - No valid API keys configured`, {
					configuredProviders: 0,
					requiredEnvVars: getRequiredEnvironmentVariables(),
					envStatus: getEnvironmentStatus()
				});
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

			debugLog(`[${requestId}] Health check PASSED - System operational`, {
				providersAvailable: availableProviders.length,
				defaultModels: Object.keys(defaultModels).length,
				toolsRegistered: Object.keys(toolsRegistry).length,
				status: 'healthy'
			});

			// Return a simple success response for health checks
			return new Response(
				JSON.stringify({
					status: 'ok',
					available: true,
					providers: availableProviders,
					defaultModels: defaultModels,
					timestamp,
					uptime: Math.floor(uptime),
					toolsCount: Object.keys(toolsRegistry).length
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
			debugLog(`[${requestId}] Chat request FAILED - No valid API keys configured`, {
				messageCount: messages.length,
				requestedProvider: provider,
				requestedModel: model,
				envStatus: getEnvironmentStatus(),
				requiredEnvVars: getRequiredEnvironmentVariables()
			});
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
			debugLog(
				`[${requestId}] Provider fallback - requested ${provider} not available, using ${selectedProvider}`,
				{
					requestedProvider: provider,
					selectedProvider,
					availableProviders,
					reason: 'provider_not_available'
				}
			);
		}

		// Build effective tools registry from client-provided enabled tools
		let effectiveToolsRegistry: Record<string, any> = {};

		// Start with only enabled tools from client
		for (const toolName of enabledTools) {
			if (toolsRegistry[toolName]) {
				effectiveToolsRegistry[toolName] = toolsRegistry[toolName];
			}
		}

		debugLog(`[${requestId}] Server tools before processing`, {
			clientEnabledTools: enabledTools,
			effectiveTools: Object.keys(effectiveToolsRegistry),
			mentionedTools
		});

		if (mentionedTools && mentionedTools.length > 0) {
			// Add mentioned tools even if they're not in the enabled list
			for (const toolName of mentionedTools) {
				if (toolsRegistry[toolName] && !effectiveToolsRegistry[toolName]) {
					effectiveToolsRegistry[toolName] = toolsRegistry[toolName];
				}
			}
			debugLog(`[${requestId}] Added mentioned tools to registry`, {
				mentionedTools,
				finalTools: Object.keys(effectiveToolsRegistry)
			});
		}

		debugLog(`[${requestId}] Chat session initialized`, {
			provider: selectedProvider,
			model: selectedModel,
			messageCount: messages.length,
			mentionedTools,
			availableTools: Object.keys(effectiveToolsRegistry).length,
			toolNames: Object.keys(effectiveToolsRegistry),
			temperature: 0.7,
			maxSteps: 5
		});

		try {
			const providerInstance = getProviderInstance(selectedProvider);
			const modelInstance = providerInstance(selectedModel);

			const result = streamText({
				model: modelInstance,
				messages,
				tools: effectiveToolsRegistry as any,
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
				error: providerError instanceof Error ? providerError.message : String(providerError),
				stack:
					providerError instanceof Error
						? providerError.stack?.split('\n').slice(0, 3).join('\n')
						: undefined,
				provider: selectedProvider,
				model: selectedModel,
				messageCount: messages.length,
				errorType:
					providerError instanceof Error ? providerError.constructor.name : typeof providerError,
				timestamp: new Date().toISOString()
			});

			// Try fallback to next available provider
			const fallbackProvider = getFallbackProvider(selectedProvider);

			if (fallbackProvider) {
				const fallbackModel = getDefaultModelForProvider(fallbackProvider);

				debugLog(`[${requestId}] Attempting fallback provider`, {
					originalProvider: selectedProvider,
					fallbackProvider,
					fallbackModel,
					availableProviders,
					attempt: 'fallback'
				});

				try {
					const fallbackProviderInstance = getProviderInstance(fallbackProvider);
					const fallbackModelInstance = fallbackProviderInstance(fallbackModel);

					const result = streamText({
						model: fallbackModelInstance,
						messages,
						tools: effectiveToolsRegistry as any,
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
					debugLog(`[${requestId}] Fallback provider also failed - no more providers available`, {
						error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
						stack:
							fallbackError instanceof Error
								? fallbackError.stack?.split('\n').slice(0, 3).join('\n')
								: undefined,
						originalProvider: selectedProvider,
						fallbackProvider,
						fallbackModel,
						errorType:
							fallbackError instanceof Error
								? fallbackError.constructor.name
								: typeof fallbackError,
						allProvidersFailed: true,
						timestamp: new Date().toISOString()
					});
					throw fallbackError;
				}
			} else {
				throw providerError;
			}
		}
	} catch (error) {
		debugLog(`[${requestId}] Critical error in chat endpoint`, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
			errorType: error instanceof Error ? error.constructor.name : typeof error,
			requestData: {
				messageCount: messages?.length || 0,
				provider: provider || 'none',
				model: model || 'none'
			},
			systemInfo: {
				memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
				uptime: `${Math.floor(process.uptime())}s`
			},
			timestamp: new Date().toISOString()
		});

		console.error('Chat API error:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
