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
	const supportedModels = $derived(
		providerStore.getAvailableModels(provider).map((model) => model.id)
	);

	// Get current provider status
	const currentStatus = $derived(providerStore.status);
	const isLoading = $derived(providerStore.isLoading);
	const isCurrentProviderReady = $derived(
		currentStatus?.provider === provider && currentStatus?.canSend
	);
	const hasApiKey = $derived(currentStatus?.provider === provider && currentStatus?.hasApiKey);
	const isServerAvailable = $derived(currentStatus?.isServerAvailable);
	const isValidApiKey = $derived(
		currentStatus?.provider === provider && currentStatus?.isValidApiKey
	);

	// Model validation status
	const isCurrentModelValid = $derived(
		supportedModels.length > 0 && supportedModels.includes(model)
	);

	// Current provider status info
	const currentProviderStatus = $derived(() => {
		// Show loading state
		if (isLoading) {
			return {
				class: 'text-blue-500 animate-pulse',
				icon: '◐',
				text: 'Checking...',
				description: 'Verifying provider status'
			};
		}

		if (isCurrentProviderReady) {
			const source = isValidApiKey ? 'API Key' : 'Server';
			return {
				class: 'text-green-500',
				icon: '●',
				text: 'Ready',
				description: `Connected via ${source}`
			};
		} else if (hasApiKey && !isValidApiKey) {
			return {
				class: 'text-red-500',
				icon: '●',
				text: 'Invalid API Key',
				description: 'API key format is incorrect or expired'
			};
		} else if (hasApiKey && !isCurrentProviderReady) {
			return {
				class: 'text-yellow-500',
				icon: '●',
				text: 'API Key Set',
				description: 'API key configured but not verified'
			};
		} else if (isServerAvailable) {
			return {
				class: 'text-blue-500',
				icon: '●',
				text: 'Server Available',
				description: 'Using local server connection'
			};
		} else {
			return {
				class: 'text-red-500',
				icon: '●',
				text: 'Not Ready',
				description: 'No API key set and server unavailable'
			};
		}
	});

	// Refresh status function
	async function refreshStatus() {
		await providerStore.refreshStatus();
	}

	// Enhanced status indicator with more detailed information
	const getStatusIndicator = (providerId: ProviderId) => {
		// For non-current providers, check their configuration status
		const hasProviderApiKey = providerStore.getApiKey(providerId);
		const providerInfo = providerStore.getProvider(providerId);

		if (hasProviderApiKey) {
			return {
				class: 'text-gray-400',
				icon: '●',
				text: 'Configured',
				description: 'API key is set for this provider'
			};
		} else if (isServerAvailable && providerInfo) {
			return {
				class: 'text-gray-400',
				icon: '●',
				text: 'Available',
				description: 'Can use via server connection'
			};
		} else {
			return {
				class: 'text-gray-300',
				icon: '○',
				text: 'Needs Setup',
				description: 'Requires API key configuration'
			};
		}
	};

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
		<span
			class="text-xs {currentProviderStatus.class}"
			title="{currentProviderStatus.text}: {currentProviderStatus.description}"
			>{currentProviderStatus.icon}</span
		>
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
			<div class="flex items-center gap-2">
				<label for="provider-select" class="text-xs font-medium text-gray-700 dark:text-gray-300">
					AI Provider
				</label>
				<div class="flex items-center gap-1" title={currentProviderStatus.description}>
					<span class="text-xs {currentProviderStatus.class}">{currentProviderStatus.icon}</span>
					<span class="text-xs {currentProviderStatus.class}">{currentProviderStatus.text}</span>
				</div>
			</div>
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
			<div class="flex items-center gap-2">
				<label for="model-select" class="text-xs font-medium text-gray-700 dark:text-gray-300">
					Model
				</label>
				{#if !isCurrentModelValid}
					<span
						class="text-xs text-red-500"
						title="Current model is not available for this provider"
					>
						⚠ Invalid
					</span>
				{:else}
					<span class="text-xs text-green-500" title="Model is valid for current provider">
						✓ Valid
					</span>
				{/if}
				<button
					onclick={refreshStatus}
					disabled={isLoading}
					class="ml-auto text-xs text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50
						   dark:text-gray-400 dark:hover:text-gray-200"
					title="Refresh provider status"
				>
					{#if isLoading}
						<span class="animate-spin">⟳</span>
					{:else}
						⟳
					{/if}
				</button>
			</div>
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
						{modelOption === model ? '● ' : ''}{providerStore.getModelDisplayName(
							provider,
							modelOption
						)}
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
				<div class="mt-1 flex items-center gap-2">
					<span
						>Model: <span class="font-mono"
							>{providerStore.getModelDisplayName(provider, model)}</span
						></span
					>
					{#if !isCurrentModelValid}
						<span class="text-xs text-red-500">⚠ Not available for current provider</span>
					{/if}
				</div>
				{#if currentStatus && currentStatus.provider === provider}
					<div class="mt-1">
						<div class="flex items-center gap-1">
							<span class="text-xs {currentProviderStatus.class}">{currentProviderStatus.icon}</span
							>
							<span>Status: {currentProviderStatus.text}</span>
						</div>
						<div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
							{currentProviderStatus.description}
						</div>
						{#if currentStatus.errorMessage}
							<div class="mt-0.5 text-xs text-red-500">
								Error: {currentStatus.errorMessage}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
