<script lang="ts">
	import { networkStatus } from '$lib/services/network-status.svelte.js';
	import { getToolStats, getOfflineTools, getNetworkTools } from '$lib/tools';

	interface Props {
		showDetails?: boolean;
		compact?: boolean;
	}

	let { showDetails = false, compact = false }: Props = $props();

	let isOnline = $derived(networkStatus.isOnline);
	let lastCheck = $derived(networkStatus.lastCheck);
	let toolStats = $derived(getToolStats());
	let offlineTools = $derived(getOfflineTools());
	let networkTools = $derived(getNetworkTools());

	let statusText = $derived(
		isOnline ? (compact ? 'Online' : 'Connected') : compact ? 'Offline' : 'Disconnected'
	);

	let statusColor = $derived(
		isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
	);

	let dotColor = $derived(isOnline ? 'bg-green-500' : 'bg-red-500');

	let availableToolsCount = $derived(
		isOnline ? toolStats.enabled : Object.keys(offlineTools).length
	);

	let unavailableToolsCount = $derived(isOnline ? 0 : Object.keys(networkTools).length);

	async function handleRefresh() {
		await networkStatus.forceCheck();
	}
</script>

<div class="flex items-center gap-2">
	<!-- Status dot and text -->
	<div class="flex items-center gap-2">
		<div class="relative">
			<div class="h-2 w-2 rounded-full {dotColor}"></div>
			{#if isOnline}
				<div class="absolute inset-0 h-2 w-2 animate-ping rounded-full {dotColor} opacity-75"></div>
			{/if}
		</div>
		<span class="text-sm font-medium {statusColor}">
			{statusText}
		</span>
	</div>

	<!-- Refresh button -->
	<button
		onclick={handleRefresh}
		class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
		title="Check network status"
	>
		<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
			/>
		</svg>
	</button>

	<!-- Tool availability -->
	{#if !compact}
		<div class="text-xs text-gray-500 dark:text-gray-400">
			{availableToolsCount} tools available
			{#if unavailableToolsCount > 0}
				<span class="text-amber-600 dark:text-amber-400">
					({unavailableToolsCount} offline)
				</span>
			{/if}
		</div>
	{/if}

	<!-- Details panel -->
	{#if showDetails}
		<div class="ml-2 rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-800">
			<div class="space-y-1">
				<div class="flex justify-between">
					<span>Status:</span>
					<span class="font-medium {statusColor}">{statusText}</span>
				</div>
				{#if lastCheck}
					<div class="flex justify-between">
						<span>Last check:</span>
						<span>{lastCheck.toLocaleTimeString()}</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span>Available tools:</span>
					<span class="font-medium text-green-600 dark:text-green-400">
						{availableToolsCount}
					</span>
				</div>
				{#if unavailableToolsCount > 0}
					<div class="flex justify-between">
						<span>Offline tools:</span>
						<span class="font-medium text-red-600 dark:text-red-400">
							{unavailableToolsCount}
						</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span>Network tools:</span>
					<span>{Object.keys(networkTools).length}</span>
				</div>
				<div class="flex justify-between">
					<span>Offline tools:</span>
					<span>{Object.keys(offlineTools).length}</span>
				</div>
			</div>
		</div>
	{/if}
</div>
