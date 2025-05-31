<script lang="ts">
	import { debugStore } from '$lib/stores/debug-store.svelte.js';

	let isOpen = $state(false);
	let autoScroll = $state(true);
	let messagesContainer: HTMLDivElement = $state();

	function handleKeyDown(event: KeyboardEvent) {
		// Cmd+D to toggle debug mode (Mac) or Ctrl+D (Windows/Linux)
		if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
			event.preventDefault();
			handleDebugToggle();
		}
		// Escape to close panel
		if (event.key === 'Escape' && isOpen) {
			event.preventDefault();
			isOpen = false;
		}
	}

	function handleDebugToggle() {
		if (!debugStore.isEnabled) {
			debugStore.enable();
			isOpen = true;
			// Add a test message to verify it's working
			debugStore.log('test', { message: 'Debug interface enabled', timestamp: Date.now() });
		} else {
			debugStore.toggle();
			if (!debugStore.isEnabled) {
				isOpen = false;
			}
		}
	}

	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function getTypeColor(type: string): string {
		const colors: Record<string, string> = {
			raw_stream: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
			parsed_data: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			tool_call: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
			tool_result: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
			api_request: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
			api_response: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			api_metadata: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
			error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			message_update: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
			final_response: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
			test: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
		};
		return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	$effect(() => {
		if (autoScroll && messagesContainer && isOpen) {
			messagesContainer.scrollTop = 0;
		}
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Toggle Button -->
<div class="fixed right-4 bottom-4 z-50">
	<button
		onclick={handleDebugToggle}
		class="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300"
		title="Toggle Debug Interface (Cmd+D)"
	>
		{#if debugStore.newMessageCount > 0 && debugStore.isEnabled && !isOpen}
			<div
				class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
			>
				{debugStore.newMessageCount}
			</div>
		{/if}

		{#if debugStore.isStreamingActive()}
			<div class="absolute -top-1 -left-1 h-3 w-3 animate-ping rounded-full bg-blue-500"></div>
			<div class="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-blue-500"></div>
		{/if}

		{#if isOpen}
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				></path>
			</svg>
		{:else}
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
				></path>
			</svg>
		{/if}
	</button>
</div>

<!-- Debug Interface Panel -->
{#if isOpen}
	<div
		class="fixed right-4 bottom-20 z-40 h-[80vh] w-[90vw] max-w-4xl rounded-lg border border-gray-200 bg-white shadow-2xl md:w-[60vw] dark:border-gray-700 dark:bg-gray-900"
	>
		<!-- Header -->
		<div class="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Messages</h2>
					{#if debugStore.isStreamingActive()}
						<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500 dark:text-gray-400">
						{debugStore.messages.length} messages
					</span>
					{#if debugStore.newMessageCount > 0}
						<span class="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
							{debugStore.newMessageCount} new
						</span>
					{/if}
					<button
						onclick={() => (isOpen = false)}
						class="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
					>
						Close
					</button>
					<button
						onclick={() => debugStore.clear()}
						class="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
					>
						Clear
					</button>
				</div>
			</div>

			<!-- Auto scroll option -->
			<div class="mt-3">
				<label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
					<input type="checkbox" bind:checked={autoScroll} class="rounded" />
					Auto scroll
				</label>
			</div>
		</div>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4">
			{#if debugStore.messages.length === 0}
				<div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
					<div class="text-center">
						<div class="mb-2 text-2xl">📝</div>
						<p class="text-sm">
							{#if !debugStore.isEnabled}
								Debug mode is disabled
							{:else}
								No debug messages yet
							{/if}
						</p>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					{#each debugStore.messages as message (message.id)}
						<div
							class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
						>
							<!-- Message Header -->
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="rounded px-2 py-1 text-xs font-medium {getTypeColor(message.type)}">
										{message.type}
									</span>
									<span class="text-sm text-gray-500 dark:text-gray-400">
										{formatTimestamp(message.timestamp)}
									</span>
								</div>
								<button
									onclick={() => copyToClipboard(JSON.stringify(message, null, 2))}
									class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
									title="Copy message JSON"
									aria-label="Copy message JSON"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										></path>
									</svg>
								</button>
							</div>

							<!-- Message Content -->
							<div class="overflow-x-auto">
								<pre class="text-xs text-gray-700 dark:text-gray-300"><code
										>{JSON.stringify(message, null, 2)}</code
									></pre>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
