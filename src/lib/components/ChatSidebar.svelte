<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Chat } from '../../app.d.ts';
	import { stripMarkdown } from '$lib/utils/markdown.js';
	import { getProviderDisplayName } from '$lib/utils/cost-calculator.js';

	interface Props {
		chats: Chat[];
		currentChatId: string | null;
		isLoading?: boolean;
		autoRenamingChatId?: string | null;
	}

	let { chats, currentChatId, isLoading = false, autoRenamingChatId = null }: Props = $props();

	const dispatch = createEventDispatcher<{
		selectChat: { chatId: string };
		newChat: Record<string, never>;
		archiveChat: { chatId: string };
		renameChat: { chatId: string; title: string };
		closeSidebar: Record<string, never>;
		closeDesktopSidebar: Record<string, never>;
	}>();

	let editingChatId = $state<string | null>(null);
	let editingTitle = $state('');

	function handleNewChat() {
		dispatch('newChat', {});
	}

	function handleCloseSidebar() {
		dispatch('closeSidebar', {});
	}

	function handleCloseDesktopSidebar() {
		dispatch('closeDesktopSidebar', {});
	}

	function handleSelectChat(chatId: string) {
		if (editingChatId) return;
		dispatch('selectChat', { chatId });
	}

	function handleArchiveChat(chatId: string, event: Event) {
		event.stopPropagation();
		dispatch('archiveChat', { chatId });
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

	import { providerStore } from '$lib/stores/provider-store.svelte.js';

	function getProviderIcon(provider?: string): string {
		if (!provider) return '💬';

		const providerConfig = providerStore.getProvider(provider as any);
		return providerConfig?.icon || '🤖';
	}

	function getChatProvider(chat: Chat): string | undefined {
		// Find the most recent assistant message with metadata
		for (let i = chat.messages.length - 1; i >= 0; i--) {
			const message = chat.messages[i];
			if (message.role === 'assistant' && message.apiMetadata?.provider) {
				return message.apiMetadata.provider;
			}
		}
		return undefined;
	}
</script>

<div class="flex h-full flex-col">
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
									<span
										class="text-sm"
										title={getChatProvider(chat)
											? getProviderDisplayName(getChatProvider(chat)!)
											: 'No provider'}
									>
										{getProviderIcon(getChatProvider(chat))}
									</span>
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
								{/if}

								{#if autoRenamingChatId !== chat.id}
									<button
										onclick={(e) => handleArchiveChat(chat.id, e)}
										class="rounded p-1 text-gray-400 transition-colors hover:text-amber-500 dark:hover:text-amber-400"
										title="Archive chat"
										aria-label="Archive chat"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M20.54 5.23L19.15 3.55C18.88 3.21 18.47 3 18 3H6C5.53 3 5.12 3.21 4.85 3.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V6.5C21 6.02 20.83 5.57 20.54 5.23ZM12 17.5L6.5 12H10V10H14V12H17.5L12 17.5ZM5.12 5L6 4H18L18.88 5H5.12Z"
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

	<!-- Action Buttons at Bottom -->
	<div class="border-t border-gray-200 p-4 dark:border-gray-700">
		<!-- Mobile: Close button above New Chat -->
		<div class="mb-3 md:hidden">
			<button
				onclick={handleCloseSidebar}
				class="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
				aria-label="Close sidebar"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
				Close
			</button>
		</div>

		<!-- Desktop: Hide button and New Chat button side by side -->
		<div class="flex gap-2">
			<!-- Desktop Hide Sidebar Button -->
			<button
				onclick={handleCloseDesktopSidebar}
				class="hidden items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-700 transition-colors hover:bg-gray-50 md:flex dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				aria-label="Hide sidebar"
				title="Hide sidebar"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"
					></path>
				</svg>
			</button>

			<!-- New Chat Button -->
			<button
				onclick={handleNewChat}
				disabled={isLoading}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg
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
	</div>
</div>
