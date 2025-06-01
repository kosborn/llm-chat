<script lang="ts">
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';
	import { onMount } from 'svelte';
	import { debugConsole } from '$lib/utils/console.js';

	interface Props {
		onConfigureApi: () => void;
	}

	let { onConfigureApi }: Props = $props();
	let serverAvailable = $state<boolean | null>(null);
	let checkingServer = $state(false);
	let lastCheckTime = 0;
	let checkInterval: NodeJS.Timeout | null = null;

	// Check server availability on mount and set up periodic checks
	onMount(() => {
		checkServerAvailability();
		// Check every 30 seconds instead of constantly
		checkInterval = setInterval(() => {
			if (networkStore.isOnline) {
				checkServerAvailability();
			}
		}, 30000);

		return () => {
			if (checkInterval) {
				clearInterval(checkInterval);
			}
		};
	});

	async function checkServerAvailability() {
		// Debounce checks - don't check more than once every 5 seconds
		const now = Date.now();
		if (checkingServer || now - lastCheckTime < 5000) {
			return;
		}

		lastCheckTime = now;
		checkingServer = true;

		try {
			serverAvailable = await providerStore.checkServerAvailability();
		} catch (error) {
			debugConsole.log('Server availability check failed:', error);
			serverAvailable = false;
		} finally {
			checkingServer = false;
		}
	}

	function needsApiKey(): boolean {
		// If server is available, no API key needed
		if (serverAvailable === true) return false;
		// If server status unknown and we're online, might not need API key
		if (serverAvailable === null && networkStore.isOnline) return false;
		// If server is unavailable, we need an API key
		return serverAvailable === false && !providerStore.isConfigured;
	}

	function getStatusIcon(): string {
		if (checkingServer) return '🔄';
		if (!networkStore.isOnline) return '📴';
		if (serverAvailable === true) return '🚀';
		if (needsApiKey()) return '⚙️';
		return '✅';
	}

	function getStatusText(): string {
		if (checkingServer) {
			return 'Checking server...';
		}
		if (!networkStore.isOnline) {
			const queueCount = offlineQueueStore.getQueueCount();
			return queueCount > 0 ? `Offline (${queueCount} queued)` : 'Offline';
		}
		if (serverAvailable === true) {
			return 'Server AI Available';
		}
		if (needsApiKey()) {
			return 'API Key Needed';
		}
		if (providerStore.isConfigured) {
			return `Online (${providerStore.getProviderName()})`;
		}
		return 'Ready to Chat';
	}

	function getStatusColor(): string {
		if (checkingServer) return 'bg-blue-500';
		if (!networkStore.isOnline) return 'bg-red-500';
		if (serverAvailable === true) return 'bg-green-500';
		if (needsApiKey()) return 'bg-yellow-500';
		return 'bg-green-500';
	}
</script>

<div class="flex items-center gap-2 rounded-lg bg-gray-100 p-2 text-sm dark:bg-gray-800">
	<!-- Status Indicator -->
	<div class="flex items-center gap-2">
		<div class="h-2 w-2 rounded-full {getStatusColor()}"></div>
		<span class="text-gray-700 dark:text-gray-300">
			{getStatusIcon()}
			{getStatusText()}
		</span>
	</div>

	<!-- Configure Button -->
	{#if needsApiKey()}
		<button
			onclick={onConfigureApi}
			class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
		>
			Configure
		</button>
	{:else}
		<button
			onclick={onConfigureApi}
			class="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
		>
			Settings
		</button>
	{/if}

	<!-- Queue Status -->
	{#if offlineQueueStore.hasQueuedMessages()}
		<div class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
			<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span>{offlineQueueStore.getQueueCount()} pending</span>
		</div>
	{/if}
</div>
