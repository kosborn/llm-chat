<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { apiKeyStore } from '$lib/stores/api-key-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';
	import { clientChatService } from '$lib/services/client-chat.js';
	import {
		countTokens,
		formatTokenCount,
		getTokenCountColor
	} from '$lib/utils/simple-token-counter';

	interface Props {
		disabled?: boolean;
		placeholder?: string;
	}

	let { disabled = false, placeholder = 'Type a message...' }: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: { message: string };
	}>();

	let inputValue = $state('');
	let textareaElement: HTMLTextAreaElement;

	// Token counting
	const tokenCount = $derived(() => countTokens(inputValue));

	function handleSubmit(event?: SubmitEvent) {
		event?.preventDefault();
		const message = inputValue.trim();
		if (message && !disabled) {
			dispatch('submit', { message });
			inputValue = '';
			// Reset textarea height
			if (textareaElement) {
				textareaElement.style.height = 'auto';
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	function autoResize() {
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 120)}px`;
		}
	}

	$effect(() => {
		if (textareaElement) {
			autoResize();
		}
	});
</script>

<div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
	<form onsubmit={handleSubmit} class="flex items-end gap-3">
		<div class="flex-1">
			<textarea
				bind:this={textareaElement}
				bind:value={inputValue}
				onkeydown={handleKeydown}
				oninput={autoResize}
				{disabled}
				{placeholder}
				rows="1"
				class="max-h-[120px] min-h-[48px] w-full resize-none overflow-hidden rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
			></textarea>
		</div>

		<button
			type="submit"
			{disabled}
			class="flex min-w-[80px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			{#if disabled}
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></div>
			{:else}
				<span>Send</span>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
				</svg>
			{/if}
		</button>
	</form>

	<div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
		<div class="flex items-center gap-4">
			<span>Press Enter to send, Shift+Enter for new line</span>
			{#if inputValue.trim()}
				<span class="font-mono {getTokenCountColor(tokenCount())}">
					{formatTokenCount(tokenCount())}
				</span>
			{/if}
		</div>

		<!-- Status and Queue Info -->
		<div class="flex items-center gap-2">
			{#if !networkStore.isOnline}
				<div class="flex items-center gap-1 text-orange-600 dark:text-orange-400">
					<div class="h-2 w-2 rounded-full bg-orange-500"></div>
					<span>Offline</span>
					{#if offlineQueueStore.hasQueuedMessages()}
						<span>({offlineQueueStore.getQueueCount()} queued)</span>
					{/if}
				</div>
			{:else if !apiKeyStore.isConfigured}
				<div class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
					<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
					<span>API key needed</span>
				</div>
			{:else if !clientChatService.canSendMessages()}
				<div class="flex items-center gap-1 text-red-600 dark:text-red-400">
					<div class="h-2 w-2 rounded-full bg-red-500"></div>
					<span>Cannot send</span>
				</div>
			{:else}
				<div class="flex items-center gap-1 text-green-600 dark:text-green-400">
					<div class="h-2 w-2 rounded-full bg-green-500"></div>
					<span>Ready</span>
				</div>
			{/if}
		</div>
	</div>
</div>
