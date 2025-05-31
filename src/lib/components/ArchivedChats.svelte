<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Chat } from '../../app.d.ts';
	import { stripMarkdown } from '$lib/utils/markdown.js';

	interface Props {
		archivedChats: Chat[];
		isLoading?: boolean;
	}

	let { archivedChats, isLoading = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		unarchiveChat: { chatId: string };
		deleteChat: { chatId: string };
		selectChat: { chatId: string };
	}>();

	function handleUnarchiveChat(chatId: string, event: Event) {
		event.stopPropagation();
		if (confirm('Are you sure you want to restore this chat?')) {
			dispatch('unarchiveChat', { chatId });
		}
	}

	function handleDeleteChat(chatId: string, event: Event) {
		event.stopPropagation();
		if (
			confirm(
				'Are you sure you want to permanently delete this chat? This action cannot be undone.'
			)
		) {
			dispatch('deleteChat', { chatId });
		}
	}

	function handleSelectChat(chatId: string) {
		dispatch('selectChat', { chatId });
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

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Archived Chats</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{archivedChats.length} archived {archivedChats.length === 1 ? 'chat' : 'chats'}
		</p>
	</div>

	<!-- Archived Chat List -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">Loading archived chats...</div>
		{:else if archivedChats.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">
				No archived chats yet. Archive chats from the main chat list to see them here.
			</div>
		{:else}
			<div class="space-y-1 p-2">
				{#each archivedChats as chat (chat.id)}
					<div
						class="group relative cursor-pointer rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
						onclick={() => handleSelectChat(chat.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleSelectChat(chat.id)}
					>
						<!-- Chat Title -->
						<div class="mb-1 flex items-start justify-between gap-2">
							<div class="flex flex-1 items-center gap-2">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									class="text-amber-600 dark:text-amber-400"
								>
									<path
										d="M20.54 5.23L19.15 3.55C18.88 3.21 18.47 3 18 3H6C5.53 3 5.12 3.21 4.85 3.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V6.5C21 6.02 20.83 5.57 20.54 5.23ZM12 17.5L6.5 12H10V10H14V12H17.5L12 17.5ZM5.12 5L6 4H18L18.88 5H5.12Z"
										fill="currentColor"
									/>
								</svg>
								<h3 class="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{chat.title}
								</h3>
							</div>

							<!-- Actions -->
							<div
								class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									onclick={(e) => handleUnarchiveChat(chat.id, e)}
									class="rounded p-1 text-gray-400 transition-colors hover:text-green-500 dark:hover:text-green-400"
									title="Restore chat"
									aria-label="Restore chat"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M3 3V9H9"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M20.49 9A9 9 0 0 0 5.64 5.64L3 9"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M21 21V15H15"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M3.51 15A9 9 0 0 0 18.36 18.36L21 15"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>

								<button
									onclick={(e) => handleDeleteChat(chat.id, e)}
									class="rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
									title="Delete permanently"
									aria-label="Delete permanently"
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
							</div>
						</div>

						<!-- Last Message Preview -->
						<p class="mb-1 truncate text-xs text-gray-500 dark:text-gray-400">
							{getLastMessagePreview(chat)}
						</p>

						<!-- Timestamp -->
						<div class="flex items-center justify-between">
							<span class="text-xs text-gray-400 dark:text-gray-500">
								Archived {formatDate(chat.updatedAt)}
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
</div>
