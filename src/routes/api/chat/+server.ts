import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { toolsRegistry } from '$lib/tools/index.js';
import {
	GROQ_API_KEY,
	OPENAI_API_KEY,
	ANTHROPIC_API_KEY,
	AI_PROVIDER,
	AI_MODEL
} from '$env/static/private';

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

// Provider configuration with fallback defaults
const CONFIG = {
	provider: (AI_PROVIDER || 'groq').toLowerCase() as 'groq' | 'openai' | 'anthropic',
	model: AI_MODEL || getDefaultModel((AI_PROVIDER || 'groq').toLowerCase())
};

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

function createProvider() {
	switch (CONFIG.provider) {
		case 'groq':
			if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
				throw new Error('Groq API key not configured');
			}
			return createGroq({ apiKey: GROQ_API_KEY });

		case 'openai':
			if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
				throw new Error('OpenAI API key not configured');
			}
			return createOpenAI({ apiKey: OPENAI_API_KEY });

		case 'anthropic':
			if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
				throw new Error('Anthropic API key not configured');
			}
			return createAnthropic({ apiKey: ANTHROPIC_API_KEY });

		default:
			throw new Error(`Unsupported provider: ${CONFIG.provider}`);
	}
}

function getProviderStatus() {
	const status = {
		provider: CONFIG.provider,
		model: CONFIG.model,
		available: false,
		error: null as string | null
	};

	try {
		createProvider();
		status.available = true;
	} catch (error) {
		status.error = error instanceof Error ? error.message : 'Unknown error';
	}

	return status;
}

export async function POST({ request }: { request: Request }) {
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

	try {
		debugLog(`[${requestId}] Incoming chat request`, {
			provider: CONFIG.provider,
			model: CONFIG.model
		});

		const { messages, model: requestModel } = await request.json();

		// Allow model override from request
		const selectedModel = requestModel || CONFIG.model;

		debugLog(`[${requestId}] Parsed request body`, {
			messageCount: messages.length,
			selectedModel,
			lastMessage: messages[messages.length - 1]
		});

		// Handle health check requests
		if (messages.length === 1 && messages[0].content === 'health-check') {
			debugLog(`[${requestId}] Health check request - checking provider availability`);

			const status = getProviderStatus();

			if (!status.available) {
				debugLog(`[${requestId}] Provider not available: ${status.error}`);
				return new Response(
					JSON.stringify({
						error: status.error,
						available: false,
						provider: status.provider,
						model: status.model
					}),
					{
						status: 503,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			return new Response(
				JSON.stringify({
					status: 'ok',
					available: true,
					provider: status.provider,
					model: status.model
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Create provider instance
		let provider;
		try {
			provider = createProvider();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Provider configuration error';
			debugLog(`[${requestId}] Provider creation failed: ${errorMessage}`);

			return new Response(
				JSON.stringify({
					error: `Server AI provider not configured: ${errorMessage}. Please configure your own API key.`,
					provider: CONFIG.provider,
					model: selectedModel
				}),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		debugLog(`[${requestId}] Available tools`, Object.keys(toolsRegistry));

		// Attempt to create the AI model and handle potential model validation errors
		let result;
		try {
			result = streamText({
				model: provider(selectedModel),
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
						provider: CONFIG.provider,
						model: selectedModel
					});
				}
			});
		} catch (modelError) {
			const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
			debugLog(`[${requestId}] Model creation/validation failed`, {
				error: errorMessage,
				provider: CONFIG.provider,
				model: selectedModel
			});

			// Check if it's a model-related error and provide helpful feedback
			if (
				errorMessage.toLowerCase().includes('model') ||
				errorMessage.toLowerCase().includes('not found') ||
				errorMessage.toLowerCase().includes('invalid') ||
				errorMessage.toLowerCase().includes('unsupported')
			) {
				return new Response(
					JSON.stringify({
						error: `Model "${selectedModel}" is not supported by ${CONFIG.provider}. Please check the model name or try a different model.`,
						details: errorMessage,
						provider: CONFIG.provider,
						model: selectedModel,
						suggestion: `Visit the ${CONFIG.provider} documentation to see available models, or use the server configuration to select a supported model.`
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			// Re-throw other errors to be handled by the general error handler
			throw modelError;
		}

		debugLog(`[${requestId}] Streaming response started`);

		return result.toDataStreamResponse();
	} catch (error) {
		debugLog(`[${requestId}] Error occurred`, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			provider: CONFIG.provider,
			model: CONFIG.model
		});

		console.error('Chat API error:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				provider: CONFIG.provider,
				model: CONFIG.model
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}
