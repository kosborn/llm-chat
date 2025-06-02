<script lang="ts">
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { onMount } from 'svelte';
	import type { ProviderId } from '$lib/providers/index.js';
	import { debugConsole } from '$lib/utils/console.js';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose } = $props<Props>();

	// Component state
	let keyInput = $state('');
	let selectedProvider = $state<ProviderId>('groq');
	let keyVisible = $state(false);
	let validationState = $state<{
		isValid: boolean;
		error: string;
	}>({ isValid: false, error: '' });
	
	// Server state
	let serverStatus = $state<{
		available: boolean;
		checking: boolean;
		lastCheck: number;
	}>({ available: false, checking: false, lastCheck: 0 });

	const availableProviders = providerStore.getAllProviders();

	// Load current settings when dialog opens
	$effect(() => {
		if (isOpen) {
			keyInput = providerStore.getApiKey() || '';
			selectedProvider = providerStore.currentProvider;
			
			// Check server if not checked recently
			const now = Date.now();
			if (now - serverStatus.lastCheck > 30000) {
				performServerCheck();
			}
			
			runValidation();
		}
	});

	async function performServerCheck() {
		const now = Date.now();
		if (serverStatus.checking || now - serverStatus.lastCheck < 30000) {
			return;
		}

		serverStatus.checking = true;
		serverStatus.lastCheck = now;

		try {
			serverStatus.available = await providerStore.checkServerAvailability();
		} catch (error) {
			debugConsole.log('Server check failed:', error);
			serverStatus.available = false;
		} finally {
			serverStatus.checking = false;
		}
	}

	function runValidation() {
		// Server available means API key is optional
		if (serverStatus.available && (!keyInput || !keyInput.trim())) {
			validationState = { isValid: true, error: '' };
			return;
		}

		// No key provided
		if (!keyInput || !keyInput.trim()) {
			validationState = serverStatus.available 
				? { isValid: true, error: '' }
				: { isValid: false, error: '' };
			return;
		}

		// Validate key format
		const isValidFormat = providerStore.validateApiKey(keyInput, selectedProvider);
		if (isValidFormat) {
			validationState = { isValid: true, error: '' };
		} else {
			const provider = providerStore.getProvider(selectedProvider);
			const errorMsg = provider 
				? `${provider.displayName} API keys should start with "${provider.apiKeyPrefix}"`
				: 'Invalid API key format';
			validationState = { isValid: false, error: errorMsg };
		}
	}

	function saveConfiguration() {
		if (serverStatus.available || validationState.isValid) {
			if (keyInput.trim()) {
				providerStore.setApiKey(selectedProvider, keyInput);
			}
			providerStore.setProvider(selectedProvider);
			onClose();
		}
	}

	function clearStoredKey() {
		providerStore.clearApiKey(selectedProvider);
		keyInput = '';
		runValidation();
	}

	function cancelChanges() {
		keyInput = providerStore.getApiKey() || '';
		selectedProvider = providerStore.currentProvider;
		runValidation();
		onClose();
	}

	function useServerAI() {
		providerStore.clearApiKey();
		onClose();
	}

	// Reactive validation on provider change
	$effect(() => {
		if (selectedProvider !== undefined) {
			runValidation();
		}
	});

	// Debounced validation on key input
	$effect(() => {
		if (keyInput !== undefined) {
			const timer = setTimeout(runValidation, 100);
			return () => clearTimeout(timer);
		}
	});

	// Keyboard event handling
	onMount(() => {
		function handleKeyboard(event: KeyboardEvent) {
			if (event.key === 'Escape' && isOpen) {
				cancelChanges();
			}
		}

		document.addEventListener('keydown', handleKeyboard);
		return () => document.removeEventListener('keydown', handleKeyboard);
	});

	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			cancelChanges();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
		onclick={handleBackgroundClick}
		onkeydown={(e) => e.key === 'Enter' && handleBackgroundClick(e)}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<!-- Header -->
			<header class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					API Configuration
				</h2>
				<button
					onclick={cancelChanges}
					type="button"
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Close"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</header>

			<div class="space-y-4">
				<!-- Server Status Display -->
				{#if serverStatus.checking}
					<div class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/30">
						<div class="flex items-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent"></div>
							<span class="text-sm text-yellow-800 dark:text-yellow-200">
								Checking server availability...
							</span>
						</div>
					</div>
				{:else if serverStatus.available}
					<div class="rounded-md bg-green-50 p-3 dark:bg-green-900/30">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-2 w-2 rounded-full bg-green-500"></div>
								<span class="text-sm text-green-800 dark:text-green-200">
									Server AI is available - no API key needed!
								</span>
							</div>
							<button
								onclick={useServerAI}
								type="button"
								class="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
							>
								Use Server
							</button>
						</div>
					</div>
				{:else}
					<div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full {networkStore.isOnline ? 'bg-green-500' : 'bg-red-500'}"></div>
							<span class="text-sm text-blue-800 dark:text-blue-200">
								{networkStore.isOnline ? 'Online' : 'Offline'} -
								{networkStore.isOnline 
									? 'Server unavailable, configure your own API key'
									: 'Messages will be queued until online'}
							</span>
						</div>
					</div>
				{/if}

				<!-- Provider Selection -->
				<div>
					<label for="provider" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						AI Provider
					</label>
					<select
						id="provider"
						bind:value={selectedProvider}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900
							   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
							   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{#each availableProviders as provider (provider.id)}
							<option value={provider.id}>
								{provider.displayName} ({provider.description})
							</option>
						{/each}
					</select>
				</div>

				<!-- API Key Input -->
				<div>
					<label for="apikey" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						API Key
					</label>
					<div class="relative">
						<input
							id="apikey"
							type={keyVisible ? 'text' : 'password'}
							bind:value={keyInput}
							placeholder={serverStatus.available
								? 'Optional - server AI is available'
								: `Enter your ${providerStore.getProvider(selectedProvider)?.displayName || 'AI'} API key`}
							class="w-full rounded-md border bg-white px-3 py-2 pr-10 text-gray-900
								   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
								   {!validationState.isValid && keyInput && keyInput.length > 0 
									   ? 'border-red-500' 
									   : 'border-gray-300'}"
						/>
						<button
							type="button"
							onclick={() => (keyVisible = !keyVisible)}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							aria-label={keyVisible ? 'Hide API key' : 'Show API key'}
						>
							{#if keyVisible}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.757 7.757m13.484 13.484L3 3"></path>
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
								</svg>
							{/if}
						</button>
					</div>
					{#if validationState.error}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{validationState.error}</p>
					{/if}
				</div>

				<!-- Getting API Key Instructions -->
				<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
					<h4 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
						How to get your {providerStore.getProvider(selectedProvider)?.displayName || 'AI'} API key:
					</h4>
					<div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
						{#if providerStore.getProvider(selectedProvider)}
							{@const currentProvider = providerStore.getProvider(selectedProvider)}
							{#if currentProvider}
								<p>1. Visit <a 
									href={currentProvider.signupUrl} 
									target="_blank"
									class="text-blue-600 hover:underline dark:text-blue-400"
								>{currentProvider.signupUrl}</a></p>
								<p>2. Sign in or create an account</p>
								<p>3. Navigate to API Keys section</p>
								<p>4. Create a new API key</p>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Security Information -->
				<div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
					<div class="flex items-start gap-2">
						<svg class="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<div class="text-sm text-blue-800 dark:text-blue-200">
							<p class="font-medium">Security Notice</p>
							<p>
								{#if serverStatus.available}
									Server AI is available, so an API key is optional. If you provide one, it's stored
									locally and never sent to our servers.
								{:else}
									Your API key is stored locally in your browser and never sent to our servers. All
									AI requests are made directly from your browser to the provider.
								{/if}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<footer class="mt-6 flex justify-end gap-3">
				{#if providerStore.getApiKey(selectedProvider)}
					<button
						onclick={clearStoredKey}
						type="button"
						class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50
							   dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/30"
					>
						Clear Key
					</button>
				{/if}
				<button
					onclick={cancelChanges}
					type="button"
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50
						   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					Cancel
				</button>
				<button
					onclick={saveConfiguration}
					type="button"
					disabled={!serverStatus.available && !validationState.isValid}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700
						   disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
				>
					{serverStatus.available ? 'Save Settings' : 'Save'}
				</button>
			</footer>
		</div>
	</div>
{/if}