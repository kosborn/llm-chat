<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';

	onMount(async () => {
		// Initialize chat store if not already done
		if (chatStore.chats.length === 0 && !chatStore.isLoading) {
			await chatStore.init();
		}

		// If there are existing chats, redirect to the most recent one
		if (chatStore.chats.length > 0 && chatStore.currentChatId) {
			goto(`/chat/${chatStore.currentChatId}`, { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>AI Tool Chat</title>
	<meta name="description" content="Chat with AI and use powerful tools" />
</svelte:head>

<div class="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
	<ChatInterface />
</div>
