<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Chat } from '../../app.d.ts';
	import { stripMarkdown } from '$lib/utils/markdown.js';

	interface Props {
		chats: Chat[];
		currentChatId: string | null;
		isLoading?: boolean;
		autoRenamingChatId?: string | null;
	}

	let { chats, currentChatId, isLoading = false, autoRenamingChatId = null }: Props = $props();

	const dispatch = createEventDispatcher<{
		selectChat: { chatId: string };
		newChat: {};
		deleteChat: { chatId: string };
		renameChat: { chatId: string; title: string };
		regenerateTitle: { chatId: string };
	}>();

	let editingChatId = $state<string | null>(null);
	let editingTitle = $state('');

	function handleNewChat() {
		dispatch('newChat', {});
	}

	function handleSelectChat(chatId: string) {
		if (editingChatId) return;
		dispatch('selectChat', { chatId });
	}

	function handleDeleteChat(chatId: string, event: Event) {
		event.stopPropagation();
		if (confirm('Are you sure you want to delete this chat?')) {
			dispatch('deleteChat', { chatId });
		}
	}

	function handleRegenerateTitle(chatId: string, event: Event) {
		event.stopPropagation();
		dispatch('regenerateTitle', { chatId });
	}

	function startEditingTitle(chat: Chat, event: Event) {
		event.stopPropagation();
		editingChatId = chat.id;
		editingTitle = chat.title;
	}

	function saveTitle() {
		if (editingChatId && editingTitle.trim()) {
			dispatch('renameChat', {
				chatId: editingChatId,
				title: editingTitle.trim()
			});
		}
		editingChatId = null;
		editingTitle = '';
	}

	function cancelEdit() {
		editingChatId = null;
		editingTitle = '';
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	function getLastMessagePreview(chat: Chat): string {
		if (chat.messages.length === 0) return 'No messages yet';

		const lastMessage = chat.messages[chat.messages.length - 1];
		const preview = stripMarkdown(lastMessage.content || 'Tool used').substring(0, 60);
		return preview + (preview.length < lastMessage.content.length ? '...' : '');
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (messageDate.getTime() === today.getTime()) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (messageDate.getTime() === today.getTime() - 86400000) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		}
	}
</script>

<div
	class="flex h-full w-80 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
>
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		<button
			onclick={handleNewChat}
			disabled={isLoading}
			class="flex w-full items-center justify-center gap-2 rounded-lg
				   bg-blue-600 px-4 py-3 font-medium
				   text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 5V19M5 12H19"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			New Chat
		</button>
	</div>

	<!-- Chat List -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading && chats.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">Loading chats...</div>
		{:else if chats.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">
				No chats yet. Start a new conversation!
			</div>
		{:else}
			<div class="space-y-1 p-2">
				{#each chats as chat (chat.id)}
					<div
						class="group relative cursor-pointer rounded-lg p-3 transition-colors
							   {currentChatId === chat.id
							? 'border border-blue-200 bg-blue-100 dark:border-blue-700 dark:bg-blue-900/50'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						onclick={() => handleSelectChat(chat.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleSelectChat(chat.id)}
					>
						<!-- Chat Title -->
						<div class="mb-1 flex items-start justify-between gap-2">
							{#if editingChatId === chat.id}
								<input
									bind:value={editingTitle}
									onkeydown={handleTitleKeydown}
									onblur={saveTitle}
									class="flex-1 rounded border border-gray-300 bg-white px-2 py-1
										   text-sm font-medium focus:border-transparent focus:ring-2
										   focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
									placeholder="Chat title"
								/>
							{:else}
								<div class="flex flex-1 items-center gap-2">
									<h3 class="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
										{chat.title}
									</h3>
									{#if autoRenamingChatId === chat.id}
										<div
											class="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400"
											title="Auto-generating title..."
										>
											<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
												<circle
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
													class="opacity-25"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											<span>Renaming...</span>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Actions -->
							<div
								class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								{#if editingChatId !== chat.id && autoRenamingChatId !== chat.id}
									<button
										onclick={(e) => startEditingTitle(chat, e)}
										class="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
										title="Rename chat"
										aria-label="Rename chat"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
											<path
												d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1215 3.43762 22.1215 4.00023C22.1215 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</button>

									{#if chat.messages.length >= 2}
										<button
											onclick={(e) => handleRegenerateTitle(chat.id, e)}
											class="rounded p-1 text-gray-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400"
											title="Regenerate title with AI"
											aria-label="Regenerate title with AI"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M1 4V10H7"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
												<path
													d="M23 20V14H17"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
												<path
													d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
										</button>
									{/if}
								{/if}

								{#if autoRenamingChatId !== chat.id}
									<button
										onclick={(e) => handleDeleteChat(chat.id, e)}
										class="rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
										title="Delete chat"
										aria-label="Delete chat"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M3 6H5H21"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
											<path
												d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</div>

						<!-- Last Message Preview -->
						<p class="mb-1 truncate text-xs text-gray-500 dark:text-gray-400">
							{getLastMessagePreview(chat)}
						</p>

						<!-- Timestamp -->
						<div class="flex items-center justify-between">
							<span class="text-xs text-gray-400 dark:text-gray-500">
								{formatDate(chat.updatedAt)}
							</span>
							<span class="text-xs text-gray-400 dark:text-gray-500">
								{chat.messages.length} messages
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="border-t border-gray-200 p-4 text-center dark:border-gray-700">
		<p class="text-xs text-gray-500 dark:text-gray-400">AI Tool Chat v1.0</p>
	</div>
</div>
