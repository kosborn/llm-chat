<script lang="ts">
	import {
		getSupportedModels,
		getModelDisplayName,
		getProviderDisplayName
	} from '$lib/utils/cost-calculator.js';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';

	interface Props {
		chatId: string;
		onProviderChange?: (provider: 'groq' | 'openai' | 'anthropic', model: string) => void;
	}

	let { chatId, onProviderChange }: Props = $props();

	let isOpen = $state(false);
	let selectedProvider = $state<'groq' | 'openai' | 'anthropic'>('groq');
	let selectedModel = $state('');
	let customModel = $state('');
	let showCustomModel = $state(false);
	let loading = $state(false);

	const supportedProviders: ('groq' | 'openai' | 'anthropic')[] = ['groq', 'openai', 'anthropic'];

	function loadCurrentSettings() {
		selectedProvider = chatStore.getChatProvider(chatId);
		selectedModel = chatStore.getChatModel(chatId);
		customModel = '';
		showCustomModel = false;
	}

	function toggleDropdown() {
		if (!isOpen) {
			loadCurrentSettings();
		}
		isOpen = !isOpen;
	}

	function handleProviderChange() {
		const models = getSupportedModels(selectedProvider);
		selectedModel = models[0] || chatStore.getDefaultModelForProvider(selectedProvider);
		showCustomModel = false;
		customModel = '';
	}

	function toggleCustomModel() {
		showCustomModel = !showCustomModel;
		if (!showCustomModel) {
			customModel = '';
			const models = getSupportedModels(selectedProvider);
			selectedModel = models[0] || chatStore.getDefaultModelForProvider(selectedProvider);
		}
	}

	async function applyChanges() {
		loading = true;
		try {
			const modelToUse = showCustomModel ? customModel.trim() : selectedModel;
			if (!modelToUse) {
				return;
			}

			await chatStore.updateChatProvider(chatId, selectedProvider, modelToUse);
			onProviderChange?.(selectedProvider, modelToUse);
			isOpen = false;
		} catch (error) {
			console.error('Failed to update chat provider:', error);
		} finally {
			loading = false;
		}
	}

	function getCurrentProviderDisplay(): string {
		const provider = chatStore.getChatProvider(chatId);
		const model = chatStore.getChatModel(chatId);
		return `${getProviderDisplayName(provider)} • ${getModelDisplayName(provider, model)}`;
	}

	function getCustomModelPlaceholder(provider: string): string {
		switch (provider) {
			case 'groq':
				return 'Enter Groq model (e.g., llama-3.1-405b-reasoning)';
			case 'openai':
				return 'Enter OpenAI model (e.g., gpt-4-turbo-preview)';
			case 'anthropic':
				return 'Enter Anthropic model (e.g., claude-3-5-sonnet-20241022)';
			default:
				return 'Enter custom model name';
		}
	}

	$effect(() => {
		if (selectedProvider) {
			handleProviderChange();
		}
	});
</script>

<div class="relative">
	<!-- Current Selection Button -->
	<button
		onclick={toggleDropdown}
		class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
			   hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
			   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
		title="Change AI provider and model for this chat"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
			/>
		</svg>
		<span class="truncate">{getCurrentProviderDisplay()}</span>
		<svg
			class="h-4 w-4 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown Panel -->
	{#if isOpen}
		<div
			class="absolute top-full right-0 z-50 mt-1 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-600 dark:bg-gray-800"
		>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">AI Provider & Model</h3>
					<button
						onclick={() => (isOpen = false)}
						class="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Provider Selection -->
				<div>
					<label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
						Provider
					</label>
					<select
						bind:value={selectedProvider}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
							   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
							   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{#each supportedProviders as provider}
							<option value={provider}>
								{getProviderDisplayName(provider)}
							</option>
						{/each}
					</select>
				</div>

				<!-- Model Selection -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<label class="text-xs font-medium text-gray-700 dark:text-gray-300"> Model </label>
						<button
							onclick={toggleCustomModel}
							class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
						>
							{showCustomModel ? 'Presets' : 'Custom'}
						</button>
					</div>

					{#if showCustomModel}
						<input
							type="text"
							bind:value={customModel}
							placeholder={getCustomModelPlaceholder(selectedProvider)}
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
								   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						/>
					{:else}
						<select
							bind:value={selectedModel}
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
								   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						>
							{#each getSupportedModels(selectedProvider) as model}
								<option value={model}>
									{getModelDisplayName(selectedProvider, model)}
								</option>
							{/each}
						</select>
					{/if}

					{#if showCustomModel}
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							The provider will validate the model when you send a message.
						</p>
					{/if}
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-2 pt-2">
					<button
						onclick={() => (isOpen = false)}
						class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700
							   hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
							   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					>
						Cancel
					</button>
					<button
						onclick={applyChanges}
						disabled={loading || (showCustomModel && !customModel.trim())}
						class="rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white
							   hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
							   disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
					>
						{loading ? 'Applying...' : 'Apply'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
