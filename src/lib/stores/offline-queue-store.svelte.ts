import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import type { ChatMessage } from '../../app.d.ts';

interface QueuedMessage {
	id: string;
	chatId: string;
	message: ChatMessage;
	timestamp: number;
	retryCount: number;
	maxRetries: number;
}

class OfflineQueueStore {
	queue = $state<QueuedMessage[]>([]);
	isProcessing = $state(false);

	constructor() {
		if (browser) {
			this.loadFromStorage();
			this.setupNetworkListeners();
		}
	}

	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem('ai-chat-offline-queue');
			if (stored) {
				this.queue = JSON.parse(stored);
			}
		} catch (error) {
			console.warn('Failed to load offline queue from storage:', error);
			this.queue = [];
		}
	}

	private saveToStorage(): void {
		if (!browser) return;

		try {
			localStorage.setItem('ai-chat-offline-queue', JSON.stringify(this.queue));
		} catch (error) {
			console.error('Failed to save offline queue to storage:', error);
		}
	}

	private setupNetworkListeners(): void {
		window.addEventListener('network-online', () => {
			this.processQueue();
		});
	}

	addToQueue(chatId: string, message: ChatMessage): void {
		const queuedMessage: QueuedMessage = {
			id: nanoid(),
			chatId,
			message,
			timestamp: Date.now(),
			retryCount: 0,
			maxRetries: 3
		};

		this.queue = [...this.queue, queuedMessage];
		this.saveToStorage();

		console.log(`Added message to offline queue. Queue size: ${this.queue.length}`);
	}

	removeFromQueue(id: string): void {
		this.queue = this.queue.filter((item) => item.id !== id);
		this.saveToStorage();
	}

	clearQueue(): void {
		this.queue = [];
		this.saveToStorage();
	}

	async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		console.log(`Processing ${this.queue.length} queued messages...`);

		try {
			// Import notification store for user feedback
			const { notificationStore } = await import('./notification-store.svelte.js');

			let successCount = 0;
			let failureCount = 0;

			// Process messages one by one
			for (const queuedMessage of [...this.queue]) {
				try {
					await this.sendQueuedMessage(queuedMessage);
					this.removeFromQueue(queuedMessage.id);
					successCount++;
				} catch (error) {
					console.error('Failed to send queued message:', error);

					// Increment retry count
					const index = this.queue.findIndex((item) => item.id === queuedMessage.id);
					if (index !== -1) {
						const updatedMessage = {
							...queuedMessage,
							retryCount: queuedMessage.retryCount + 1
						};

						if (updatedMessage.retryCount >= updatedMessage.maxRetries) {
							// Remove message after max retries
							this.removeFromQueue(queuedMessage.id);
							failureCount++;
							console.warn(
								`Giving up on message ${queuedMessage.id} after ${updatedMessage.maxRetries} retries`
							);
						} else {
							// Update retry count
							this.queue[index] = updatedMessage;
							this.saveToStorage();
						}
					}
				}
			}

			// Show notification about results
			if (successCount > 0) {
				notificationStore.success(
					`Sent ${successCount} queued message${successCount > 1 ? 's' : ''}`,
					3000
				);
			}
			if (failureCount > 0) {
				notificationStore.error(
					`Failed to send ${failureCount} message${failureCount > 1 ? 's' : ''} after retries`,
					5000
				);
			}
		} finally {
			this.isProcessing = false;
		}
	}

	private async sendQueuedMessage(queuedMessage: QueuedMessage): Promise<void> {
		// Import client chat service dynamically to avoid circular dependencies
		const { clientChatService } = await import('../services/client-chat.js');
		const { chatStore } = await import('./chat-store.svelte.js');

		// Get the current chat and prepare messages for sending
		const chat = await import('./chat-storage.js').then((m) =>
			m.chatStorage.getChat(queuedMessage.chatId)
		);
		if (!chat) {
			throw new Error('Chat not found');
		}

		// Send the message using the client chat service with chat's provider/model
		const provider = chat.provider || 'groq';
		const model = chat.model || 'meta-llama/llama-4-scout-17b-16e-instruct';
		const response = await clientChatService.sendMessage(chat.messages, provider, model);

		if (!response.success) {
			throw new Error(response.error || 'Failed to send queued message');
		}

		// If successful, the message has been sent
		console.log('Successfully sent queued message:', queuedMessage.id);
	}

	getQueueCount(): number {
		return this.queue.length;
	}

	getQueueForChat(chatId: string): QueuedMessage[] {
		return this.queue.filter((item) => item.chatId === chatId);
	}

	hasQueuedMessages(): boolean {
		return this.queue.length > 0;
	}
}

export const offlineQueueStore = new OfflineQueueStore();
