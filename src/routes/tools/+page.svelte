<script lang="ts">
	import ToolsExplorer from '$lib/components/ToolsExplorer.svelte';
	import NetworkStatusIndicator from '$lib/components/NetworkStatusIndicator.svelte';
	import { getToolStats, getOfflineTools, getNetworkTools } from '$lib/tools';
	import { networkStatus } from '$lib/services/network-status.svelte.js';

	let toolStats = $derived(getToolStats());
	let offlineTools = $derived(getOfflineTools());
	let networkTools = $derived(getNetworkTools());
	let isOnline = $derived(networkStatus.isOnline);
</script>

<svelte:head>
	<title>Tools Explorer - AI Tool Chat</title>
	<meta name="description" content="Explore and manage available AI tools" />
</svelte:head>

<div class="h-[calc(100vh-4rem)] overflow-auto bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 py-8">
		<header class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Tools Explorer</h1>
					<p class="text-gray-600 dark:text-gray-300">
						Discover and manage the available tools for your AI chat bot
					</p>
				</div>
				<div class="flex flex-col items-end gap-2">
					<NetworkStatusIndicator />
					<div class="text-sm text-gray-500 dark:text-gray-400">
						{#if isOnline}
							{toolStats.enabled} tools available
						{:else}
							{Object.keys(offlineTools).length} offline tools available
						{/if}
					</div>
				</div>
			</div>
		</header>

		<!-- Demo Section -->
		<div
			class="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20"
		>
			<div class="flex items-start space-x-3">
				<div class="flex-shrink-0">
					<svg
						class="h-5 w-5 text-blue-600 dark:text-blue-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div>
					<h3 class="mb-2 text-lg font-medium text-blue-900 dark:text-blue-100">About Tools</h3>
					<p class="mb-3 text-sm text-blue-700 dark:text-blue-200">
						These tools extend the AI's capabilities by allowing it to perform specific tasks like
						calculations, weather lookups, text processing, and more. You can enable or disable
						tools to customize your chat experience.
					</p>
					<div class="flex flex-wrap gap-2">
						<span
							class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100"
						>
							🧮 Calculations
						</span>
						<span
							class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-100"
						>
							🌤️ Weather
						</span>
						<span
							class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-800 dark:text-purple-100"
						>
							📝 Text Processing
						</span>
						<span
							class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-800 dark:text-orange-100"
						>
							🔗 URL Operations
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Network Requirements Info -->
		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Offline Tools -->
			<div
				class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
			>
				<div class="mb-3 flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
					<h3 class="text-sm font-medium text-green-800 dark:text-green-200">
						Works Offline ({Object.keys(offlineTools).length})
					</h3>
				</div>
				<p class="mb-2 text-xs text-green-700 dark:text-green-300">
					These tools work without internet connection and are always available:
				</p>
				<div class="flex flex-wrap gap-1">
					{#each Object.values(offlineTools) as tool}
						<span
							class="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-800 dark:text-green-100"
						>
							{tool.name}
						</span>
					{/each}
				</div>
			</div>

			<!-- Network Required Tools -->
			<div
				class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
			>
				<div class="mb-3 flex items-center gap-2">
					<div class="h-3 w-3 rounded-full {isOnline ? 'bg-amber-500' : 'bg-red-500'}"></div>
					<h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">
						Requires Internet ({Object.keys(networkTools).length})
					</h3>
				</div>
				<p class="mb-2 text-xs text-amber-700 dark:text-amber-300">
					These tools need internet connection and are {isOnline
						? 'available'
						: 'currently offline'}:
				</p>
				<div class="flex flex-wrap gap-1">
					{#each Object.values(networkTools) as tool}
						<span
							class="inline-flex items-center rounded px-2 py-0.5 text-xs
							{isOnline
								? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100'
								: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}"
						>
							{tool.name}
						</span>
					{/each}
				</div>
			</div>
		</div>

		<ToolsExplorer />
	</div>
</div>
