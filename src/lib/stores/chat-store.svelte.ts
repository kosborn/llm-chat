import type { Chat, ChatMessage } from '../../app.d.ts';
import { chatStorage } from './chat-storage.js';
import { notificationStore } from './notification-store.svelte.js';
import { cloneForState, serialize } from '../utils/serialization.js';
import { clientChatService } from '../services/client-chat.js';
import { debugConsole } from '../utils/console.js';

class ChatStore {
	chats = $state<Chat[]>([]);
	archivedChats = $state<Chat[]>([]);
	currentChatId = $state<string | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);
	titleFlashChatId = $state<string | null>(null);

	get currentChat(): Chat | null {
		return this.chats.find((chat) => chat.id === this.currentChatId) || null;
	}

	async init(): Promise<void> {
		try {
			this.isLoading = true;
			this.error = null;
			await chatStorage.init();
			const chats = await chatStorage.getChats();
			const archivedChats = await chatStorage.getArchivedChats();
			this.chats = cloneForState(chats);
			this.archivedChats = cloneForState(archivedChats);

			// Set current chat to the most recent one if no chat is selected
			if (!this.currentChatId && chats.length > 0) {
				this.currentChatId = chats[0].id;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to initialize chat store';
		} finally {
			this.isLoading = false;
		}
	}

	async createChat(title?: string): Promise<string> {
		try {
			this.error = null;
			const chat = await chatStorage.createChat(title);
			this.chats = [cloneForState(chat), ...this.chats];
			this.currentChatId = chat.id;
			return chat.id;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to create chat';
			throw err;
		}
	}

	async selectChat(chatId: string): Promise<void> {
		try {
			this.error = null;
			const chat = await chatStorage.getChat(chatId);
			if (chat) {
				this.currentChatId = chatId;
				// Update the chat in our local array if it's not already there
				const existingIndex = this.chats.findIndex((c) => c.id === chatId);
				if (existingIndex === -1) {
					this.chats = [cloneForState(chat), ...this.chats];
				} else {
					// Update existing chat with fresh data from storage
					this.chats[existingIndex] = cloneForState(chat);
				}
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to select chat';
		}
	}

	async addMessage(message: ChatMessage): Promise<void> {
		if (!this.currentChatId) {
			throw new Error('No chat selected');
		}

		try {
			this.error = null;
			// Serialize message before storing
			const serializedMessage = serialize(message);
			await chatStorage.addMessageToChat(this.currentChatId, serializedMessage);

			// Update local state
			const chatIndex = this.chats.findIndex((c) => c.id === this.currentChatId);
			if (chatIndex !== -1) {
				// Create a new messages array to trigger reactivity
				const updatedMessages = [...this.chats[chatIndex].messages, cloneForState(message)];
				const updatedChat = {
					...this.chats[chatIndex],
					messages: updatedMessages,
					updatedAt: Date.now()
				};

				// Create new chats array with updated chat moved to top
				const otherChats = this.chats.filter((_, i) => i !== chatIndex);
				this.chats = [updatedChat, ...otherChats];
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to add message';
			throw err;
		}
	}

	async updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<void> {
		if (!this.currentChat) return;

		const messageIndex = this.currentChat.messages.findIndex((m) => m.id === messageId);
		if (messageIndex === -1) return;

		// Create new messages array with updated message
		const updatedMessages = [...this.currentChat.messages];
		updatedMessages[messageIndex] = {
			...updatedMessages[messageIndex],
			...cloneForState(updates)
		};

		// Create new chat object
		const updatedChat = {
			...this.currentChat,
			messages: updatedMessages
		};

		// Update local state
		const currentChatId = this.currentChat?.id;
		if (currentChatId) {
			const chatIndex = this.chats.findIndex((c) => c.id === currentChatId);
			if (chatIndex !== -1) {
				const newChats = [...this.chats];
				newChats[chatIndex] = updatedChat;
				this.chats = newChats;
			}
		}

		try {
			await chatStorage.updateChat(serialize(updatedChat));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to update message';
		}
	}

	async archiveChat(chatId: string): Promise<void> {
		try {
			this.error = null;
			await chatStorage.archiveChat(chatId);

			// Move chat from chats to archivedChats
			const chatToArchive = this.chats.find((c) => c.id === chatId);
			if (chatToArchive) {
				const archivedChat = { ...chatToArchive, archived: true };
				this.chats = this.chats.filter((c) => c.id !== chatId);
				this.archivedChats = [archivedChat, ...this.archivedChats];
			}

			if (this.currentChatId === chatId) {
				this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to archive chat';
			throw err;
		}
	}

	async unarchiveChat(chatId: string): Promise<void> {
		try {
			this.error = null;
			await chatStorage.unarchiveChat(chatId);

			// Move chat from archivedChats to chats
			const chatToUnarchive = this.archivedChats.find((c) => c.id === chatId);
			if (chatToUnarchive) {
				const unarchivedChat = { ...chatToUnarchive, archived: false };
				this.archivedChats = this.archivedChats.filter((c) => c.id !== chatId);
				this.chats = [unarchivedChat, ...this.chats];
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to unarchive chat';
			throw err;
		}
	}

	async deleteChat(chatId: string): Promise<void> {
		try {
			this.error = null;
			await chatStorage.deleteChat(chatId);
			this.chats = this.chats.filter((c) => c.id !== chatId);
			this.archivedChats = this.archivedChats.filter((c) => c.id !== chatId);

			if (this.currentChatId === chatId) {
				this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to delete chat';
			throw err;
		}
	}

	async updateChatTitle(chatId: string, title: string): Promise<void> {
		const chatIndex = this.chats.findIndex((c) => c.id === chatId);
		if (chatIndex === -1) return;

		// Create updated chat object
		const updatedChat = {
			...this.chats[chatIndex],
			title,
			updatedAt: Date.now()
		};

		// Update local state
		const newChats = [...this.chats];
		newChats[chatIndex] = updatedChat;
		this.chats = newChats;

		try {
			await chatStorage.updateChat(serialize(updatedChat));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to update chat title';
		}
	}

	async updateChat(chat: Chat): Promise<void> {
		const chatIndex = this.chats.findIndex((c) => c.id === chat.id);
		if (chatIndex === -1) return;

		// Create updated chat object with new timestamp
		const updatedChat = {
			...chat,
			updatedAt: Date.now()
		};

		// Update local state
		const newChats = [...this.chats];
		newChats[chatIndex] = updatedChat;
		this.chats = newChats;

		try {
			await chatStorage.updateChat(serialize(updatedChat));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to update chat';
		}
	}

	async autoRenameChat(chatId: string, forceRegenerate = false): Promise<void> {
		const chat = this.chats.find((c) => c.id === chatId);
		if (!chat || chat.messages.length < 2) return;

		// If forced regeneration, always proceed
		if (forceRegenerate) {
			// Continue to generate title
		} else {
			// Check if this chat needs auto-renaming (only for automatic renaming)
			const needsRename =
				chat.title.startsWith('New Chat') ||
				chat.title.toLowerCase().includes('here is') ||
				chat.title.toLowerCase().includes("here's") ||
				chat.title.toLowerCase().includes('descriptive title') ||
				chat.title.toLowerCase().includes('chat...') ||
				chat.title.length > 60; // Suspiciously long titles

			// Only auto-rename if conditions are met and we have exactly 2 messages (first exchange)
			if (!needsRename || chat.messages.length !== 2) return;
		}

		const userMessage = chat.messages.find((m) => m.role === 'user');
		const assistantMessage = chat.messages.find((m) => m.role === 'assistant');

		if (!userMessage || !assistantMessage || !userMessage.content || !assistantMessage.content)
			return;

		// Check if we can generate titles (online and has API key if needed)
		if (!clientChatService.canSendMessages()) {
			if (forceRegenerate) {
				throw new Error('API_KEY_MISSING');
			}
			return;
		}

		try {
			const title = await clientChatService.generateTitle(
				userMessage.content,
				assistantMessage.content,
				chat.provider,
				chat.model
			);

			if (title?.trim()) {
				await this.updateChatTitle(chatId, title.trim());
				// Trigger flash animation
				this.titleFlashChatId = chatId;
				// Reset flash after animation duration
				setTimeout(() => {
					this.titleFlashChatId = null;
				}, 600);
			} else if (forceRegenerate) {
				// Check if we're offline or missing API key for better error messages
				if (!clientChatService.canSendMessages()) {
					notificationStore.error(
						'Cannot generate title while offline. Please check your connection.'
					);
				} else {
					notificationStore.error(
						'Failed to generate title. The AI service may be temporarily unavailable.'
					);
				}
			}
		} catch (err) {
			if (forceRegenerate) {
				debugConsole.error('Title generation error:', err);
				// Provide specific error messages based on the error type
				if (err instanceof Error) {
					if (err.message.includes('503') || err.message.includes('Server error')) {
						notificationStore.error(
							'Title generation service is temporarily unavailable. Please try again later.'
						);
					} else if (err.message.includes('401') || err.message.includes('unauthorized')) {
						notificationStore.error('API key is invalid. Please check your settings.');
					} else if (err.message.includes('network') || err.message.includes('fetch')) {
						notificationStore.error('Network error. Please check your connection and try again.');
					} else {
						notificationStore.error(`Failed to generate title: ${err.message}`);
					}
				} else {
					notificationStore.error('Failed to generate title. Please try again.');
				}
			}
			debugConsole.warn('Auto-rename failed:', err);
		}
	}

	clearError(): void {
		this.error = null;
	}
}

export const chatStore = new ChatStore();
