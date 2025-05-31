<script lang="ts">
	import { debugStore } from '$lib/stores/debug-store.svelte.js';

	let isOpen = $state(false);
	let autoScroll = $state(true);
	let messagesContainer: HTMLDivElement = $state();
	let selectedTypes = $state<Set<string>>(new Set());
	let hiddenTypes = $state<Set<string>>(new Set(['message_update']));
	let showFilterMenu = $state(false);

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
			// Just toggle panel visibility, don't disable debug mode
			isOpen = !isOpen;
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
			outbound_message: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
			test: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
		};
		return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	function getUniqueMessageTypes(): string[] {
		return debugStore.getUniqueMessageTypes().filter((type) => !hiddenTypes.has(type));
	}

	function getFilteredMessages() {
		let filtered = debugStore.messages;

		// Filter out hidden types
		filtered = filtered.filter((msg) => !hiddenTypes.has(msg.type));

		// Apply selected type filter
		if (selectedTypes.size === 0) {
			return filtered;
		}
		return filtered.filter((msg) => selectedTypes.has(msg.type));
	}

	function toggleType(type: string) {
		const newTypes = new Set(selectedTypes);
		if (newTypes.has(type)) {
			newTypes.delete(type);
		} else {
			newTypes.add(type);
		}
		selectedTypes = newTypes;
	}

	function selectAllTypes() {
		selectedTypes = new Set(getUniqueMessageTypes());
	}

	function clearAllTypes() {
		selectedTypes = new Set();
	}

	function selectPreset(preset: string) {
		switch (preset) {
			case 'api':
				selectedTypes = new Set([
					'api_request',
					'api_response',
					'api_metadata',
					'outbound_message'
				]);
				break;
			case 'tools':
				selectedTypes = new Set(['tool_call', 'tool_result']);
				break;
			case 'stream':
				selectedTypes = new Set(['raw_stream', 'parsed_data', 'final_response']);
				break;
			case 'errors':
				selectedTypes = new Set(['error']);
				break;
			default:
				clearAllTypes();
		}
		showFilterMenu = false;
	}

	function toggleHiddenType(type: string) {
		const newHiddenTypes = new Set(hiddenTypes);
		if (newHiddenTypes.has(type)) {
			newHiddenTypes.delete(type);
		} else {
			newHiddenTypes.add(type);
		}
		hiddenTypes = newHiddenTypes;
	}

	$effect(() => {
		if (autoScroll && messagesContainer && isOpen) {
			messagesContainer.scrollTop = 0;
		}
	});

	// Reset filter when messages are cleared (but not when debug is just disabled)
	$effect(() => {
		if (debugStore.messages.length === 0 && debugStore.isEnabled) {
			selectedTypes = new Set();
		}
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Toggle Button -->
<div class="fixed right-4 bottom-4 z-50">
	<button
		onclick={handleDebugToggle}
		class="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300"
		title={debugStore.isEnabled
			? isOpen
				? 'Close Debug Panel (Cmd+D)'
				: 'Open Debug Panel (Cmd+D)'
			: 'Enable Debug Mode (Cmd+D)'}
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
		class="fixed right-4 bottom-20 z-40 flex h-[80vh] w-[90vw] max-w-4xl flex-col rounded-lg border border-gray-200 bg-white shadow-2xl md:w-[60vw] dark:border-gray-700 dark:bg-gray-900"
	>
		<!-- Header -->
		<div class="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Messages</h2>
					<div class="flex items-center gap-2">
						<span
							class="rounded px-2 py-1 text-xs font-medium {debugStore.isEnabled
								? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
								: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}"
						>
							{debugStore.isEnabled ? 'Enabled' : 'Disabled'}
						</span>
						{#if debugStore.isStreamingActive()}
							<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
						{/if}
					</div>
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
					{#if debugStore.isEnabled}
						<button
							onclick={() => debugStore.toggleEnabled()}
							class="rounded px-2 py-1 text-xs text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900"
						>
							Disable
						</button>
					{:else}
						<button
							onclick={() => debugStore.enable()}
							class="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
						>
							Enable
						</button>
					{/if}
				</div>
			</div>

			<!-- Controls -->
			<div class="mt-3 flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
						<input type="checkbox" bind:checked={autoScroll} class="rounded" />
						Auto scroll
					</label>

					<div class="flex items-center gap-2">
						<span class="text-xs text-gray-600 dark:text-gray-400">
							Showing {getFilteredMessages().length} of {debugStore.messages.length} messages
						</span>
						<button
							onclick={() => (showFilterMenu = !showFilterMenu)}
							class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Filter {selectedTypes.size > 0 ? `(${selectedTypes.size})` : ''}
						</button>
					</div>
				</div>

				{#if showFilterMenu}
					<div
						class="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
					>
						<!-- Filter Presets -->
						<div class="mb-3">
							<div class="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
								Quick Filters:
							</div>
							<div class="flex flex-wrap gap-1">
								<button
									onclick={() => selectPreset('api')}
									class="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800"
								>
									API
								</button>
								<button
									onclick={() => selectPreset('tools')}
									class="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
								>
									Tools
								</button>
								<button
									onclick={() => selectPreset('stream')}
									class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
								>
									Stream
								</button>
								<button
									onclick={() => selectPreset('errors')}
									class="rounded bg-red-100 px-2 py-1 text-xs text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
								>
									Errors
								</button>
							</div>
						</div>

						<!-- Individual Type Checkboxes -->
						<div class="mb-3">
							<div class="mb-2 flex items-center justify-between">
								<div class="text-xs font-medium text-gray-600 dark:text-gray-400">
									Message Types:
								</div>
								<div class="flex gap-1">
									<button
										onclick={selectAllTypes}
										class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
									>
										All
									</button>
									<button
										onclick={clearAllTypes}
										class="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
									>
										None
									</button>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-1">
								{#each getUniqueMessageTypes() as type}
									<label class="flex items-center gap-1 text-xs">
										<input
											type="checkbox"
											checked={selectedTypes.has(type)}
											onchange={() => toggleType(type)}
											class="rounded"
										/>
										<span class="flex-1 truncate {getTypeColor(type)} rounded px-1">
											{type}
										</span>
										<span class="text-gray-500 dark:text-gray-400">
											({debugStore.getMessageTypeCounts()[type] || 0})
										</span>
									</label>
								{/each}
							</div>
						</div>

						<!-- Hidden Types Section -->
						{#if debugStore.getUniqueMessageTypes().some((type) => hiddenTypes.has(type))}
							<div class="mb-3 border-t border-gray-200 pt-3 dark:border-gray-600">
								<div class="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
									Hidden Types (trace logs):
								</div>
								<div class="grid grid-cols-2 gap-1">
									{#each debugStore
										.getUniqueMessageTypes()
										.filter((type) => hiddenTypes.has(type)) as type}
										<label class="flex items-center gap-1 text-xs opacity-60">
											<input
												type="checkbox"
												checked={false}
												onchange={() => toggleHiddenType(type)}
												class="rounded"
											/>
											<span class="flex-1 truncate {getTypeColor(type)} rounded px-1">
												{type}
											</span>
											<span class="text-gray-500 dark:text-gray-400">
												({debugStore.getMessageTypeCounts()[type] || 0})
											</span>
										</label>
									{/each}
								</div>
								<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Check to show these verbose trace logs
								</div>
							</div>
						{/if}

						<button
							onclick={() => (showFilterMenu = false)}
							class="w-full rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
						>
							Close Filter
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="min-h-0 flex-1 overflow-y-auto p-4">
			{#if getFilteredMessages().length === 0}
				<div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
					<div class="text-center">
						<div class="mb-2 text-2xl">📝</div>
						<p class="text-sm">
							{#if !debugStore.isEnabled}
								Debug mode is disabled. Enable it to start collecting messages.
							{:else if debugStore.messages.length === 0}
								No debug messages yet. Messages will appear here as the system runs.
							{:else}
								No messages match the selected filter
							{/if}
						</p>
						{#if !debugStore.isEnabled && debugStore.messages.length > 0}
							<p class="mt-2 text-xs text-gray-400">
								{debugStore.messages.length} messages preserved from previous session
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					{#each getFilteredMessages() as message (message.id)}
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
							<div class="max-h-64 overflow-auto">
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
