<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';

	const chatId = $derived(page.params.chatId);

	onMount(async () => {
		// Initialize chat store if not already done
		if (chatStore.chats.length === 0 && !chatStore.isLoading) {
			await chatStore.init(chatId);
		}

		// If we have a chatId, try to select that chat
		if (chatId) {
			await chatStore.selectChat(chatId);

			// If the chat doesn't exist, redirect to home
			if (!chatStore.currentChat) {
				goto('/', { replaceState: true });
			}
		}
	});
</script>

<svelte:head>
	<title>{chatStore.currentChat?.title || 'Chat'} - AI Tool Chat</title>
	<meta name="description" content="Chat with AI and use powerful tools" />
</svelte:head>

<div class="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
	<ChatInterface />
</div>
