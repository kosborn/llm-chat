import { cloneForState } from '../utils/serialization.js';
import { debugConsole } from '../utils/console.js';

interface DebugMessage {
	id: string;
	timestamp: number;
	type:
		| 'raw_stream'
		| 'parsed_data'
		| 'tool_call'
		| 'tool_result'
		| 'api_request'
		| 'api_response'
		| 'api_metadata'
		| 'error'
		| 'message_update'
		| 'final_response'
		| 'outbound_message'
		| 'test'
		| 'ip_test';
	data: unknown;
	metadata?: {
		chatId?: string;
		messageId?: string;
		toolCallId?: string;
		toolName?: string;
		model?: string;
		provider?: string;
		tokenUsage?: {
			promptTokens?: number;
			completionTokens?: number;
			totalTokens?: number;
		};
		cost?: {
			inputCost?: number;
			outputCost?: number;
			totalCost?: number;
			currency?: string;
		};
		responseTime?: number;
	};
}

class DebugStore {
	isEnabled = $state(false);
	messages = $state<DebugMessage[]>([]);
	maxMessages = $state(1000);
	isStreaming = $state(false);
	newMessageCount = $state(0);

	toggle(): void {
		this.isEnabled = !this.isEnabled;
		if (this.isEnabled) {
			console.log('🐛 Debug mode enabled - Console logging is now active');
		}
		if (!this.isEnabled) {
			this.clear();
		}
	}

	toggleEnabled(): void {
		this.isEnabled = !this.isEnabled;
	}

	enable(): void {
		this.isEnabled = true;
		console.log('🐛 Debug mode enabled - Console logging is now active');
	}

	disable(): void {
		this.isEnabled = false;
	}

	disableAndClear(): void {
		this.isEnabled = false;
		this.clear();
	}

	clear(): void {
		this.messages = [];
		this.newMessageCount = 0;
	}

	log(type: DebugMessage['type'], data: unknown, metadata?: DebugMessage['metadata']): void {
		if (!this.isEnabled) return;

		const debugMessage: DebugMessage = {
			id: `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
			timestamp: Date.now(),
			type,
			data: cloneForState(data),
			metadata: metadata ? cloneForState(metadata) : undefined
		};

		this.messages = [debugMessage, ...this.messages.slice(0, this.maxMessages - 1)];
		this.newMessageCount += 1;

		// Reset new message count after a short delay
		setTimeout(() => {
			if (this.newMessageCount > 0) {
				this.newMessageCount = Math.max(0, this.newMessageCount - 1);
			}
		}, 3000);
	}

	logRawStream(chunk: string, metadata?: DebugMessage['metadata']): void {
		this.isStreaming = true;
		this.log('raw_stream', { chunk }, metadata);

		// Reset streaming state after a delay
		setTimeout(() => {
			this.isStreaming = false;
		}, 1000);
	}

	logParsedData(parsed: unknown, metadata?: DebugMessage['metadata']): void {
		this.log('parsed_data', parsed, metadata);
	}

	logToolCall(
		toolCall: { toolCallId: string; toolName: string; [key: string]: unknown },
		metadata?: DebugMessage['metadata']
	): void {
		this.log('tool_call', toolCall, {
			...metadata,
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName
		});
	}

	logToolResult(
		toolResult: { toolCallId: string; [key: string]: unknown },
		metadata?: DebugMessage['metadata']
	): void {
		this.log('tool_result', toolResult, {
			...metadata,
			toolCallId: toolResult.toolCallId
		});
	}

	logApiRequest(request: unknown, metadata?: DebugMessage['metadata']): void {
		this.log('api_request', request, metadata);
	}

	logApiResponse(response: unknown, metadata?: DebugMessage['metadata']): void {
		this.log('api_response', response, metadata);
	}

	logApiMetadata(
		apiMetadata: {
			model?: string;
			provider?: string;
			promptTokens?: number;
			completionTokens?: number;
			totalTokens?: number;
			cost?: {
				inputCost?: number;
				outputCost?: number;
				totalCost?: number;
				currency?: string;
			};
			requestId?: string;
			responseTime?: number;
		},
		metadata?: DebugMessage['metadata']
	): void {
		debugConsole.log('[DEBUG] Logging API metadata:', apiMetadata);
		this.log('api_metadata', apiMetadata, {
			...metadata,
			model: apiMetadata.model,
			provider: apiMetadata.provider,
			tokenUsage: {
				promptTokens: apiMetadata.promptTokens,
				completionTokens: apiMetadata.completionTokens,
				totalTokens: apiMetadata.totalTokens
			},
			cost: apiMetadata.cost,
			responseTime: apiMetadata.responseTime
		});
	}

	logError(error: Error | string | unknown, metadata?: DebugMessage['metadata']): void {
		this.log(
			'error',
			{
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				error: error
			},
			metadata
		);
	}

	logMessageUpdate(update: unknown, metadata?: DebugMessage['metadata']): void {
		this.log('message_update', update, metadata);
	}

	logFinalResponse(content: string, metadata?: DebugMessage['metadata']): void {
		this.log('final_response', { content, completedAt: Date.now() }, metadata);
	}

	logOutboundMessage(
		messages: unknown,
		path: 'server' | 'client',
		metadata?: DebugMessage['metadata']
	): void {
		this.log(
			'outbound_message',
			{
				messages,
				path,
				messageCount: Array.isArray(messages) ? messages.length : 1,
				sentAt: Date.now()
			},
			metadata
		);
	}

	getMessagesByType(type: DebugMessage['type']): DebugMessage[] {
		return this.messages.filter((msg) => msg.type === type);
	}

	getMessagesByChatId(chatId: string): DebugMessage[] {
		return this.messages.filter((msg) => msg.metadata?.chatId === chatId);
	}

	getMessagesByToolCallId(toolCallId: string): DebugMessage[] {
		return this.messages.filter((msg) => msg.metadata?.toolCallId === toolCallId);
	}

	setMaxMessages(max: number): void {
		this.maxMessages = Math.max(10, Math.min(10000, max));
		if (this.messages.length > this.maxMessages) {
			this.messages = this.messages.slice(0, this.maxMessages);
		}
	}

	markAllAsRead(): void {
		this.newMessageCount = 0;
	}

	getRecentMessages(count = 10): DebugMessage[] {
		return this.messages.slice(0, count);
	}

	isStreamingActive(): boolean {
		return this.isStreaming;
	}

	getMessageTypeCounts(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const msg of this.messages) {
			counts[msg.type] = (counts[msg.type] || 0) + 1;
		}
		return counts;
	}

	getUniqueMessageTypes(): string[] {
		const types = new Set(this.messages.map((msg) => msg.type));
		return Array.from(types).sort();
	}

	getApiMetrics(): {
		totalRequests: number;
		totalTokens: number;
		totalCost: number;
		averageResponseTime: number;
		modelUsage: Record<string, number>;
		providerUsage: Record<string, number>;
	} {
		const apiMessages = this.messages.filter((msg) => msg.type === 'api_metadata');

		let totalTokens = 0;
		let totalCost = 0;
		let totalResponseTime = 0;
		const modelUsage: Record<string, number> = {};
		const providerUsage: Record<string, number> = {};

		for (const msg of apiMessages) {
			const metadata = msg.metadata;

			if (metadata?.tokenUsage?.totalTokens) {
				totalTokens += metadata.tokenUsage.totalTokens;
			}
			if (metadata?.cost?.totalCost) {
				totalCost += metadata.cost.totalCost;
			}
			if (metadata?.responseTime) {
				totalResponseTime += metadata.responseTime;
			}
			if (metadata?.model) {
				modelUsage[metadata.model] = (modelUsage[metadata.model] || 0) + 1;
			}
			if (metadata?.provider) {
				providerUsage[metadata.provider] = (providerUsage[metadata.provider] || 0) + 1;
			}
		}

		return {
			totalRequests: apiMessages.length,
			totalTokens,
			totalCost,
			averageResponseTime: apiMessages.length > 0 ? totalResponseTime / apiMessages.length : 0,
			modelUsage,
			providerUsage
		};
	}
}

export const debugStore = new DebugStore();
