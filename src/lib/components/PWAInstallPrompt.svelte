<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let deferredPrompt: BeforeInstallPromptEvent | null = null;
	let showPrompt = $state(false);
	let isInstalling = $state(false);
	let isInstalled = $state(false);

	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	onMount(() => {
		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			isInstalled = true;
			return;
		}

		// Listen for beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;

			// Check if user has dismissed this before
			const dismissed = localStorage.getItem('pwa-install-dismissed');
			if (!dismissed) {
				showPrompt = true;
			}
		});

		// Listen for app installed event
		window.addEventListener('appinstalled', () => {
			isInstalled = true;
			showPrompt = false;
			deferredPrompt = null;
		});
	});

	async function handleInstall() {
		if (!deferredPrompt) return;

		isInstalling = true;

		try {
			const result = await deferredPrompt.prompt();
			console.log('Install prompt result:', result);

			if (result.outcome === 'accepted') {
				showPrompt = false;
			}
		} catch (error) {
			console.error('Install prompt error:', error);
		} finally {
			isInstalling = false;
			deferredPrompt = null;
		}
	}

	function handleDismiss() {
		showPrompt = false;
		localStorage.setItem('pwa-install-dismissed', Date.now().toString());
		onClose();
	}

	function handleNotNow() {
		showPrompt = false;
		// Don't mark as permanently dismissed, just hide for now
		onClose();
	}

	const shouldShow = $derived((isOpen || showPrompt) && !isInstalled && deferredPrompt);
</script>

{#if shouldShow}
	<div class="fixed right-4 bottom-4 left-4 z-50 md:left-auto md:max-w-sm">
		<div
			class="rounded-lg border border-blue-200 bg-white p-4 shadow-lg dark:border-blue-700 dark:bg-gray-800"
		>
			<div class="mb-3 flex items-start gap-3">
				<div class="flex-shrink-0">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900"
					>
						<svg
							class="h-6 w-6 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
							></path>
						</svg>
					</div>
				</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						Install AI Tool Chat
					</h3>
					<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						Add to your home screen for quick access and offline support.
					</p>
				</div>
			</div>

			<div class="flex gap-2">
				<button
					onclick={handleInstall}
					disabled={isInstalling}
					class="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isInstalling}
						Installing...
					{:else}
						Install
					{/if}
				</button>
				<button
					onclick={handleNotNow}
					class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					Not Now
				</button>
				<button
					onclick={handleDismiss}
					class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600 dark:hover:text-gray-400"
					aria-label="Dismiss permanently"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<!-- Features list -->
			<div class="mt-3 space-y-1">
				<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						></path>
					</svg>
					<span>Works offline</span>
				</div>
				<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						></path>
					</svg>
					<span>Faster loading</span>
				</div>
				<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						></path>
					</svg>
					<span>Native app experience</span>
				</div>
			</div>
		</div>
	</div>
{/if}
