<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import ApiKeyConfig from '$lib/components/ApiKeyConfig.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';

	const { children } = $props();

	let showApiConfig = $state(false);
	let serverAvailable = $state<boolean | null>(null);
	let checkingServer = $state(false);
	let lastCheckTime = 0;
	let checkInterval: NodeJS.Timeout | null = null;

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
			console.log('Server availability check failed:', error);
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

<!-- Navigation Header -->
<nav class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<div class="text-2xl">🤖</div>
					<span class="text-xl font-semibold text-gray-900 dark:text-white">AI Tool Chat</span>
				</a>
			</div>

			<div class="flex items-center space-x-4">
				<a
					href="/"
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors {$page.url.pathname ===
					'/'
						? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
						: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}"
				>
					Chat
				</a>
				<a
					href="/tools"
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors {$page.url.pathname ===
					'/tools'
						? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
						: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}"
				>
					Tools
				</a>

				<!-- Status Indicator -->
				<div class="flex items-center gap-2">
					<!-- Clickable Status Icon -->
					<button
						onclick={() => (showApiConfig = true)}
						class="flex items-center gap-1 rounded-md p-2 text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
						title={getStatusText()}
						aria-label="Status: {getStatusText()} - Click to configure"
					>
						<div class="h-2 w-2 rounded-full {getStatusColor()}"></div>
						{getStatusIcon()}
					</button>

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
			</div>
		</div>
	</div>
</nav>

{@render children()}
<Toast />

{#if showApiConfig}
	<ApiKeyConfig isOpen={showApiConfig} onClose={() => (showApiConfig = false)} />
{/if}
