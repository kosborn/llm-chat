import type { Chat, ChatMessage } from '../../app.d.ts';
import { nanoid } from 'nanoid';
import { serialize, cloneForState } from '../utils/serialization.js';

const DB_NAME = 'ChatAppDB';
const DB_VERSION = 1;
const CHATS_STORE = 'chats';

class ChatStorage {
	private db: IDBDatabase | null = null;

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				if (!db.objectStoreNames.contains(CHATS_STORE)) {
					const chatStore = db.createObjectStore(CHATS_STORE, { keyPath: 'id' });
					chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
				}
			};
		});
	}

	async createChat(title?: string): Promise<Chat> {
		if (!this.db) await this.init();

		const chat: Chat = {
			id: nanoid(),
			title: title || 'New Chat',
			messages: [],
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		// Serialize to ensure it can be stored in IndexedDB
		const serializedChat = serialize(chat);

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.add(serializedChat);

			request.onsuccess = () => resolve(cloneForState(chat));
			request.onerror = () => reject(request.error);
		});
	}

	async getChats(): Promise<Chat[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readonly');
			const store = transaction.objectStore(CHATS_STORE);
			const index = store.index('updatedAt');
			const request = index.getAll();

			request.onsuccess = () => {
				const chats = request.result
					.map((chat: Chat) => cloneForState(chat))
					.filter((chat: Chat) => !chat.archived)
					.sort((a, b) => b.updatedAt - a.updatedAt);
				resolve(chats);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async getArchivedChats(): Promise<Chat[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readonly');
			const store = transaction.objectStore(CHATS_STORE);
			const index = store.index('updatedAt');
			const request = index.getAll();

			request.onsuccess = () => {
				const chats = request.result
					.map((chat: Chat) => cloneForState(chat))
					.filter((chat: Chat) => chat.archived === true)
					.sort((a, b) => b.updatedAt - a.updatedAt);
				resolve(chats);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async getChat(id: string): Promise<Chat | null> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readonly');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.get(id);

			request.onsuccess = () => {
				const result = request.result;
				resolve(result ? cloneForState(result) : null);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async getAllChats(): Promise<Chat[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readonly');
			const store = transaction.objectStore(CHATS_STORE);
			const index = store.index('updatedAt');
			const request = index.getAll();

			request.onsuccess = () => {
				const chats = request.result
					.map((chat: Chat) => cloneForState(chat))
					.sort((a, b) => b.updatedAt - a.updatedAt);
				resolve(chats);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async updateChat(chat: Chat): Promise<void> {
		if (!this.db) await this.init();

		// Create a serialized copy with updated timestamp
		const chatToStore = serialize({
			...chat,
			updatedAt: Date.now()
		});

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.put(chatToStore);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async addMessageToChat(chatId: string, message: ChatMessage): Promise<void> {
		const chat = await this.getChat(chatId);
		if (!chat) throw new Error('Chat not found');

		// Serialize the message to ensure it can be stored
		const serializedMessage = serialize(message);
		chat.messages.push(serializedMessage);
		await this.updateChat(chat);
	}

	async archiveChat(id: string): Promise<void> {
		const chat = await this.getChat(id);
		if (!chat) throw new Error('Chat not found');

		const archivedChat = serialize({
			...chat,
			archived: true,
			updatedAt: Date.now()
		});

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.put(archivedChat);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async unarchiveChat(id: string): Promise<void> {
		const chat = await this.getChat(id);
		if (!chat) throw new Error('Chat not found');

		const unarchivedChat = serialize({
			...chat,
			archived: false,
			updatedAt: Date.now()
		});

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.put(unarchivedChat);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async deleteChat(id: string): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.delete(id);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async clearAllChats(): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([CHATS_STORE], 'readwrite');
			const store = transaction.objectStore(CHATS_STORE);
			const request = store.clear();

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}

export const chatStorage = new ChatStorage();
