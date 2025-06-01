<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import ApiKeyConfig from '$lib/components/ApiKeyConfig.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';
	import { mobileStore } from '$lib/stores/mobile-store.svelte.js';
	import { browser } from '$app/environment';
	import { initializePersistentSettings } from '$lib/tools/registry.js';

	const { children } = $props();

	let showApiConfig = $state(false);
	let serverAvailable = $state<boolean | null>(null);
	let checkingServer = $state(false);
	let lastCheckTime = 0;
	let checkInterval: NodeJS.Timeout | null = null;
	let mobileHeaderVisible = $state(false);

	onMount(async () => {
		// Initialize persistent tool settings first
		await initializePersistentSettings();

		checkServerAvailability();
		// Check every 30 seconds instead of constantly
		checkInterval = setInterval(() => {
			if (networkStore.isOnline) {
				checkServerAvailability();
			}
		}, 30000);

		// Add keyboard shortcut for Cmd+B (or Ctrl+B on Windows/Linux)
		function handleKeydown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
				event.preventDefault();
				// Check if we're on mobile or desktop and toggle accordingly
				if (window.innerWidth < 768) {
					mobileStore.toggleSidebar();
				} else {
					mobileStore.toggleDesktopSidebar();
				}
			}
		}

		if (browser) {
			document.addEventListener('keydown', handleKeydown);
		}

		return () => {
			if (checkInterval) {
				clearInterval(checkInterval);
			}
			if (browser) {
				document.removeEventListener('keydown', handleKeydown);
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

<!-- Mobile Header -->
<header
	class="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex h-14 items-center justify-between px-4">
		<!-- Left side: Sidebar toggle -->
		<div class="flex items-center">
			<button
				onclick={() => mobileStore.toggleSidebar()}
				class="rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
				aria-label="Toggle sidebar"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					></path>
				</svg>
			</button>
		</div>

		<!-- Center: Navigation buttons -->
		<div class="flex items-center gap-1">
			<a
				href="/"
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {$page.url.pathname ===
				'/'
					? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
					: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				Chat
			</a>
			<a
				href="/tools"
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {$page.url.pathname ===
				'/tools'
					? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
					: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				Tools
			</a>
		</div>

		<!-- Right side: Status and menu -->
		<div class="flex items-center gap-2">
			<!-- Status Indicator -->
			<button
				onclick={() => (showApiConfig = true)}
				class="flex items-center gap-1 rounded-md p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
				title={getStatusText()}
				aria-label="Status: {getStatusText()}"
			>
				<div class="h-2 w-2 rounded-full {getStatusColor()}"></div>
				{getStatusIcon()}
			</button>

			<!-- Overflow menu for additional items -->
			{#if offlineQueueStore.hasQueuedMessages()}
				<button
					onclick={() => (mobileHeaderVisible = !mobileHeaderVisible)}
					class="rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label="Toggle menu"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
						></path>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Mobile overflow menu (only shows when needed) -->
	{#if mobileHeaderVisible && offlineQueueStore.hasQueuedMessages()}
		<div class="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<div class="px-4 py-2">
				<div class="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<span>{offlineQueueStore.getQueueCount()} messages queued</span>
				</div>
			</div>
		</div>
	{/if}
</header>

<!-- Desktop Navigation -->
<nav
	class="hidden border-b border-gray-200 bg-white md:block dark:border-gray-700 dark:bg-gray-800"
>
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

				<!-- Status Indicator (Desktop) -->
				<div class="flex items-center gap-2">
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

<div class="pt-14 md:pt-0">
	{@render children()}
</div>
<Toast />

{#if showApiConfig}
	<ApiKeyConfig isOpen={showApiConfig} onClose={() => (showApiConfig = false)} />
{/if}
