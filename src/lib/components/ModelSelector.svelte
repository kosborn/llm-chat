<script lang="ts">
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import type { ProviderId } from '$lib/providers';

	interface Props {
		provider: ProviderId;
		model: string;
		onProviderChange: (provider: ProviderId) => void;
		onModelChange: (model: string) => void;
		disabled?: boolean;
		compact?: boolean;
		statusBar?: boolean;
	}

	let {
		provider,
		model,
		onProviderChange,
		onModelChange,
		disabled = false,
		compact = false,
		statusBar = false
	}: Props = $props();

	// Get providers sorted by priority
	const providers = providerStore.getAllProviders();

	// Get supported models for current provider
	const supportedModels = $derived(providerStore.getAvailableModels(provider).map((model) => model.id));

	// Ensure model is valid for current provider
	$effect(() => {
		if (provider && supportedModels.length > 0 && !supportedModels.includes(model)) {
			// Switch to default model for this provider
			onModelChange(providerStore.getDefaultModelForProvider(provider));
		}
	});

	function handleProviderChange(newProvider: ProviderId) {
		onProviderChange(newProvider);
		// Auto-select default model for new provider
		onModelChange(providerStore.getDefaultModelForProvider(newProvider));
	}
</script>

{#if statusBar}
	<!-- Ultra-compact status bar mode -->
	<div class="flex items-center gap-2">
		<select
			bind:value={provider}
			onchange={(e) => handleProviderChange(e.currentTarget.value as ProviderId)}
			{disabled}
			class="rounded border-0 bg-transparent px-1 py-0 text-xs font-medium text-gray-900
				   focus:ring-1 focus:ring-blue-500 focus:outline-none
				   disabled:text-gray-500
				   dark:text-gray-100 dark:disabled:text-gray-400"
		>
			{#each providers as providerOption (providerOption.id)}
				<option value={providerOption.id}>
					{providerOption.displayName}
				</option>
			{/each}
		</select>
		<span class="text-xs text-gray-400 dark:text-gray-500">/</span>
		<select
			bind:value={model}
			onchange={(e) => onModelChange(e.currentTarget.value)}
			{disabled}
			class="rounded border-0 bg-transparent px-1 py-0 text-xs text-gray-700
				   focus:ring-1 focus:ring-blue-500 focus:outline-none
				   disabled:text-gray-500
				   dark:text-gray-300 dark:disabled:text-gray-400"
		>
			{#each supportedModels as modelOption (modelOption)}
				<option value={modelOption}>
					{providerStore.getModelDisplayName(provider, modelOption)}
				</option>
			{/each}
		</select>
	</div>
{:else}
	<div class="flex flex-col gap-2 {compact ? 'text-sm' : ''}">
		<!-- Provider Selection -->
		<div class="flex flex-col gap-1">
			<label for="provider-select" class="text-xs font-medium text-gray-700 dark:text-gray-300">
				AI Provider
			</label>
			<select
				id="provider-select"
				bind:value={provider}
				onchange={(e) => handleProviderChange(e.currentTarget.value as ProviderId)}
				{disabled}
				class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900
					   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
					   disabled:bg-gray-100 disabled:text-gray-500
					   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
					   dark:disabled:bg-gray-800 dark:disabled:text-gray-400
					   {compact ? 'text-xs' : 'text-sm'}"
			>
				{#each providers as providerOption (providerOption.id)}
					<option value={providerOption.id}>
						{providerOption.displayName} - {providerOption.description}
					</option>
				{/each}
			</select>
		</div>

		<!-- Model Selection -->
		<div class="flex flex-col gap-1">
			<label for="model-select" class="text-xs font-medium text-gray-700 dark:text-gray-300">
				Model
			</label>
			<select
				id="model-select"
				bind:value={model}
				onchange={(e) => onModelChange(e.currentTarget.value)}
				{disabled}
				class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900
					   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
					   disabled:bg-gray-100 disabled:text-gray-500
					   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
					   dark:disabled:bg-gray-800 dark:disabled:text-gray-400
					   {compact ? 'text-xs' : 'text-sm'}"
			>
				{#each supportedModels as modelOption (modelOption)}
					<option value={modelOption}>
						{providerStore.getModelDisplayName(provider, modelOption)}
					</option>
				{/each}
			</select>
		</div>

		{#if !compact}
			<!-- Provider Info -->
			<div
				class="rounded-md bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
			>
				<div class="flex items-center gap-1">
					<span class="font-medium">{providerStore.getProviderDisplayName(provider)}:</span>
					<span>{providers.find((p) => p.id === provider)?.description || 'AI models'}</span>
				</div>
				<div class="mt-1">
					Model: <span class="font-mono">{providerStore.getModelDisplayName(provider, model)}</span>
				</div>
			</div>
		{/if}
	</div>
{/if}
