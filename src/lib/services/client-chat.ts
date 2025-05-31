import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { apiKeyStore } from '$lib/stores/api-key-store.svelte.js';
import { networkStore } from '$lib/stores/network-store.svelte.js';
import { debugStore } from '$lib/stores/debug-store.svelte.js';
import type { ChatMessage, ApiUsageMetadata } from '../../app.d.ts';

interface ChatResponse {
	success: boolean;
	stream?: ReadableStream;
	error?: string;
	apiMetadata?: ApiUsageMetadata;
}

class ClientChatService {
	async sendMessage(
		messages: ChatMessage[],
		provider?: 'groq' | 'openai' | 'anthropic',
		model?: string
	): Promise<ChatResponse> {
		// Check network status first
		if (!networkStore.isOnline) {
			return {
				success: false,
				error: 'You are currently offline. Messages will be queued and sent when you reconnect.'
			};
		}

		// Try server-side first
		try {
			return await this.sendMessageServerSide(messages, provider, model);
		} catch (error) {
			console.log('Server unavailable, falling back to client-side:', error);
		}

		// Fallback to client-side
		return this.sendMessageClientSide(messages, provider, model);
	}

	private async sendMessageServerSide(
		messages: ChatMessage[],
		provider?: 'groq' | 'openai' | 'anthropic',
		model?: string
	): Promise<ChatResponse> {
		// Convert messages to the format expected by the server
		const outboundMessages = messages.map((msg) => ({
			role: msg.role,
			content: msg.content
		}));

		debugStore.addApiMetrics({
			provider: provider || 'server',
			model: model || 'default'
		});

		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messages: outboundMessages,
				provider,
				model
			})
		});

		if (!response.ok) {
			throw new Error(`Server error: ${response.status}`);
		}

		if (!response.body) {
			throw new Error('No response body');
		}

		return {
			success: true,
			stream: response.body
		};
	}

	private async sendMessageClientSide(
		messages: ChatMessage[],
		provider?: 'groq' | 'openai' | 'anthropic',
		model?: string
	): Promise<ChatResponse> {
		// Use provided provider/model or fall back to API key store
		const effectiveProvider = provider || apiKeyStore.provider;
		const effectiveModel = model || apiKeyStore.getModelForProvider();

		// Check if we have an API key
		if (!apiKeyStore.isConfigured) {
			return {
				success: false,
				error:
					'Server AI is unavailable and no API key is configured. Please set up your API key in the settings to continue chatting.'
			};
		}

		// Validate the API key format
		const apiKey = apiKeyStore.getApiKey();
		if (!apiKey || !apiKeyStore.validateApiKey(apiKey)) {
			return {
				success: false,
				error: `Server AI is unavailable and your ${apiKeyStore.getProviderName()} API key format is invalid. Please check your API key in settings.`
			};
		}

		const startTime = Date.now();
		const currentProvider = effectiveProvider;
		const currentModel = effectiveModel;

		try {
			const provider = this.createProvider(apiKey, effectiveProvider);
			const model = provider(currentModel);

			// Convert ChatMessage format to AI SDK format
			const aiMessages = messages.map((msg) => ({
				role: msg.role as 'user' | 'assistant' | 'system',
				content: msg.content
			}));

			// Log outbound message to debug store
			debugStore.logOutboundMessage(aiMessages, 'client', {
				provider: currentProvider,
				model: currentModel
			});

			// Log API request
			debugStore.logApiRequest({
				provider: currentProvider,
				model: currentModel,
				messages: aiMessages.length,
				timestamp: startTime
			});

			const result = streamText({
				model,
				messages: aiMessages,
				temperature: 0.7,
				maxSteps: 5
			});

			const responseTime = Date.now() - startTime;

			// Create API metadata
			const apiMetadata: ApiUsageMetadata = {
				model: currentModel,
				provider: currentProvider,
				responseTime,
				timestamp: Date.now()
			};

			// Log API metadata to debug store
			debugStore.logApiMetadata({
				model: currentModel,
				provider: currentProvider,
				responseTime
			});

			return {
				success: true,
				stream: result.toDataStream(),
				apiMetadata
			};
		} catch (error) {
			console.error('Client chat error:', error);

			// Provide more specific error messages
			let errorMessage = 'Failed to send message';
			if (error instanceof Error) {
				if (error.message.includes('401') || error.message.includes('unauthorized')) {
					errorMessage = 'Invalid API key. Please check your API key in settings.';
				} else if (error.message.includes('403') || error.message.includes('forbidden')) {
					errorMessage = 'API key does not have permission. Please check your API key permissions.';
				} else if (error.message.includes('429')) {
					errorMessage = 'Rate limit exceeded. Please try again later.';
				} else if (error.message.includes('network') || error.message.includes('fetch')) {
					errorMessage = 'Network error. Please check your internet connection.';
				} else {
					errorMessage = error.message;
				}
			}

			return {
				success: false,
				error: errorMessage
			};
		}
	}

	private createProvider(apiKey: string, provider?: 'groq' | 'openai' | 'anthropic') {
		const effectiveProvider = provider || apiKeyStore.provider;
		switch (effectiveProvider) {
			case 'groq':
				return createGroq({ apiKey });
			case 'openai':
				return createOpenAI({ apiKey });
			case 'anthropic':
				return createAnthropic({ apiKey });
			default:
				throw new Error(`Unsupported provider: ${effectiveProvider}`);
		}
	}

	async generateTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
		// Check network status first
		if (!networkStore.isOnline) {
			return null;
		}

		// Try server-side first
		try {
			const serverTitle = await this.tryServerSideTitle(userMessage, assistantMessage);
			if (serverTitle) {
				return serverTitle;
			}
		} catch (error) {
			console.log('Server-side title generation unavailable, falling back to client-side:', error);
		}

		// Fallback to client-side
		return this.generateTitleClientSide(userMessage, assistantMessage);
	}

	private async tryServerSideTitle(
		userMessage: string,
		assistantMessage: string
	): Promise<string | null> {
		const response = await fetch('/api/generate-title', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userMessage,
				assistantMessage
			})
		});

		if (!response.ok) {
			throw new Error(`Server error: ${response.status}`);
		}

		const data = await response.json();
		return data.title || null;
	}

	private async generateTitleClientSide(
		userMessage: string,
		assistantMessage: string
	): Promise<string | null> {
		// Check if we have an API key for client-side
		if (!apiKeyStore.isConfigured) {
			return null;
		}

		try {
			const apiKey = apiKeyStore.getApiKey();
			if (!apiKey) return null;

			const provider = this.createProvider(apiKey);
			const model = provider(apiKeyStore.getModelForProvider());

			const result = await streamText({
				model,
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

			// Get the full text from the stream
			let title = '';
			const reader = result.toDataStream().getReader();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = new TextDecoder().decode(value);
					const lines = chunk.split('\n');

					for (const line of lines) {
						if (line.startsWith('0:')) {
							const textData = line.substring(2);
							try {
								const parsed = JSON.parse(textData);
								title += parsed;
							} catch {
								// Ignore parsing errors
							}
						}
					}
				}
			} finally {
				reader.releaseLock();
			}

			return title.trim() || null;
		} catch (error) {
			console.error('Client-side title generation error:', error);
			return null;
		}
	}

	canSendMessages(): boolean {
		// Can't send if offline
		if (!networkStore.isOnline) {
			return false;
		}

		// If online, we can always try (server-side first, then client-side with API key)
		return true;
	}

	getStatusMessage(): string {
		if (!networkStore.isOnline) {
			return "📴 You're offline. Messages will be queued and sent when you reconnect.";
		}

		// When online, we can always try server-side first
		return '🚀 Ready to chat';
	}

	// New method to get detailed status for UI
	getDetailedStatus(): {
		canSend: boolean;
		hasApiKey: boolean;
		isOnline: boolean;
		isValidApiKey: boolean;
		provider: string;
		model: string;
		queuedCount: number;
	} {
		const apiKey = apiKeyStore.getApiKey();
		const hasApiKey = apiKeyStore.isConfigured;
		const isValidApiKey = hasApiKey && apiKey !== null && apiKeyStore.validateApiKey(apiKey);

		return {
			canSend: this.canSendMessages(),
			hasApiKey,
			isOnline: networkStore.isOnline,
			isValidApiKey,
			provider: apiKeyStore.getProviderName(),
			model: apiKeyStore.getModelForProvider(),
			queuedCount: 0 // Will be updated by the component
		};
	}

	// Get API usage statistics
	getApiUsageStats() {
		return debugStore.getApiMetrics();
	}
}

export const clientChatService = new ClientChatService();
