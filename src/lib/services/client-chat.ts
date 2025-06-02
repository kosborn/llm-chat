import { streamText } from 'ai';
import { providerManager } from '$lib/providers/provider-manager.js';
import { networkStore } from '$lib/stores/network-store.svelte.js';
import { debugStore } from '$lib/stores/debug-store.svelte.js';
import { ToolMentionManager } from '$lib/utils/tool-mention-manager.js';
import { toolRegistry } from '$lib/tools/registry.js';
import { debugConsole } from '$lib/utils/console.js';
import type { ChatMessage, ApiUsageMetadata } from '../../app.d.ts';
import type { ProviderId } from '$lib/providers/index.js';

interface ChatResponse {
	success: boolean;
	stream?: ReadableStream;
	error?: string;
	apiMetadata?: ApiUsageMetadata;
}

class ClientChatService {
	async sendMessage(
		messages: ChatMessage[],
		provider?: string,
		model?: string,
		mentionedTools?: string[]
	): Promise<ChatResponse> {
		// Check network status first
		if (!networkStore.isOnline) {
			return {
				success: false,
				error: 'You are currently offline. Messages will be queued and sent when you reconnect.'
			};
		}

		// Use provider manager to determine best provider/model
		const requestedProvider = provider
			? (provider as ProviderId)
			: providerManager.getCurrentProvider();
		const requestedModel = model || providerManager.getCurrentModel();

		// Force refresh server availability to get current status
		const isServerAvailable = await providerManager.refreshServerAvailability();

		// Check if we can send with this configuration
		const status = await providerManager.getProviderStatus(requestedProvider, requestedModel);
		if (!status.canSend) {
			return {
				success: false,
				error: status.errorMessage || 'Cannot send message with current configuration'
			};
		}

		// Try server-side first only if server is actually available AND online
		if (isServerAvailable && networkStore.isOnline) {
			try {
				const serverResponse = await this.tryServerSide(
					messages,
					requestedProvider,
					requestedModel,
					mentionedTools
				);
				if (serverResponse.success) {
					return serverResponse;
				}
			} catch (error) {
				debugConsole.log('Server-side failed, falling back to client-side:', error);
				// Mark server as unavailable after failed attempt
				providerManager.refreshServerAvailability();
			}
		}

		// Fallback to client-side
		return this.sendMessageClientSide(messages, requestedProvider, requestedModel, mentionedTools);
	}

	private async tryServerSide(
		messages: ChatMessage[],
		provider: ProviderId,
		model: string,
		mentionedTools?: string[]
	): Promise<ChatResponse> {
		const outboundMessages = messages.map((msg) => ({
			role: msg.role,
			content: msg.content
		}));

		// Log outbound message to debug store
		debugStore.logOutboundMessage(outboundMessages, 'server', {
			provider,
			model
		});

		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messages: outboundMessages,
				provider,
				model,
				mentionedTools: mentionedTools || [],
				enabledTools: Object.keys(toolRegistry.getEnabledTools())
			})
		});

		if (!response.ok) {
			throw new Error(`Server error: ${response.status}`);
		}

		if (!response.body) {
			throw new Error('No response body');
		}

		// Extract provider/model info from response headers if available
		const actualProvider = response.headers.get('X-Provider') || provider;
		const actualModel = response.headers.get('X-Model') || model;
		const wasFallback = response.headers.get('X-Fallback') === 'true';

		if (wasFallback) {
			debugConsole.log(`Server used fallback: ${actualProvider}/${actualModel}`);
		}

		return {
			success: true,
			stream: response.body,
			apiMetadata: {
				provider: actualProvider,
				model: actualModel,
				timestamp: Date.now()
			}
		};
	}

	private async sendMessageClientSide(
		messages: ChatMessage[],
		provider: ProviderId,
		model: string,
		mentionedTools?: string[]
	): Promise<ChatResponse> {
		// Check if we have a valid API key for this provider
		if (!providerManager.hasValidApiKey(provider)) {
			const providerName = providerManager.getProviderDisplayName(provider);
			return {
				success: false,
				error: `Server AI is unavailable and no valid ${providerName} API key is configured. Please set up your API key in the settings to continue chatting.`
			};
		}

		const startTime = Date.now();

		try {
			const providerInstance = providerManager.getClientProviderInstance(provider);
			const modelInstance = providerInstance(model);

			// Convert ChatMessage format to AI SDK format
			const aiMessages = messages.map((msg) => ({
				role: msg.role as 'user' | 'assistant' | 'system',
				content: msg.content
			}));

			// Log outbound message to debug store
			debugStore.logOutboundMessage(aiMessages, 'client', {
				provider,
				model
			});

			// Log API request
			debugStore.logApiRequest({
				provider,
				model,
				messages: aiMessages.length,
				timestamp: startTime
			});

			// Handle tool mentions for temporary enabling
			let tempToolsApplied = false;
			if (mentionedTools && mentionedTools.length > 0) {
				const context = ToolMentionManager.analyzeMessage(`@${mentionedTools.join(' @')}`);
				if (context.hasDisabledMentions) {
					ToolMentionManager.applyTemporarySettings(context);
					tempToolsApplied = true;
				}
			}

			// Get current enabled tools for this request
			const enabledTools = toolRegistry.getEnabledTools();
			debugConsole.log('=== CLIENT CHAT TOOLS DEBUG ===');
			debugConsole.log('Enabled tools from registry:', Object.keys(enabledTools));

			const toolsForRequest: Record<string, any> = {};

			for (const [name, metadata] of Object.entries(enabledTools)) {
				toolsForRequest[name] = metadata.tool;
				debugConsole.log(`Adding tool to LLM request: ${name}`);
			}

			debugConsole.log('FINAL TOOLS FOR LLM:', Object.keys(toolsForRequest));
			debugConsole.log('=== END TOOLS DEBUG ===');

			const result = streamText({
				model: modelInstance,
				messages: aiMessages,
				tools: toolsForRequest,
				temperature: 0.7,
				maxSteps: 5
			});

			// Restore original settings if we applied temporary ones
			if (tempToolsApplied) {
				ToolMentionManager.restoreOriginalSettings();
			}

			const responseTime = Date.now() - startTime;

			// Create API metadata
			const apiMetadata: ApiUsageMetadata = {
				model,
				provider,
				responseTime,
				timestamp: Date.now()
			};

			// Log API metadata to debug store
			debugStore.logApiMetadata({
				model,
				provider,
				responseTime
			});

			return {
				success: true,
				stream: result.toDataStream(),
				apiMetadata
			};
		} catch (error) {
			// Ensure we restore settings even on error
			if (mentionedTools && mentionedTools.length > 0) {
				ToolMentionManager.restoreOriginalSettings();
			}
			debugConsole.error('Client chat error:', error);

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

	async generateTitle(
		userMessage: string,
		assistantMessage: string,
		provider?: string,
		model?: string
	): Promise<string | null> {
		// Check network status first
		if (!networkStore.isOnline) {
			return null;
		}

		// Use provider manager to determine best provider/model
		const requestedProvider = provider
			? (provider as ProviderId)
			: providerManager.getCurrentProvider();
		const requestedModel = model || providerManager.getCurrentModel();

		// Check if we can send with this configuration
		const status = await providerManager.getProviderStatus(requestedProvider, requestedModel);
		if (!status.canSend) {
			return null;
		}

		// Force refresh server availability
		const isServerAvailable = await providerManager.refreshServerAvailability();

		// Try server-side first only if server is actually available AND online
		if (isServerAvailable && networkStore.isOnline) {
			try {
				const serverTitle = await this.tryServerSideTitle(
					userMessage,
					assistantMessage,
					requestedProvider,
					requestedModel
				);
				if (serverTitle) {
					return serverTitle;
				}
			} catch (error) {
				debugConsole.log(
					'Server-side title generation failed, falling back to client-side:',
					error
				);
			}
		}

		// Fallback to client-side
		return this.generateTitleClientSide(
			userMessage,
			assistantMessage,
			requestedProvider,
			requestedModel
		);
	}

	private async tryServerSideTitle(
		userMessage: string,
		assistantMessage: string,
		provider: ProviderId,
		model: string
	): Promise<string | null> {
		const response = await fetch('/api/generate-title', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userMessage,
				assistantMessage,
				provider,
				model
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
		assistantMessage: string,
		provider: ProviderId,
		model: string
	): Promise<string | null> {
		// Check if we have an API key for the specific provider
		if (!providerManager.hasValidApiKey(provider)) {
			return null;
		}

		try {
			const providerInstance = providerManager.getClientProviderInstance(provider);
			const modelInstance = providerInstance(model);

			const result = await streamText({
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
			debugConsole.error('Client-side title generation error:', error);
			return null;
		}
	}

	async canSendMessages(): Promise<boolean> {
		// Can't send if offline
		if (!networkStore.isOnline) {
			return false;
		}

		// Check current provider status
		const status = await providerManager.getProviderStatus();
		return status.canSend;
	}

	async getStatusMessage(): Promise<string> {
		if (!networkStore.isOnline) {
			return "📴 You're offline. Messages will be queued and sent when you reconnect.";
		}

		const status = await providerManager.getProviderStatus();
		if (status.canSend) {
			return '🚀 Ready to chat';
		} else {
			return status.errorMessage || 'Cannot send messages';
		}
	}

	// New method to get detailed status for UI
	async getDetailedStatus(): Promise<{
		canSend: boolean;
		hasApiKey: boolean;
		isOnline: boolean;
		isValidApiKey: boolean;
		provider: string;
		model: string;
		queuedCount: number;
	}> {
		const status = await providerManager.getProviderStatus();

		return {
			canSend: status.canSend,
			hasApiKey: status.hasApiKey,
			isOnline: networkStore.isOnline,
			isValidApiKey: status.isValidApiKey,
			provider: providerManager.getProviderDisplayName(status.provider),
			model: providerManager.getModelDisplayName(status.provider, status.model),
			queuedCount: 0 // Will be updated by the component
		};
	}

	// Get API usage statistics
	getApiUsageStats() {
		return debugStore.getApiMetrics();
	}

	// Provider management methods
	getProviderManager() {
		return providerManager;
	}
}

export const clientChatService = new ClientChatService();
