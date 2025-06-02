<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getAllProviders, validateApiKey, type ProviderId } from '$lib/providers';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose } = $props<Props>();

	// Local state
	let selectedProviderId = $state<ProviderId>('groq');
	let apiKeyInput = $state('');
	let showApiKey = $state(false);
	let serverAvailable = $state(false);
	let checkingServer = $state(false);
	let validationError = $state('');

	// Get providers
	const providers = getAllProviders();

	// Load saved data when dialog opens
	$effect(() => {
		if (isOpen && browser) {
			loadSavedConfiguration();
			checkServerStatus();
		}
	});

	// Validate API key when it changes
	$effect(() => {
		if (apiKeyInput && selectedProviderId) {
			validateCurrentKey();
		} else {
			validationError = '';
		}
	});

	function loadSavedConfiguration() {
		try {
			const savedProvider = localStorage.getItem('ai-provider');
			const savedKeys = localStorage.getItem('ai-api-keys');

			if (savedProvider) {
				selectedProviderId = savedProvider as ProviderId;
			}

			if (savedKeys) {
				const keys = JSON.parse(savedKeys);
				apiKeyInput = keys[selectedProviderId] || '';
			}
		} catch (error) {
			console.warn('Failed to load saved configuration:', error);
		}
	}

	async function checkServerStatus() {
		if (!browser) return;

		checkingServer = true;
		try {
			const response = await fetch('/api/health', {
				method: 'GET'
			});

			if (response.ok) {
				const data = await response.json();
				serverAvailable = data.status === 'ok';
			} else {
				serverAvailable = false;
			}
		} catch {
			serverAvailable = false;
		} finally {
			checkingServer = false;
		}
	}

	function validateCurrentKey() {
		if (!apiKeyInput.trim()) {
			validationError = '';
			return;
		}

		const isValid = validateApiKey(apiKeyInput, selectedProviderId);
		if (!isValid) {
			const provider = providers.find((p) => p.id === selectedProviderId);
			validationError = `Invalid format. Keys should start with "${provider?.apiKeyPrefix}"`;
		} else {
			validationError = '';
		}
	}

	function saveConfiguration() {
		if (!browser) return;

		try {
			// Save provider
			localStorage.setItem('ai-provider', selectedProviderId);

			// Save API keys
			let existingKeys = {};
			try {
				const stored = localStorage.getItem('ai-api-keys');
				if (stored) existingKeys = JSON.parse(stored);
			} catch {}

			const updatedKeys = {
				...existingKeys,
				[selectedProviderId]: apiKeyInput.trim()
			};

			localStorage.setItem('ai-api-keys', JSON.stringify(updatedKeys));

			onClose();
		} catch (error) {
			console.error('Failed to save configuration:', error);
		}
	}

	function clearStoredKey() {
		if (!browser) return;

		try {
			const stored = localStorage.getItem('ai-api-keys');
			if (stored) {
				const keys = JSON.parse(stored);
				delete keys[selectedProviderId];
				localStorage.setItem('ai-api-keys', JSON.stringify(keys));
			}
			apiKeyInput = '';
			validationError = '';
		} catch (error) {
			console.error('Failed to clear key:', error);
		}
	}

	function useServerMode() {
		// Clear all API keys and use server
		if (browser) {
			localStorage.removeItem('ai-api-keys');
		}
		onClose();
	}

	function handleDialogClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Load API key when provider changes
	$effect(() => {
		if (selectedProviderId && browser) {
			try {
				const stored = localStorage.getItem('ai-api-keys');
				if (stored) {
					const keys = JSON.parse(stored);
					apiKeyInput = keys[selectedProviderId] || '';
				} else {
					apiKeyInput = '';
				}
			} catch {
				apiKeyInput = '';
			}
		}
	});

	onMount(() => {
		if (browser) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	});

	const canSave = $derived(serverAvailable || (apiKeyInput.trim() && !validationError));
	const hasStoredKey = $derived.by(() => {
		if (!browser) return false;
		try {
			const stored = localStorage.getItem('ai-api-keys');
			if (stored) {
				const keys = JSON.parse(stored);
				return !!keys[selectedProviderId];
			}
		} catch {}
		return false;
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleDialogClick}
		onkeydown={handleKeyDown}
	>
		<div class="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
			<!-- Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">AI Configuration</h2>
				<button
					onclick={onClose}
					class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
					aria-label="Close dialog"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Server Status -->
			{#if checkingServer}
				<div class="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
					<div class="flex items-center gap-3">
						<div
							class="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
						></div>
						<span class="text-sm font-medium text-blue-700 dark:text-blue-300">
							Checking server availability...
						</span>
					</div>
				</div>
			{:else if serverAvailable}
				<div class="mb-4 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="h-3 w-3 rounded-full bg-green-500"></div>
							<div>
								<div class="text-sm font-medium text-green-700 dark:text-green-300">
									Server AI Available
								</div>
								<div class="text-xs text-green-600 dark:text-green-400">No API key required</div>
							</div>
						</div>
						<button
							onclick={useServerMode}
							class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
						>
							Use Server
						</button>
					</div>
				</div>
			{:else}
				<div class="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
					<div class="flex items-center gap-3">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<div>
							<div class="text-sm font-medium text-blue-700 dark:text-blue-300">
								📱 Browser Client Mode Available
							</div>
							<div class="text-xs text-blue-600 dark:text-blue-400">
								Server AI unavailable - configure your API key to use client mode
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Provider Selection -->
			<div class="mb-4">
				<label
					for="provider-select"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					AI Provider
				</label>
				<select
					id="provider-select"
					bind:value={selectedProviderId}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
				>
					{#each providers as provider (provider.id)}
						<option value={provider.id}>
							{provider.displayName} - {provider.description}
						</option>
					{/each}
				</select>
			</div>

			<!-- API Key Input -->
			<div class="mb-6">
				<label
					for="api-key-input"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					API Key
					{#if serverAvailable}
						<span class="text-gray-500">(optional - enables client mode fallback)</span>
					{:else}
						<span class="text-blue-600 dark:text-blue-400">(required for browser client mode)</span>
					{/if}
				</label>
				<div class="relative">
					<input
						id="api-key-input"
						type={showApiKey ? 'text' : 'password'}
						bind:value={apiKeyInput}
						placeholder={serverAvailable
							? 'Optional - enables client mode fallback'
							: 'Required for browser client mode'}
						class="w-full rounded-lg border bg-white px-3 py-2 pr-10 shadow-sm focus:ring-1 focus:outline-none
							   {validationError
							? 'border-red-500 focus:border-red-500 focus:ring-red-500'
							: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
							   dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
					/>
					<button
						type="button"
						onclick={() => (showApiKey = !showApiKey)}
						class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
					>
						{#if showApiKey}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.757 7.757m13.484 13.484L3 3"
								/>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						{/if}
					</button>
				</div>
				{#if validationError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
				{/if}
			</div>

			<!-- Provider Info -->
			{#if selectedProviderId}
				{@const currentProvider = providers.find((p) => p.id === selectedProviderId)}
				{#if currentProvider}
					<div class="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
						<h3 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
							Get your {currentProvider.displayName} API key:
						</h3>
						<ol class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
							<li>
								1. Visit <a
									href={currentProvider.signupUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-600 hover:underline dark:text-blue-400"
									>{currentProvider.signupUrl}</a
								>
							</li>
							<li>2. Create an account or sign in</li>
							<li>3. Navigate to API keys section</li>
							<li>4. Generate a new API key</li>
						</ol>
					</div>
				{/if}
			{/if}

			<!-- Mode Explanation -->
			<div class="mb-6 space-y-3">
				<div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
					<div class="flex items-start gap-3">
						<div class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400">🌐</div>
						<div class="text-sm text-green-800 dark:text-green-200">
							<p class="mb-1 font-medium">Server AI Mode</p>
							<p>
								Uses server-hosted AI models. No API key required, but requires internet connection.
							</p>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
					<div class="flex items-start gap-3">
						<div class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400">📱</div>
						<div class="text-sm text-blue-800 dark:text-blue-200">
							<p class="mb-1 font-medium">Browser Client Mode</p>
							<p>
								Your API key enables direct browser-to-provider communication. Works as fallback
								when server is unavailable. All requests go directly from your browser to the AI
								provider.
							</p>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
					<div class="flex items-start gap-3">
						<svg
							class="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div class="text-sm text-gray-700 dark:text-gray-300">
							<p class="mb-1 font-medium">Privacy & Security</p>
							<p>
								Your API key is stored locally in your browser and never sent to our servers. Client
								mode requests bypass our servers entirely.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				{#if hasStoredKey}
					<button
						onclick={clearStoredKey}
						class="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:border-red-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
					>
						Clear Key
					</button>
				{/if}
				<button
					onclick={onClose}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					Cancel
				</button>
				<button
					onclick={saveConfiguration}
					disabled={!canSave}
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
				>
					Save Configuration
				</button>
			</div>
		</div>
	</div>
{/if}
