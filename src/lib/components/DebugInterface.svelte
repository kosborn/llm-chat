<script lang="ts">
	import { debugStore } from '$lib/stores/debug-store.svelte.js';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let selectedType = $state<string>('all');
	let searchTerm = $state('');
	let autoScroll = $state(true);
	let messagesContainer: HTMLDivElement | undefined = $state();
	// Remove local debugEnabled state - use debugStore.isEnabled directly
	let showMetrics = $state(false);
	let showFilters = $state(false);
	let showVerbose = $state(false);

	// Keyboard shortcuts
	onMount(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Only Cmd + D to toggle debug panel (Mac only)
			if (e.metaKey && e.key === 'd' && !e.ctrlKey) {
				e.preventDefault();
				handleDebugToggle();
			}
			// Escape key to close debug panel
			if (e.key === 'Escape' && isOpen && debugStore.isEnabled) {
				e.preventDefault();
				isOpen = false;
			}
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	function handleDebugToggle() {
		if (!debugStore.isEnabled) {
			debugStore.enable();
			isOpen = true;
			debugStore.markAllAsRead();

			// Add a test message to verify the store is working
			debugStore.log('test', { message: 'Debug interface enabled', timestamp: Date.now() });
		} else {
			isOpen = !isOpen;
			if (isOpen) {
				debugStore.markAllAsRead();
			}
		}
	}

	// Auto-open panel when debug is enabled and there are messages
	$effect(() => {
		if (debugStore.isEnabled && debugStore.messages.length > 0 && !isOpen) {
			isOpen = true;
		}
	});

	// No need for separate debugEnabled state - use debugStore.isEnabled directly

	const messageTypes = [
		{ value: 'all', label: 'All', color: 'bg-gray-500' },
		{ value: 'raw_stream', label: 'Stream', color: 'bg-blue-500' },
		{ value: 'parsed_data', label: 'Parsed', color: 'bg-green-500' },
		{ value: 'tool_call', label: 'Tool Call', color: 'bg-purple-500' },
		{ value: 'tool_result', label: 'Tool Result', color: 'bg-orange-500' },
		{ value: 'api_request', label: 'API Req', color: 'bg-indigo-500' },
		{ value: 'api_response', label: 'API Res', color: 'bg-teal-500' },
		{ value: 'api_metadata', label: 'Metadata', color: 'bg-cyan-500' },
		{ value: 'message_update', label: 'Update', color: 'bg-yellow-500' },
		{ value: 'final_response', label: 'Final', color: 'bg-emerald-500' },
		{ value: 'test', label: 'Test', color: 'bg-pink-500' },
		{ value: 'error', label: 'Error', color: 'bg-red-500' }
	];

	$effect(() => {
		if (autoScroll && messagesContainer && debugStore.messages.length > 0) {
			requestAnimationFrame(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			});
		}
	});

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function formatData(data: any): string {
		if (typeof data === 'string') return data;
		return JSON.stringify(data, null, 2);
	}

	function getTypeColor(type: string): string {
		const messageType = messageTypes.find((t) => t.value === type);
		return messageType?.color || 'bg-gray-500';
	}

	function copyToClipboard(text: string) {
		navigator.clipboard?.writeText(text);
	}

	function exportDebugLog() {
		const log = filteredMessages()
			.map(
				(msg) =>
					`[${formatTimestamp(msg.timestamp)}] ${msg.type.toUpperCase()}: ${formatData(msg.data)}`
			)
			.join('\n');

		const blob = new Blob([log], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `debug-log-${new Date().toISOString()}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	const filteredMessages = $derived(() => {
		if (!debugStore.isEnabled) return [];

		let messages = debugStore.messages || [];

		// Filter by type
		if (selectedType !== 'all') {
			messages = messages.filter((msg) => msg.type === selectedType);
		}

		// Filter by search term
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			messages = messages.filter((msg) => {
				const messageText = JSON.stringify(msg.data).toLowerCase();
				const typeText = msg.type.toLowerCase();
				const metadataText = msg.metadata ? JSON.stringify(msg.metadata).toLowerCase() : '';
				return messageText.includes(term) || typeText.includes(term) || metadataText.includes(term);
			});
		}

		return messages;
	});

	const metrics = $derived(() => {
		try {
			const messages = debugStore?.messages || [];

			// Initialize byType with all message types to prevent undefined errors
			const byType: Record<string, number> = {
				all: messages.length,
				raw_stream: 0,
				parsed_data: 0,
				tool_call: 0,
				tool_result: 0,
				api_request: 0,
				api_response: 0,
				api_metadata: 0,
				message_update: 0,
				final_response: 0,
				test: 0,
				error: 0
			};

			// Count actual messages by type
			messages.forEach((msg) => {
				if (msg?.type && byType.hasOwnProperty(msg.type)) {
					byType[msg.type] = (byType[msg.type] || 0) + 1;
				} else if (msg?.type) {
					byType[msg.type] = 1;
				}
			});

			const apiMetrics = {
				totalRequests: messages.filter((m) => m?.type === 'api_request').length,
				totalResponses: messages.filter((m) => m?.type === 'api_response').length,
				errors: messages.filter((m) => m?.type === 'error').length,
				modelUsage: {} as Record<string, number>,
				providerUsage: {} as Record<string, number>
			};

			// Count model and provider usage
			messages
				.filter((m) => m?.type === 'api_request' && m?.metadata)
				.forEach((msg) => {
					if (msg.metadata?.model) {
						apiMetrics.modelUsage[msg.metadata.model] =
							(apiMetrics.modelUsage[msg.metadata.model] || 0) + 1;
					}
					if (msg.metadata?.provider) {
						apiMetrics.providerUsage[msg.metadata.provider] =
							(apiMetrics.providerUsage[msg.metadata.provider] || 0) + 1;
					}
				});

			return {
				total: messages.length,
				byType,
				apiMetrics
			};
		} catch (error) {
			// Fallback safe metrics object
			return {
				total: 0,
				byType: {
					all: 0,
					raw_stream: 0,
					parsed_data: 0,
					tool_call: 0,
					tool_result: 0,
					api_request: 0,
					api_response: 0,
					api_metadata: 0,
					message_update: 0,
					final_response: 0,
					test: 0,
					error: 0
				},
				apiMetrics: {
					totalRequests: 0,
					totalResponses: 0,
					errors: 0,
					modelUsage: {},
					providerUsage: {}
				}
			};
		}
	});
</script>

<!-- Debug Toggle Button -->
<div class="fixed right-4 bottom-4 z-50">
	<button
		onclick={handleDebugToggle}
		class="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-all hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
		title="Toggle Debug Panel (Cmd+D)"
	>
		{#if debugStore.newMessageCount > 0 && debugStore.isEnabled && !isOpen}
			<div
				class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
			>
				{debugStore.newMessageCount}
			</div>
		{/if}
		{#if debugStore.isStreamingActive()}
			<div class="absolute -top-1 -left-1 h-3 w-3 animate-ping rounded-full bg-blue-500"></div>
			<div class="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-blue-500"></div>
		{/if}
		{#if debugStore.isEnabled && isOpen}
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
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
		{/if}
	</button>
</div>

<!-- Debug Panel -->
{#if debugStore.isEnabled && isOpen}
	<div
		class="fixed top-0 right-0 z-40 flex h-full w-96 flex-col bg-white shadow-xl dark:bg-gray-900"
	>
		<!-- Header -->
		<div class="border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Console</h2>
					{#if debugStore.isStreamingActive()}
						<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500 dark:text-gray-400"
						>{filteredMessages.length}/{metrics?.total || 0}</span
					>
					{#if debugStore.newMessageCount > 0}
						<span class="rounded-full bg-red-500 px-2 py-1 text-xs text-white"
							>{debugStore.newMessageCount} new</span
						>
					{/if}
					<button
						onclick={() => debugStore.clear()}
						class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						title="Clear all messages"
					>
						🗑️
					</button>
					<button
						onclick={() => (isOpen = false)}
						class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						title="Close panel"
					>
						×
					</button>
				</div>
			</div>

			<!-- Controls -->
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<button
					onclick={() => (showFilters = !showFilters)}
					class="flex items-center gap-1 rounded {showFilters
						? 'bg-blue-500 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'} px-2 py-1 text-xs"
					title="Toggle message type filters and search"
				>
					🔍 Filter {showFilters ? '−' : '+'}
				</button>
				<button
					onclick={() => (showMetrics = !showMetrics)}
					class="flex items-center gap-1 rounded {showMetrics
						? 'bg-purple-500 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'} px-2 py-1 text-xs"
					title="Show/hide performance statistics"
				>
					📊 Stats {showMetrics ? '−' : '+'}
				</button>
				<button
					onclick={() => (showVerbose = !showVerbose)}
					class="flex items-center gap-1 rounded {showVerbose
						? 'bg-orange-500 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'} px-2 py-1 text-xs"
					title="Show/hide verbose message updates"
				>
					🔬 Verbose
				</button>
				<button
					onclick={exportDebugLog}
					class="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
					title="Export debug log to file"
				>
					💾 Export
				</button>
				<label class="ml-auto flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
					<input type="checkbox" bind:checked={autoScroll} class="rounded" />
					Auto-scroll
				</label>
			</div>

			<!-- Collapsible Filters -->
			{#if showFilters}
				<div class="mt-2 space-y-2">
					<input
						bind:value={searchTerm}
						placeholder="Search messages..."
						class="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
					<div class="flex flex-wrap gap-1">
						{#each messageTypes as type}
							<button
								onclick={() => (selectedType = type.value)}
								class="rounded px-2 py-1 text-xs transition-colors {selectedType === type.value
									? type.color + ' text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
							>
								{type.label}
								{#if type.value !== 'all'}
									<span class="ml-1 opacity-75">({metrics?.byType?.[type.value] || 0})</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Collapsible Metrics -->
			{#if showMetrics}
				<div class="mt-2 rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
					<div class="grid grid-cols-2 gap-1">
						<div>Total: <span class="font-mono">{metrics?.total || 0}</span></div>
						<div>
							Errors: <span class="font-mono text-red-600">{metrics?.byType?.error || 0}</span>
						</div>
						<div>
							Requests: <span class="font-mono">{metrics?.apiMetrics?.totalRequests || 0}</span>
						</div>
						<div>
							Responses: <span class="font-mono">{metrics?.apiMetrics?.totalResponses || 0}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Messages Container -->
		<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-2">
			{#if filteredMessages.length === 0}
				<div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
					<div class="text-center">
						<div class="mb-2 text-2xl">🔍</div>
						<p class="text-sm">
							{#if !debugStore.isEnabled}
								Debug mode disabled (Press Cmd+D to enable)
							{:else if debugStore.messages.length === 0}
								No debug messages yet (Total: {debugStore.messages.length})
							{:else if searchTerm}
								No messages match "{searchTerm}" (Showing {filteredMessages.length} of {debugStore
									.messages.length})
							{:else}
								No messages with current filters (Showing {filteredMessages.length} of {debugStore
									.messages.length})
							{/if}
						</p>
						<div class="mt-2 text-xs">
							Store enabled: {debugStore.isEnabled}, Verbose: {showVerbose}, Filter: {selectedType},
							Total messages: {debugStore.messages.length}
						</div>
						{#if debugStore.messages.length > 0}
							<div class="mt-2 rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
								<div>Raw message sample:</div>
								<pre class="overflow-x-auto text-xs">{JSON.stringify(
										debugStore.messages[0],
										null,
										2
									)}</pre>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="space-y-1">
					<!-- Debug info -->
					<div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
						Showing {filteredMessages.length} of {debugStore.messages.length} messages
						{#if !showVerbose}(hiding verbose updates){/if}
					</div>
					{#each filteredMessages as message, index (message.id)}
						<div
							class="rounded border-t border-r border-b border-l-4 bg-gray-50 p-2 dark:bg-gray-800"
							style="border-left-color: {getTypeColor(message.type)
								.replace('bg-', '#')
								.replace('500', '')}; border-left-color: {message.type === 'error'
								? '#ef4444'
								: message.type === 'tool_call'
									? '#a855f7'
									: message.type === 'tool_result'
										? '#f97316'
										: message.type === 'api_request'
											? '#6366f1'
											: message.type === 'api_response'
												? '#14b8a6'
												: message.type === 'raw_stream'
													? '#3b82f6'
													: message.type === 'parsed_data'
														? '#22c55e'
														: message.type === 'api_metadata'
															? '#06b6d4'
															: message.type === 'message_update'
																? '#eab308'
																: message.type === 'final_response'
																	? '#10b981'
																	: message.type === 'test'
																		? '#ec4899'
																		: '#6b7280'}"
						>
							<div class="mb-1 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span
										class="rounded px-2 py-0.5 font-mono text-xs text-white"
										style="background-color: {message.type === 'error'
											? '#ef4444'
											: message.type === 'tool_call'
												? '#a855f7'
												: message.type === 'tool_result'
													? '#f97316'
													: message.type === 'api_request'
														? '#6366f1'
														: message.type === 'api_response'
															? '#14b8a6'
															: message.type === 'raw_stream'
																? '#3b82f6'
																: message.type === 'parsed_data'
																	? '#22c55e'
																	: message.type === 'api_metadata'
																		? '#06b6d4'
																		: message.type === 'message_update'
																			? '#eab308'
																			: message.type === 'final_response'
																				? '#10b981'
																				: message.type === 'test'
																					? '#ec4899'
																					: '#6b7280'}"
									>
										{message.type}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400"
										>{formatTimestamp(message.timestamp)}</span
									>
									{#if index < debugStore.newMessageCount}
										<span class="animate-pulse rounded bg-red-500 px-1 py-0.5 text-xs text-white"
											>new</span
										>
									{/if}
								</div>
								<button
									onclick={() => copyToClipboard(formatData(message.data))}
									class="rounded p-1 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
									title="Copy to clipboard"
								>
									📋
								</button>
							</div>
							{#if message.metadata}
								<div class="mb-1 text-xs text-gray-500 dark:text-gray-400">
									{#if message.metadata.chatId}<span class="mr-2"
											>💬 Chat: {message.metadata.chatId}</span
										>{/if}
									{#if message.metadata.toolName}<span class="mr-2"
											>🔧 Tool: {message.metadata.toolName}</span
										>{/if}
									{#if message.metadata.model}<span class="mr-2"
											>🤖 Model: {message.metadata.model}</span
										>{/if}
								</div>
							{/if}
							<pre
								class="overflow-x-auto text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300"><code
									>{formatData(message.data)}</code
								></pre>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
