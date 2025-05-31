import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { toolsRegistry } from '$lib/tools/index.js';
import { GROQ_API_KEY } from '$env/static/private';

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

const groq = createGroq({
	apiKey: GROQ_API_KEY
});

export async function POST({ request }: { request: Request }) {
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

	try {
		debugLog(`[${requestId}] Incoming chat request`);

		const { messages } = await request.json();

		debugLog(`[${requestId}] Parsed request body`, {
			messageCount: messages.length,
			lastMessage: messages[messages.length - 1]
		});

		// Handle health check requests
		if (messages.length === 1 && messages[0].content === 'health-check') {
			debugLog(`[${requestId}] Health check request - checking API key availability`);

			if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
				debugLog(`[${requestId}] No valid API key configured`);
				return new Response(
					JSON.stringify({
						error: 'Server API key not configured',
						available: false
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
					available: true
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Check if API key is available for actual chat requests
		if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
			debugLog(`[${requestId}] No valid API key configured for chat request`);
			return new Response(
				JSON.stringify({
					error: 'Server API key not configured. Please configure your own API key.'
				}),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		debugLog(`[${requestId}] Available tools`, Object.keys(toolsRegistry));

		const result = streamText({
			model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
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
					steps: result.steps?.length
				});
			}
		});

		debugLog(`[${requestId}] Streaming response started`);

		return result.toDataStreamResponse();
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
