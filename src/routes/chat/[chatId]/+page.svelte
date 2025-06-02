<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';

	interface Props {
		data: { chatId: string };
	}

	let { data }: Props = $props();
	let pageTitle = $state('Chat - AI Tool Chat');

	onMount(async () => {
		// Add safety checks for data availability
		if (!data || !data.chatId) {
			goto('/', { replaceState: true });
			return;
		}

		const chatId = data.chatId;

		// Initialize chat store if not already done
		if (chatStore.chats.length === 0 && !chatStore.isLoading) {
			await chatStore.init(chatId);
		}

		// Try to select that chat
		await chatStore.selectChat(chatId);

		// If the chat doesn't exist, redirect to home
		if (!chatStore.currentChat) {
			goto('/', { replaceState: true });
			return;
		}

		// Update page title once chat is loaded
		if (chatStore.currentChat?.title) {
			pageTitle = `${chatStore.currentChat.title} - AI Tool Chat`;
		}
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content="Chat with AI and use powerful tools" />
</svelte:head>

<div class="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
	<ChatInterface />
</div>
