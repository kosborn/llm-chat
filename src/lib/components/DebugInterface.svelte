<script lang="ts">
	import { debugStore } from '$lib/stores/debug-store.svelte.js';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let selectedType = $state<string>('all');
	let searchTerm = $state('');
	let autoScroll = $state(true);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let debugEnabled = $state(false);
	let panelWidth = $state(400);
	let isResizing = $state(false);
	let showMetrics = $state(false);

	// Keyboard shortcuts
	onMount(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Ctrl/Cmd + D to toggle debug panel (enable debug if needed)
			if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
				e.preventDefault();
				handleDebugToggle();
			}
			// Ctrl/Cmd + Shift + D to close debug panel (if open)
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
				e.preventDefault();
				if (debugEnabled && isOpen) {
					isOpen = false;
				}
			}
			// Escape key to close debug panel
			if (e.key === 'Escape' && isOpen && debugEnabled) {
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
		if (!debugEnabled) {
			// If debug is disabled, enable it and open the panel
			debugEnabled = true;
			debugStore.isEnabled = true;
			isOpen = true;
			debugStore.markAllAsRead();
		} else {
			// If debug is enabled, toggle the panel
			isOpen = !isOpen;
			if (isOpen) {
				debugStore.markAllAsRead();
			}
		}
	}

	// Auto-open panel when debug is enabled and there are messages
	$effect(() => {
		if (debugEnabled && debugStore.messages.length > 0 && !isOpen) {
			isOpen = true;
		}
	});

	// Update body class for layout adjustment
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (debugEnabled && isOpen) {
				document.body.classList.add('debug-panel-open');
				document.body.style.marginRight = `${panelWidth}px`;
			} else {
				document.body.classList.remove('debug-panel-open');
				document.body.style.marginRight = '0';
			}
		}
	});

	const messageTypes = [
		{ value: 'all', label: 'All Messages', color: 'bg-gray-100 dark:bg-gray-700' },
		{ value: 'raw_stream', label: 'Raw Stream', color: 'bg-blue-100 dark:bg-blue-900' },
		{ value: 'parsed_data', label: 'Parsed Data', color: 'bg-green-100 dark:bg-green-900' },
		{ value: 'tool_call', label: 'Tool Calls', color: 'bg-purple-100 dark:bg-purple-900' },
		{ value: 'tool_result', label: 'Tool Results', color: 'bg-orange-100 dark:bg-orange-900' },
		{ value: 'api_request', label: 'API Requests', color: 'bg-indigo-100 dark:bg-indigo-900' },
		{ value: 'api_response', label: 'API Responses', color: 'bg-teal-100 dark:bg-teal-900' },
		{ value: 'api_metadata', label: 'API Metadata', color: 'bg-cyan-100 dark:bg-cyan-900' },
		{
			value: 'message_update',
			label: 'Message Updates',
			color: 'bg-yellow-100 dark:bg-yellow-900'
		},
		{ value: 'error', label: 'Errors', color: 'bg-red-100 dark:bg-red-900' }
	];

	$effect(() => {
		if (autoScroll && messagesContainer && debugStore.messages.length > 0) {
			// Use requestAnimationFrame for smoother scrolling
			requestAnimationFrame(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			});
		}
	});

	function handleMouseDown(e: MouseEvent) {
		isResizing = true;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		e.preventDefault();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isResizing) return;
		const newWidth = window.innerWidth - e.clientX;
		panelWidth = Math.max(300, Math.min(800, newWidth));
		// Update body margin in real-time during resize
		if (typeof document !== 'undefined') {
			document.body.style.marginRight = `${panelWidth}px`;
		}
	}

	function handleMouseUp() {
		isResizing = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function formatData(data: any): string {
		if (typeof data === 'string') {
			return data;
		}

		// Special handling for raw stream data with encoded JSON
		if (data && typeof data === 'object' && data.chunk && typeof data.chunk === 'string') {
			const chunk = data.chunk;

			// Try to parse and pretty-print encoded JSON within the chunk
			let prettyChunk = chunk;

			// Split by lines to handle each encoded JSON separately
			const lines = chunk.split('\n');
			const processedLines = lines.map((line) => {
				if (!line.trim()) return line; // Keep empty lines

				// Look for patterns like e:{...} or d:{...} followed by JSON
				const streamPattern = /^([ed]):(.+)$/;
				const match = line.match(streamPattern);

				if (match) {
					const [, prefix, jsonStr] = match;
					try {
						const parsed = JSON.parse(jsonStr);
						const prettyJson = JSON.stringify(parsed, null, 2);
						return `${prefix}:\n${prettyJson
							.split('\n')
							.map((jsonLine) => '  ' + jsonLine)
							.join('\n')}`;
					} catch {
						// If parsing fails, try to find and format any JSON-like content
						const jsonMatch = jsonStr.match(/\{.*\}/);
						if (jsonMatch) {
							try {
								const parsed = JSON.parse(jsonMatch[0]);
								const prettyJson = JSON.stringify(parsed, null, 2);
								return `${prefix}: ${prettyJson}`;
							} catch {
								return line; // Return original if all parsing fails
							}
						}
						return line;
					}
				}

				// Handle standalone JSON objects
				const jsonMatch = line.match(/\{.*\}/);
				if (jsonMatch) {
					try {
						const parsed = JSON.parse(jsonMatch[0]);
						const prettyJson = JSON.stringify(parsed, null, 2);
						return line.replace(jsonMatch[0], prettyJson);
					} catch {
						return line; // Return original if parsing fails
					}
				}

				return line;
			});

			prettyChunk = processedLines.join('\n');

			return JSON.stringify(
				{
					...data,
					chunk: prettyChunk
				},
				null,
				2
			);
		}

		return JSON.stringify(data, null, 2);
	}

	function getTypeColor(type: string): string {
		return messageTypes.find((t) => t.value === type)?.color || 'bg-gray-100 dark:bg-gray-700';
	}

	function copyToClipboard(text: string): void {
		navigator.clipboard.writeText(text).then(() => {
			// Could add a toast notification here
		});
	}

	function exportDebugLog(): void {
		const exportData = {
			exported_at: new Date().toISOString(),
			filter: selectedType,
			search: searchTerm,
			total_messages: filteredMessages().length,
			messages: filteredMessages()
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `debug-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	const filteredMessages = $derived(() => {
		return debugStore.messages.filter((msg) => {
			const typeMatch = selectedType === 'all' || msg.type === selectedType;
			const searchMatch =
				searchTerm === '' || JSON.stringify(msg).toLowerCase().includes(searchTerm.toLowerCase());
			return typeMatch && searchMatch;
		});
	});

	const metrics = $derived(() => {
		const total = debugStore.messages.length;
		const byType = messageTypes.reduce(
			(acc, type) => {
				if (type.value !== 'all') {
					acc[type.value] = debugStore.getMessagesByType(type.value).length;
				}
				return acc;
			},
			{} as Record<string, number>
		);

		const recentMessages = debugStore.getRecentMessages(10);
		const avgTimeBetween =
			recentMessages.length > 1
				? (recentMessages[0].timestamp - recentMessages[recentMessages.length - 1].timestamp) /
					(recentMessages.length - 1)
				: 0;

		// Get API usage metrics
		const apiMetrics = debugStore.getApiMetrics();

		return {
			total,
			byType,
			avgTimeBetween: Math.round(avgTimeBetween),
			errorCount: byType.error || 0,
			streamingActive: debugStore.isStreamingActive(),
			apiMetrics
		};
	});
</script>

<!-- Debug Toggle Button -->
<div class="fixed right-4 bottom-4 z-50">
	<!-- Debug button - opens panel directly -->
	<button
		onclick={handleDebugToggle}
		class="relative cursor-pointer rounded-full p-3 text-white shadow-lg transition-all hover:shadow-xl"
		style="background-color: {debugEnabled && isOpen
			? '#10b981'
			: debugEnabled
				? '#eab308'
				: '#ef4444'}; z-index: 9999;"
		title={debugEnabled && isOpen ? 'Close Debug Panel (Cmd+D)' : 'Open Debug Panel (Cmd+D)'}
	>
		{#if debugStore.newMessageCount > 0 && debugEnabled && !isOpen}
			<div
				class="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs text-white"
			>
				{debugStore.newMessageCount > 9 ? '9+' : debugStore.newMessageCount}
			</div>
		{/if}
		{#if debugStore.isStreamingActive()}
			<div class="absolute -top-1 -left-1 h-3 w-3 animate-ping rounded-full bg-blue-500"></div>
			<div class="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-blue-500"></div>
		{/if}
		{#if debugEnabled && isOpen}
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		{:else}
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
		{/if}
	</button>
</div>

<!-- Debug Interface Panel -->
{#if debugEnabled && isOpen}
	<div
		class="fixed inset-y-0 right-0 z-40 border-l border-gray-200 bg-white shadow-2xl transition-all duration-200 dark:border-gray-700 dark:bg-gray-800"
		style="width: {panelWidth}px;"
	>
		<!-- Resize Handle -->
		<button
			class="group absolute top-0 left-0 h-full w-2 cursor-col-resize border-0 bg-gray-300 p-0 transition-colors hover:bg-blue-400 dark:bg-gray-600 dark:hover:bg-blue-500"
			onmousedown={handleMouseDown}
			aria-label="Resize debug panel"
			title="Drag to resize panel"
		>
			<div
				class="absolute inset-y-0 left-0.5 w-0.5 bg-gray-400 transition-colors group-hover:bg-blue-500"
			></div>
		</button>

		<div class="ml-2 flex h-full flex-col">
			<!-- Header -->
			<div class="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
				<div class="flex items-center justify-between">
					<h2
						class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
					>
						Debug Interface
						{#if debugStore.isStreamingActive()}
							<span class="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
						{/if}
					</h2>
					<div class="flex items-center gap-2">
						{#if debugStore.isStreamingActive()}
							<div class="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
								<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
								Streaming
							</div>
						{/if}
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{debugStore.messages.length} messages
						</span>
						{#if debugStore.newMessageCount > 0}
							<span
								class="inline-flex items-center rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white"
							>
								{debugStore.newMessageCount} new
							</span>
						{/if}
						<button
							onclick={debugStore.clear}
							class="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
						>
							Clear
						</button>
						<button
							onclick={() => (isOpen = false)}
							class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
							title="Close (Esc)"
						>
							Close
						</button>
					</div>
				</div>

				<!-- Filters -->
				<div class="mt-3 space-y-2">
					<div class="flex flex-wrap gap-2">
						{#each messageTypes as type}
							<button
								onclick={() => (selectedType = type.value)}
								class={`rounded px-2 py-1 text-xs transition-colors ${
									selectedType === type.value
										? `${type.color} border-2 border-gray-400 font-medium dark:border-gray-300`
										: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
								} text-gray-700 dark:text-gray-300`}
							>
								{type.label}
								{#if type.value !== 'all'}
									<span class="ml-1 text-xs opacity-75">
										({debugStore.getMessagesByType(type.value).length})
									</span>
								{/if}
							</button>
						{/each}
					</div>

					<div class="flex gap-2">
						<input
							bind:value={searchTerm}
							placeholder="Search messages..."
							class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
							title="Search debug messages"
						/>
						<label class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
							<input type="checkbox" bind:checked={autoScroll} class="rounded" />
							Auto-scroll
						</label>
						<button
							onclick={exportDebugLog}
							class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
							title="Export debug log as JSON"
						>
							Export
						</button>
						<button
							onclick={() => (showMetrics = !showMetrics)}
							class="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800"
							title="Toggle performance metrics"
						>
							{showMetrics ? 'Hide' : 'Show'} Metrics
						</button>
						<button
							onclick={() => {
								// Generate test API metadata
								debugStore.logApiMetadata(
									{
										model: 'gpt-4o-mini',
										provider: 'openai',
										promptTokens: 150,
										completionTokens: 75,
										totalTokens: 225,
										cost: {
											inputCost: 0.0000225,
											outputCost: 0.000045,
											totalCost: 0.0000675,
											currency: 'USD'
										},
										responseTime: 1250
									},
									{
										chatId: 'test-chat',
										messageId: 'test-message'
									}
								);
							}}
							class="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
							title="Generate test API metadata"
						>
							Test API Data
						</button>
					</div>
				</div>

				{#if showMetrics}
					<div class="mt-2 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
						<h4 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
							Performance Metrics
						</h4>
						<div class="grid grid-cols-2 gap-2 text-xs">
							<div>Total Messages: <span class="font-mono">{metrics.total}</span></div>
							<div>Errors: <span class="font-mono text-red-600">{metrics.errorCount}</span></div>
							<div>Avg Interval: <span class="font-mono">{metrics.avgTimeBetween}ms</span></div>
							<div>
								Streaming: <span
									class="font-mono {metrics.streamingActive ? 'text-green-600' : 'text-gray-500'}"
									>{metrics.streamingActive ? 'Active' : 'Idle'}</span
								>
							</div>
						</div>

						{#if metrics.apiMetrics.totalRequests > 0}
							<div class="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
								<h5 class="mb-2 text-xs font-medium text-gray-900 dark:text-gray-100">
									API Usage Statistics
								</h5>
								<div class="grid grid-cols-2 gap-2 text-xs">
									<div>
										API Requests: <span class="font-mono">{metrics.apiMetrics.totalRequests}</span>
									</div>
									<div>
										Total Tokens: <span class="font-mono"
											>{metrics.apiMetrics.totalTokens.toLocaleString()}</span
										>
									</div>
									<div>
										Total Cost: <span class="font-mono text-green-600"
											>${metrics.apiMetrics.totalCost.toFixed(6)}</span
										>
									</div>
									<div>
										Avg Response: <span class="font-mono"
											>{Math.round(metrics.apiMetrics.averageResponseTime)}ms</span
										>
									</div>
								</div>

								{#if Object.keys(metrics.apiMetrics.modelUsage).length > 0}
									<div class="mt-2">
										<div class="text-xs text-gray-600 dark:text-gray-400">Models Used:</div>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each Object.entries(metrics.apiMetrics.modelUsage) as [model, count] (model)}
												<span class="rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900">
													{model}: {count}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								{#if Object.keys(metrics.apiMetrics.providerUsage).length > 0}
									<div class="mt-2">
										<div class="text-xs text-gray-600 dark:text-gray-400">Providers Used:</div>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each Object.entries(metrics.apiMetrics.providerUsage) as [provider, count] (provider)}
												<span class="rounded bg-purple-100 px-1 py-0.5 text-xs dark:bg-purple-900">
													{provider}: {count}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}

						<div class="mt-2">
							<div class="text-xs text-gray-600 dark:text-gray-400">Message Types:</div>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each Object.entries(metrics.byType) as [type, count] (type)}
									<span class="rounded bg-gray-200 px-1 py-0.5 text-xs dark:bg-gray-700">
										{type}: {count}
									</span>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Messages -->
			<div
				bind:this={messagesContainer}
				class="flex-1 overflow-y-auto bg-gray-50 p-2 dark:bg-gray-900"
			>
				{#if filteredMessages().length === 0}
					<div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
						<div class="text-center">
							<div class="mb-2 text-4xl">🐛</div>
							<p>No debug messages yet</p>
							<p class="mt-1 text-sm">
								{#if !debugEnabled}
									Enable debug mode (Ctrl+D) to start capturing messages
								{:else if searchTerm}
									Try adjusting your search filter
								{:else}
									Start a conversation to see debug information streaming in real-time
								{/if}
							</p>
						</div>
					</div>
				{:else}
					<div class="space-y-2">
						{#each filteredMessages() as message, index (message.id)}
							<div
								class={`rounded-lg border p-3 ${getTypeColor(message.type)} border-gray-200 dark:border-gray-600 ${index < 3 ? 'animate-in slide-in-from-top-2 duration-300' : ''}`}
							>
								<div class="mb-2 flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span class="rounded bg-white px-2 py-1 font-mono text-xs dark:bg-gray-800">
											{message.type}
										</span>
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{formatTimestamp(message.timestamp)}
										</span>
										{#if index < debugStore.newMessageCount}
											<span class="animate-pulse rounded bg-red-500 px-1 py-0.5 text-xs text-white">
												NEW
											</span>
										{/if}
									</div>
									<button
										onclick={() => copyToClipboard(formatData(message))}
										class="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
										title="Copy to clipboard"
										aria-label="Copy message to clipboard"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									</button>
								</div>

								{#if message.metadata}
									<div class="mb-2 text-xs text-gray-600 dark:text-gray-400">
										{#if message.metadata.chatId}
											<span class="mr-2">Chat: {message.metadata.chatId.slice(-8)}</span>
										{/if}
										{#if message.metadata.messageId}
											<span class="mr-2">Message: {message.metadata.messageId.slice(-8)}</span>
										{/if}
										{#if message.metadata.toolCallId}
											<span class="mr-2">Tool Call: {message.metadata.toolCallId.slice(-8)}</span>
										{/if}
										{#if message.metadata.toolName}
											<span class="mr-2">Tool: {message.metadata.toolName}</span>
										{/if}
									</div>
								{/if}

								<pre class="overflow-x-auto text-xs text-gray-700 dark:text-gray-300"><code
										>{formatData(message.data)}</code
									></pre>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Global styles for body margin adjustment -->
<style>
	:global(body) {
		transition: margin-right 0.2s ease;
	}

	:global(.debug-panel-open) {
		transition: margin-right 0.2s ease;
	}
</style>
