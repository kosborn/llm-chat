<script lang="ts">
	import {
		getSupportedModels,
		getModelDisplayName,
		getProviderDisplayName
	} from '$lib/utils/cost-calculator.js';

	interface Props {
		provider: 'groq' | 'anthropic' | 'openai';
		model: string;
		onProviderChange: (provider: 'groq' | 'anthropic' | 'openai') => void;
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

	// Available providers in preferred order
	const PROVIDERS: Array<{
		value: 'groq' | 'anthropic' | 'openai';
		label: string;
		description: string;
	}> = [
		{ value: 'groq', label: 'Groq', description: 'Fast, free tier available' },
		{ value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
		{ value: 'openai', label: 'OpenAI', description: 'GPT models' }
	];

	// Default models for each provider
	const DEFAULT_MODELS = {
		groq: 'llama-3.3-70b-versatile',
		anthropic: 'claude-3-5-sonnet-20241022',
		openai: 'gpt-4o-mini'
	};

	// Get supported models for current provider
	const supportedModels = $derived(getSupportedModels(provider));

	// Ensure model is valid for current provider
	$effect(() => {
		if (provider && supportedModels.length > 0 && !supportedModels.includes(model)) {
			// Switch to default model for this provider
			onModelChange(DEFAULT_MODELS[provider]);
		}
	});

	function handleProviderChange(newProvider: 'groq' | 'anthropic' | 'openai') {
		onProviderChange(newProvider);
		// Auto-select default model for new provider
		onModelChange(DEFAULT_MODELS[newProvider]);
	}
</script>

{#if statusBar}
	<!-- Ultra-compact status bar mode -->
	<div class="flex items-center gap-2">
		<select
			bind:value={provider}
			onchange={(e) =>
				handleProviderChange(e.currentTarget.value as 'groq' | 'anthropic' | 'openai')}
			{disabled}
			class="rounded border-0 bg-transparent px-1 py-0 text-xs font-medium text-gray-900
				   focus:ring-1 focus:ring-blue-500 focus:outline-none
				   disabled:text-gray-500
				   dark:text-gray-100 dark:disabled:text-gray-400"
		>
			{#each PROVIDERS as providerOption (providerOption.value)}
				<option value={providerOption.value}>
					{providerOption.label}
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
					{getModelDisplayName(provider, modelOption)}
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
				onchange={(e) =>
					handleProviderChange(e.currentTarget.value as 'groq' | 'anthropic' | 'openai')}
				{disabled}
				class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900
					   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
					   disabled:bg-gray-100 disabled:text-gray-500
					   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
					   dark:disabled:bg-gray-800 dark:disabled:text-gray-400
					   {compact ? 'text-xs' : 'text-sm'}"
			>
				{#each PROVIDERS as providerOption (providerOption.value)}
					<option value={providerOption.value}>
						{providerOption.label} - {providerOption.description}
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
						{getModelDisplayName(provider, modelOption)}
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
					<span class="font-medium">{getProviderDisplayName(provider)}:</span>
					{#if provider === 'groq'}
						<span>Free tier available, fast inference</span>
					{:else if provider === 'anthropic'}
						<span>Claude models, excellent reasoning</span>
					{:else if provider === 'openai'}
						<span>GPT models, broad capabilities</span>
					{/if}
				</div>
				<div class="mt-1">
					Model: <span class="font-mono">{getModelDisplayName(provider, model)}</span>
				</div>
			</div>
		{/if}
	</div>
{/if}
