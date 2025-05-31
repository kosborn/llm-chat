<script lang="ts">
	import { apiKeyStore } from '$lib/stores/api-key-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { getAllProviders, getProvider, type ProviderId } from '$lib/providers';
	import { onMount } from 'svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let apiKey = $state('');
	let provider = $state<ProviderId>('groq');
	let showKey = $state(false);
	let isValid = $state(false);
	let errorMessage = $state('');
	let serverAvailable = $state(false);
	let checkingServer = $state(false);
	let lastCheckTime = 0;

	// Get providers sorted by priority
	const providers = getAllProviders();

	// Initialize with current values - only check server once when opened
	$effect(() => {
		if (isOpen) {
			apiKey = apiKeyStore.getApiKey() || '';
			provider = apiKeyStore.provider;
			// Only check server if we haven't checked recently (within 30 seconds)
			const now = Date.now();
			if (now - lastCheckTime > 30000) {
				checkServerAvailability();
			}
			validateKey();
		}
	});

	async function checkServerAvailability() {
		// Debounce checks - don't check more than once every 30 seconds
		const now = Date.now();
		if (checkingServer || now - lastCheckTime < 30000) {
			return;
		}

		lastCheckTime = now;
		checkingServer = true;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [{ role: 'user', content: 'health-check' }]
				})
			});

			if (response.ok) {
				// For health check, we expect a JSON response
				const data = await response.json();
				serverAvailable = data.available === true;
			} else {
				// Check if it's a 503 with JSON error message
				const contentType = response.headers.get('content-type');
				if (contentType && contentType.includes('application/json')) {
					const data = await response.json();
					console.log('Server unavailable:', data.error);
				}
				serverAvailable = false;
			}
		} catch (error) {
			console.log('Server availability check failed:', error);
			serverAvailable = false;
		} finally {
			checkingServer = false;
		}
	}

	function validateKey() {
		// If server is available, API key is optional but if provided should be valid
		if (serverAvailable && (!apiKey || !apiKey.trim())) {
			isValid = true;
			errorMessage = '';
			return;
		}

		if (!apiKey || !apiKey.trim()) {
			if (serverAvailable) {
				isValid = true;
				errorMessage = '';
			} else {
				isValid = false;
				errorMessage = '';
			}
			return;
		}

		if (validateApiKeyFormat(apiKey, provider)) {
			isValid = true;
			errorMessage = '';
		} else {
			isValid = false;
			errorMessage = getValidationError();
		}
	}

	function validateApiKeyFormat(key: string, prov: string): boolean {
		return apiKeyStore.validateApiKey(key, prov as ProviderId);
	}

	function getValidationError(): string {
		const providerConfig = getProvider(provider);
		if (providerConfig) {
			return `${providerConfig.displayName} API keys should start with "${providerConfig.apiKeyPrefix}"`;
		}
		return 'Invalid API key format';
	}

	function handleSave() {
		// If server is available, we can save with empty API key
		if (serverAvailable || isValid) {
			apiKeyStore.setApiKey(apiKey, provider);
			onClose();
		}
	}

	function handleClear() {
		apiKeyStore.clearApiKey();
		apiKey = '';
		validateKey();
	}

	function handleCancel() {
		// Reset to stored values
		apiKey = apiKeyStore.getApiKey() || '';
		provider = apiKeyStore.provider;
		validateKey();
		onClose();
	}

	function handleUseServer() {
		// Clear any existing API key and close
		apiKeyStore.clearApiKey();
		onClose();
	}

	// Watch for provider changes to revalidate
	$effect(() => {
		if (provider !== undefined) {
			validateKey();
		}
	});

	// Watch for API key changes to validate (with debouncing)
	$effect(() => {
		if (apiKey !== undefined) {
			const timeoutId = setTimeout(() => {
				validateKey();
			}, 100);
			return () => clearTimeout(timeoutId);
		}
	});

	// Handle escape key and focus management
	onMount(() => {
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape' && isOpen) {
				handleCancel();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div
		class="bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center bg-black"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">API Configuration</h2>
				<button
					onclick={handleCancel}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Close dialog"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<!-- Server Status -->
				{#if checkingServer}
					<div class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/30">
						<div class="flex items-center gap-2">
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent"
							></div>
							<span class="text-sm text-yellow-800 dark:text-yellow-200">
								Checking server availability...
							</span>
						</div>
					</div>
				{:else if serverAvailable}
					<div class="rounded-md bg-green-50 p-3 dark:bg-green-900/30">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-2 w-2 rounded-full bg-green-500"></div>
								<span class="text-sm text-green-800 dark:text-green-200">
									Server AI is available - no API key needed!
								</span>
							</div>
							<button
								onclick={handleUseServer}
								class="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
							>
								Use Server
							</button>
						</div>
					</div>
				{:else}
					<div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
						<div class="flex items-center gap-2">
							<div
								class="h-2 w-2 rounded-full {networkStore.isOnline ? 'bg-green-500' : 'bg-red-500'}"
							></div>
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
					<label
						for="provider-select"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						AI Provider
					</label>
					<select
						id="provider-select"
						bind:value={provider}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900
							   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
							   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{#each providers as providerOption (providerOption.id)}
							<option value={providerOption.id}>
								{providerOption.displayName} ({providerOption.description})
							</option>
						{/each}
					</select>
				</div>

				<!-- API Key Input -->
				<div>
					<label
						for="api-key-input"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						API Key
					</label>
					<div class="relative">
						<input
							id="api-key-input"
							type={showKey ? 'text' : 'password'}
							bind:value={apiKey}
							placeholder={serverAvailable
								? 'Optional - server AI is available'
								: `Enter your ${getProvider(provider)?.displayName || 'AI'} API key`}
							class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900
								   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
								   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
								   {!isValid && apiKey && apiKey.length > 0 ? 'border-red-500' : ''}"
						/>
						<button
							type="button"
							onclick={() => (showKey = !showKey)}
							class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							aria-label={showKey ? 'Hide API key' : 'Show API key'}
						>
							{#if showKey}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.757 7.757m13.484 13.484L3 3"
									></path>
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									></path>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									></path>
								</svg>
							{/if}
						</button>
					</div>
					{#if errorMessage}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
					{/if}
				</div>

				<!-- Instructions -->
				<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
					<h4 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
						How to get your {getProvider(provider)?.displayName || 'AI'} API key:
					</h4>
					<div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
						{@const currentProvider = getProvider(provider)}
						{#if currentProvider}
							<p>
								1. Visit <a
									href={currentProvider.signupUrl}
									target="_blank"
									class="text-blue-600 hover:underline dark:text-blue-400"
									>{currentProvider.signupUrl}</a
								>
							</p>
							<p>2. Sign in or create an account</p>
							<p>3. Navigate to API Keys section</p>
							<p>4. Create a new API key</p>
						{/if}
					</div>
				</div>

				<!-- Security Notice -->
				<div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
					<div class="flex items-start gap-2">
						<svg
							class="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
						<div class="text-sm text-blue-800 dark:text-blue-200">
							<p class="font-medium">Security Notice</p>
							<p>
								{#if serverAvailable}
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

			<!-- Actions -->
			<div class="mt-6 flex justify-end gap-3">
				{#if apiKeyStore.isConfigured}
					<button
						onclick={handleClear}
						class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50
							   dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/30"
					>
						Clear Key
					</button>
				{/if}
				<button
					onclick={handleCancel}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50
						   dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={!serverAvailable && !isValid}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700
						   disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
				>
					{serverAvailable ? 'Save Settings' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}
