import type { ChatMessage } from '../../app.d.ts';

/**
 * Interface for AI SDK compatible message format
 */
export interface AiMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string | Array<{ type: string; text: string }>;
}

/**
 * Filters out messages with empty content to prevent sending irrelevant data to LLM
 * @param messages Array of ChatMessage objects
 * @returns Filtered array with only messages that have meaningful content
 */
export function filterEmptyMessages(messages: ChatMessage[]): ChatMessage[] {
	return messages.filter((message) => {
		if (!message.content) return false;

		// Handle string content
		if (typeof message.content === 'string') {
			return message.content.trim().length > 0;
		}

		// Handle array content (for multi-modal messages)
		if (Array.isArray(message.content)) {
			return message.content.some((block) => {
				if (block.type === 'text') {
					return block.text && block.text.trim().length > 0;
				}
				// For non-text blocks (images, etc.), consider them as having content
				return true;
			});
		}

		return false;
	});
}

/**
 * Converts ChatMessage format to AI SDK format while filtering empty content
 * @param messages Array of ChatMessage objects
 * @returns Array of AI SDK compatible messages
 */
export function prepareMessagesForLLM(messages: ChatMessage[]): AiMessage[] {
	const filteredMessages = filterEmptyMessages(messages);

	return filteredMessages.map((msg) => ({
		role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
		content: msg.content
	}));
}

/**
 * Filters empty text blocks from content arrays
 * @param content Array of content blocks
 * @returns Filtered array with empty text blocks removed
 */
export function filterEmptyContentBlocks(
	content: Array<{ type: string; text?: string }>
): Array<{ type: string; text?: string }> {
	return content.filter((block) => {
		if (block.type === 'text') {
			return block.text && block.text.trim().length > 0;
		}
		// Keep non-text blocks
		return true;
	});
}
