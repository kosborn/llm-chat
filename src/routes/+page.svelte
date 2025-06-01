<script lang="ts">
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { mobileStore } from '$lib/stores/mobile-store.svelte.js';
</script>

<svelte:head>
	<title>AI Tool Chat</title>
	<meta name="description" content="Chat with AI and use powerful tools" />
</svelte:head>

<div class={mobileStore.isMobile ? 'h-[calc(100vh-3rem)]' : 'h-[calc(100vh-4rem)]'}>
	<ChatInterface />
</div>
