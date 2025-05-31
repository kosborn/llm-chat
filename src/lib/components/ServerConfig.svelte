<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getSupportedModels,
		getModelDisplayName,
		getProviderDisplayName
	} from '$lib/utils/cost-calculator.js';

	interface ServerConfig {
		provider: string;
		model: string;
		supportedProviders: string[];
		availableModels: Record<string, string[]>;
		providerStatus: Record<string, { configured: boolean; keyFormat: string }>;
		displayNames: { provider: string; model: string };
	}

	interface ConfigUpdateRequest {
		provider: string;
		model: string;
	}

	let isOpen = $state(false);
	let config = $state<ServerConfig | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let customModel = $state('');
	let selectedProvider = $state('groq');
	let selectedModel = $state('');
	let showCustomModel = $state(false);

	export function open() {
		isOpen = true;
		loadConfig();
	}

	export function close() {
		isOpen = false;
		error = null;
		customModel = '';
		showCustomModel = false;
	}

	async function loadConfig() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/server-config');
			if (!response.ok) {
				throw new Error(`Failed to load config: ${response.statusText}`);
			}

			config = await response.json();
			if (config) {
				selectedProvider = config.provider;
				selectedModel = config.model;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function validateConfig() {
		if (!selectedProvider) {
			error = 'Please select a provider';
			return false;
		}

		const modelToUse = showCustomModel ? customModel : selectedModel;
		if (!modelToUse) {
			error = 'Please select or enter a model';
			return false;
		}

		if (showCustomModel && !customModel.trim()) {
			error = 'Please enter a custom model name';
			return false;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch('/api/server-config', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					provider: selectedProvider,
					model: modelToUse
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to validate configuration';
				return false;
			}

			// Show success message with instructions
			alert(
				`Configuration validated!\n\n${result.instructions.join('\n')}\n\nNew settings:\nAI_PROVIDER=${result.config.AI_PROVIDER}\nAI_MODEL=${result.config.AI_MODEL}`
			);

			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to validate configuration';
			return false;
		} finally {
			loading = false;
		}
	}

	function handleProviderChange() {
		if (config?.availableModels[selectedProvider]) {
			const models = config.availableModels[selectedProvider];
			selectedModel = models[0] || '';
		}
		showCustomModel = false;
		customModel = '';
		error = null;
	}

	function toggleCustomModel() {
		showCustomModel = !showCustomModel;
		if (!showCustomModel) {
			customModel = '';
		}
		error = null;
	}

	function getProviderStatusColor(provider: string): string {
		if (!config?.providerStatus[provider]) return 'text-gray-500';
		return config.providerStatus[provider].configured ? 'text-green-600' : 'text-red-600';
	}

	function getProviderStatusText(provider: string): string {
		if (!config?.providerStatus[provider]) return 'Unknown';
		return config.providerStatus[provider].configured ? 'Configured' : 'Not Configured';
	}

	function getCustomModelPlaceholder(provider: string): string {
		switch (provider) {
			case 'groq':
				return 'Enter Groq model (e.g., llama-3.1-405b-reasoning, gemma2-9b-it)';
			case 'openai':
				return 'Enter OpenAI model (e.g., gpt-4-turbo-preview, gpt-4o-2024-05-13)';
			case 'anthropic':
				return 'Enter Anthropic model (e.g., claude-3-5-sonnet-20241022)';
			default:
				return 'Enter custom model name';
		}
	}

	function getCustomModelGuidance(provider: string): string {
		switch (provider) {
			case 'groq':
				return 'Make sure the model is available on Groq. Check their documentation for the latest available models including new Llama, Mixtral, and Gemma variants.';
			case 'openai':
				return "Ensure the model exists in OpenAI's API. This includes GPT-4 variants, fine-tuned models, and newer releases not yet in our preset list.";
			case 'anthropic':
				return "Verify the model is available through Anthropic's API. This includes newer Claude versions and any custom models you have access to.";
			default:
				return "The provider will validate the model when you make a chat request. If the model is not supported, you'll receive an error message.";
		}
	}

	onMount(() => {
		if (isOpen) {
			loadConfig();
		}
	});

	$effect(() => {
		if (selectedProvider) {
			handleProviderChange();
		}
	});
</script>

{#if isOpen}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="server-config-title"
	>
		<div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<div class="mb-6 flex items-center justify-between">
				<h2 id="server-config-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Server AI Configuration
				</h2>
				<button
					onclick={close}
					class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close dialog"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<span class="ml-3 text-gray-600 dark:text-gray-400">Loading configuration...</span>
				</div>
			{:else if config}
				<div class="space-y-6">
					<!-- Current Configuration -->
					<div class="rounded-md bg-gray-50 p-4 dark:bg-gray-700">
						<h3 class="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
							Current Configuration
						</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500 dark:text-gray-400">Provider:</span>
								<span class="ml-2 font-medium">{config.displayNames.provider}</span>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Model:</span>
								<span class="ml-2 font-medium">{config.displayNames.model}</span>
							</div>
						</div>
					</div>

					<!-- Provider Selection -->
					<div>
						<label
							for="provider-select"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							AI Provider
						</label>
						<select
							id="provider-select"
							bind:value={selectedProvider}
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900
								   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						>
							{#each config.supportedProviders as provider}
								<option value={provider}>
									{getProviderDisplayName(provider)} - {getProviderStatusText(provider)}
								</option>
							{/each}
						</select>

						<!-- Provider Status -->
						<div class="mt-2 flex flex-wrap gap-2">
							{#each config.supportedProviders as provider}
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
								>
									<span
										class="mr-1 h-2 w-2 rounded-full {getProviderStatusColor(provider) ===
										'text-green-600'
											? 'bg-green-600'
											: 'bg-red-600'}"
									></span>
									<span class={getProviderStatusColor(provider)}>
										{getProviderDisplayName(provider)}: {getProviderStatusText(provider)}
									</span>
								</span>
							{/each}
						</div>
					</div>

					<!-- Model Selection -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<label
								for="model-select"
								class="text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								Model
							</label>
							<button
								onclick={toggleCustomModel}
								class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
							>
								{showCustomModel ? 'Use preset models' : 'Use custom model'}
							</button>
						</div>

						{#if showCustomModel}
							<input
								type="text"
								bind:value={customModel}
								placeholder={getCustomModelPlaceholder(selectedProvider)}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900
									   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
									   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
							/>
							<div class="mt-2 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/30">
								<div class="flex items-start gap-2">
									<svg
										class="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
									<div class="text-sm text-yellow-800 dark:text-yellow-200">
										<p class="font-medium">Custom Model</p>
										<p class="mt-1">{getCustomModelGuidance(selectedProvider)}</p>
									</div>
								</div>
							</div>
						{:else}
							<select
								id="model-select"
								bind:value={selectedModel}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900
									   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
									   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
							>
								{#each config.availableModels[selectedProvider] || [] as model}
									<option value={model}>
										{getModelDisplayName(selectedProvider, model)}
									</option>
								{/each}
							</select>
						{/if}

						<!-- Available Models Info -->
						{#if !showCustomModel && config.availableModels[selectedProvider]}
							<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
								Available models: {config.availableModels[selectedProvider].length}
							</div>
						{/if}
					</div>

					<!-- API Key Information -->
					<div class="rounded-md bg-blue-50 p-4 dark:bg-blue-900/30">
						<div class="flex items-start gap-2">
							<svg
								class="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							<div class="text-sm text-blue-800 dark:text-blue-200">
								<p class="font-medium">API Key Required</p>
								<p class="mt-1">
									Make sure you have a valid API key for {getProviderDisplayName(selectedProvider)}
									configured in your .env.local file ({config.providerStatus[selectedProvider]
										?.keyFormat || 'API key format unknown'}).
								</p>
							</div>
						</div>
					</div>

					<!-- Error Display -->
					{#if error}
						<div class="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
							<div class="flex items-start gap-2">
								<svg
									class="mt-0.5 h-4 w-4 text-red-600 dark:text-red-400"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
								<div class="text-sm text-red-800 dark:text-red-200">
									<p class="font-medium">Configuration Error</p>
									<p class="mt-1">{error}</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end gap-3 pt-4">
						<button
							onclick={close}
							class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700
								   hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							onclick={validateConfig}
							disabled={loading}
							class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white
								   hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
								   disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
						>
							{loading ? 'Validating...' : 'Validate & Apply'}
						</button>
					</div>
				</div>
			{:else if error}
				<div class="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
					<div class="flex items-start gap-2">
						<svg
							class="mt-0.5 h-4 w-4 text-red-600 dark:text-red-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="text-sm text-red-800 dark:text-red-200">
							<p class="font-medium">Failed to Load Configuration</p>
							<p class="mt-1">{error}</p>
							<button
								onclick={loadConfig}
								class="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
							>
								Try Again
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
