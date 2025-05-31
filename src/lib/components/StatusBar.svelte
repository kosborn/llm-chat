<script lang="ts">
	import { debugStore } from '$lib/stores/debug-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { apiKeyStore } from '$lib/stores/api-key-store.svelte.js';
	import {
		formatCost,
		getModelDisplayName,
		getProviderDisplayName
	} from '$lib/utils/cost-calculator.js';
	import ModelSelector from './ModelSelector.svelte';

	interface Props {
		provider?: 'groq' | 'anthropic' | 'openai';
		model?: string;
		onProviderChange?: (provider: 'groq' | 'anthropic' | 'openai') => void;
		onModelChange?: (model: string) => void;
		disabled?: boolean;
	}

	let {
		provider = 'groq',
		model = 'llama-3.3-70b-versatile',
		onProviderChange,
		onModelChange,
		disabled = false
	}: Props = $props();

	let showDetails = $state(false);

	// Status based on currently selected provider and model
	const status = $derived(() => {
		try {
			// Check if we can send messages with the current provider
			const isOnline = networkStore.isOnline;
			const apiKey = apiKeyStore.getApiKey(provider);
			const hasApiKey = !!apiKey;
			const isValidApiKey = hasApiKey && apiKeyStore.validateApiKey(apiKey);

			// Determine canSend status based on current provider:
			// - If offline and no valid API key for this provider: definitely can't send
			// - If online: can try server-side first, then client-side with API key
			// - If offline but have valid API key: can send client-side only
			let canSend = false;
			if (isOnline) {
				// Online: can always try (server-side first, then client-side fallback)
				canSend = true;
			} else if (isValidApiKey) {
				// Offline but have valid API key for this provider: can send client-side
				canSend = true;
			}

			return {
				canSend,
				hasApiKey,
				isOnline,
				isValidApiKey,
				provider,
				model,
				queuedCount: 0
			};
		} catch (error) {
			console.warn('Failed to get detailed status:', error);
			return {
				canSend: false,
				hasApiKey: false,
				isOnline: false,
				isValidApiKey: false,
				provider,
				model,
				queuedCount: 0
			};
		}
	});

	const apiMetrics = $derived(() => {
		try {
			const metrics = debugStore.getApiMetrics();
			return (
				metrics || {
					totalRequests: 0,
					totalTokens: 0,
					totalCost: 0,
					averageResponseTime: 0,
					modelUsage: {},
					providerUsage: {}
				}
			);
		} catch (error) {
			console.warn('Failed to get API metrics:', error);
			return {
				totalRequests: 0,
				totalTokens: 0,
				totalCost: 0,
				averageResponseTime: 0,
				modelUsage: {},
				providerUsage: {}
			};
		}
	});
	const sessionCost = $derived(() => apiMetrics()?.totalCost || 0);
	const sessionTokens = $derived(() => apiMetrics()?.totalTokens || 0);
</script>

<div class="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
	<div class="flex items-center justify-between">
		<!-- Left side: Model Selector and Status -->
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full {status().canSend ? 'bg-green-500' : 'bg-red-500'}"></div>
				<div>
					<ModelSelector
						{provider}
						{model}
						onProviderChange={(newProvider) => onProviderChange?.(newProvider)}
						onModelChange={(newModel) => onModelChange?.(newModel)}
						{disabled}
						statusBar={true}
					/>
				</div>
			</div>

			{#if !status().canSend}
				<span class="text-xs text-red-600 dark:text-red-400">
					{#if !status().isOnline}
						Offline
					{:else if !status().hasApiKey}
						No {getProviderDisplayName(provider)} API Key
					{:else if !status().isValidApiKey}
						Invalid {getProviderDisplayName(provider)} API Key
					{:else}
						Can't Send
					{/if}
				</span>
			{/if}
		</div>

		<!-- Right side: Session stats -->
		<div class="flex items-center gap-4">
			{#if apiMetrics().totalRequests > 0}
				<div class="flex items-center gap-3 text-xs">
					<div class="flex items-center gap-1">
						<span class="text-gray-500 dark:text-gray-400">Requests:</span>
						<span class="font-mono font-medium">{apiMetrics().totalRequests}</span>
					</div>

					{#if sessionTokens() > 0}
						<div class="flex items-center gap-1">
							<span class="text-gray-500 dark:text-gray-400">Tokens:</span>
							<span class="font-mono font-medium">{sessionTokens().toLocaleString()}</span>
						</div>
					{/if}

					{#if sessionCost() > 0}
						<div class="flex items-center gap-1">
							<span class="text-gray-500 dark:text-gray-400">Cost:</span>
							<span class="font-mono font-medium text-green-600 dark:text-green-400">
								{formatCost(sessionCost())}
							</span>
						</div>
					{/if}

					{#if apiMetrics().averageResponseTime > 0}
						<div class="flex items-center gap-1">
							<span class="text-gray-500 dark:text-gray-400">Avg:</span>
							<span class="font-mono font-medium text-blue-600 dark:text-blue-400">
								{Math.round(apiMetrics().averageResponseTime)}ms
							</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Toggle details button -->
			<button
				onclick={() => (showDetails = !showDetails)}
				class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
				title="Toggle details"
				aria-label="Toggle status details"
			>
				<svg
					class="h-4 w-4 transform transition-transform"
					class:rotate-180={showDetails}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Expandable details -->
	{#if showDetails}
		<div class="mt-2 border-t border-gray-100 pt-2 dark:border-gray-600">
			<div class="grid grid-cols-1 gap-2 text-xs md:grid-cols-2 lg:grid-cols-4">
				<div>
					<span class="text-gray-500 dark:text-gray-400">Status:</span>
					<span class="ml-1 font-mono {status().canSend ? 'text-green-600' : 'text-red-600'}">
						{status().canSend ? 'Ready' : 'Not Ready'}
					</span>
				</div>

				<div>
					<span class="text-gray-500 dark:text-gray-400">Network:</span>
					<span class="ml-1 font-mono {status().isOnline ? 'text-green-600' : 'text-red-600'}">
						{status().isOnline ? 'Online' : 'Offline'}
					</span>
				</div>

				<div>
					<span class="text-gray-500 dark:text-gray-400">API Key:</span>
					<span
						class="ml-1 font-mono {status().isValidApiKey
							? 'text-green-600'
							: status().hasApiKey
								? 'text-yellow-600'
								: 'text-red-600'}"
					>
						{status().isValidApiKey ? 'Valid' : status().hasApiKey ? 'Invalid' : 'None'}
					</span>
				</div>

				{#if status().queuedCount > 0}
					<div>
						<span class="text-gray-500 dark:text-gray-400">Queued:</span>
						<span class="ml-1 font-mono text-yellow-600">{status().queuedCount}</span>
					</div>
				{/if}
			</div>

			{#if apiMetrics()?.modelUsage && Object.keys(apiMetrics()?.modelUsage || {}).length > 1}
				<div class="mt-2">
					<span class="text-gray-500 dark:text-gray-400">Models used this session:</span>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each Object.entries(apiMetrics()?.modelUsage || {}) as [model, count] (model)}
							<span class="rounded bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900">
								{getModelDisplayName(status().provider || 'groq', model)}: {count}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if apiMetrics()?.providerUsage && Object.keys(apiMetrics()?.providerUsage || {}).length > 1}
				<div class="mt-2">
					<span class="text-gray-500 dark:text-gray-400">Providers used this session:</span>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each Object.entries(apiMetrics()?.providerUsage || {}) as [provider, count] (provider)}
							<span class="rounded bg-purple-100 px-2 py-0.5 text-xs dark:bg-purple-900">
								{getProviderDisplayName(provider)}: {count}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
