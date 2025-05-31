<script lang="ts">
	import FormattedTextInput from '$lib/components/FormattedTextInput.svelte';
	import ToolSelector from '$lib/components/ToolSelector.svelte';
	import { defaultFormatRules, parseFormattedText } from '$lib/utils/text-formatter';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';

	let testValue = $state('Type @weather or visit https://example.com to test formatting');
	let cursorPosition = $state(0);
	let showToolSelector = $state(false);
	let toolSelectorPosition = $state({ x: 0, y: 0 });
	let toolFilterText = $state('');
	let atSymbolPosition = $state(-1);
	let isInputFocused = $state(false);

	let formattedTextInput: FormattedTextInput;
	let toolSelectorComponent: ToolSelector;

	// Tooltip debugging states
	let tooltipDebugInfo = $state({
		isHovering: false,
		hoveredTool: null,
		tooltipPosition: { x: 0, y: 0 },
		lastHoverEvent: null,
		hoverStartTime: null
	});

	let segments = $state([]);

	$effect(() => {
		// console.group('🔄 sDebug Page $effect - Parsing Segments');
		// console.log('Input testValue:', testValue);
		// console.log('Input testValue.trim():', testValue.trim());
		// console.log('defaultFormatRules:', defaultFormatRules);
		// console.log('defaultFormatRules type:', typeof defaultFormatRules);
		// console.log('defaultFormatRules length:', defaultFormatRules?.length);
		try {
			const result = parseFormattedText(testValue, defaultFormatRules);
			// console.log('parseFormattedText result:', result);
			// console.log('parseFormattedText result type:', typeof result);
			// console.log('parseFormattedText result isArray:', Array.isArray(result));
			segments = Array.isArray(result) ? result : [];
			// console.log('Final segments assigned:', segments);
			// console.log('Segments with formatting:', segments.filter(s => s.isFormatted));
			// console.log('Tool segments:', segments.filter(s => s.isFormatted && s.text.startsWith('@')));
		} catch (error) {
			// console.error('Error parsing text:', error);
			// console.error('Error details:', error.message);
			// console.error('Error stack:', error.stack);
			segments = [];
		}
		// console.groupEnd();
	});

	function handleInput() {
		checkForToolSelector();
	}

	function handleKeydown(event: KeyboardEvent) {
		console.log('Key pressed:', event.key);

		if (showToolSelector) {
			if (event.key === 'Tab') {
				event.preventDefault();
				handleTabComplete();
				return;
			}
		}

		if (event.key === 'Escape') {
			hideToolSelector();
		}
	}

	function handleFocus() {
		isInputFocused = true;
	}

	function handleBlur() {
		isInputFocused = false;
	}

	function testCursorPosition() {
		const textarea = formattedTextInput?.getTextarea();
		if (textarea) {
			cursorPosition = textarea.selectionStart || 0;
			console.log('Cursor position:', cursorPosition);
		}
	}

	function checkForToolSelector() {
		const text = testValue;
		const textarea = formattedTextInput?.getTextarea();
		const cursorPos = textarea?.selectionStart || 0;

		// Find the last @ symbol before cursor
		let lastAtIndex = -1;
		for (let i = cursorPos - 1; i >= 0; i--) {
			if (text[i] === '@') {
				if (i === 0 || /\s/.test(text[i - 1])) {
					lastAtIndex = i;
					break;
				}
			} else if (/\s/.test(text[i])) {
				break;
			}
		}

		if (lastAtIndex >= 0) {
			const filterStart = lastAtIndex + 1;
			const filterText = text.slice(filterStart, cursorPos);

			if (!filterText.includes(' ')) {
				atSymbolPosition = lastAtIndex;
				toolFilterText = filterText;
				showToolSelector = true;
				updateToolSelectorPosition();
				return;
			}
		}

		hideToolSelector();
	}

	function updateToolSelectorPosition() {
		const textarea = formattedTextInput?.getTextarea();
		if (!textarea || atSymbolPosition < 0) return;

		const textareaRect = textarea.getBoundingClientRect();

		toolSelectorPosition = {
			x: textareaRect.left + 16,
			y: textareaRect.top - 5
		};
	}

	function hideToolSelector() {
		showToolSelector = false;
		toolFilterText = '';
		atSymbolPosition = -1;
	}

	function handleToolSelect(event: CustomEvent<{ tool: ToolMetadata }>) {
		const tool = event.detail.tool;

		if (atSymbolPosition >= 0) {
			const beforeAt = testValue.slice(0, atSymbolPosition);
			const afterFilter = testValue.slice(atSymbolPosition + 1 + toolFilterText.length);

			const needsSpace = !afterFilter.startsWith(' ');
			const toolText = needsSpace ? `@${tool.name} ` : `@${tool.name}`;

			testValue = `${beforeAt}${toolText}${afterFilter}`;

			setTimeout(() => {
				const textarea = formattedTextInput?.getTextarea();
				if (textarea) {
					const newPosition = beforeAt.length + toolText.length;
					textarea.setSelectionRange(newPosition, newPosition);
					textarea.focus();
					cursorPosition = newPosition;
				}
			}, 0);
		}

		hideToolSelector();
	}

	function handleTabComplete() {
		const filteredTools = toolSelectorComponent?.getFilteredTools() || [];
		if (filteredTools.length > 0) {
			handleToolSelect({ detail: { tool: filteredTools[0] } } as CustomEvent<{
				tool: ToolMetadata;
			}>);
		}
	}

	// Tooltip debugging functions
	function testTooltipWithSampleText() {
		testValue = 'Hover over @weather to see tooltip';
		setTimeout(() => {
			console.log('🔍 Test tooltip by hovering over @weather in the preview section');
			console.log(
				'💡 Look for formatted @ tool text - tooltip appears automatically on hover'
			);
		}, 100);
	}

	function simulateTooltipHover() {
		// Show tooltip for weather tool as example
		tooltipData = getToolData('weather');
		tooltipPosition = { x: 400, y: 300 };
		showTooltip = true;
		console.log('Tooltip simulated - showing weather tool info');
		tooltipDebugInfo.lastHoverEvent = new Date().toISOString();
		
		// Auto-hide after 3 seconds
		setTimeout(() => {
			showTooltip = false;
			tooltipData = null;
		}, 3000);
	}

	function logTooltipState() {
		console.log('Current tooltip debug state:', tooltipDebugInfo);
		const textarea = formattedTextInput?.getTextarea();
		if (textarea) {
			console.log('Input element bounds:', textarea.getBoundingClientRect());
		}
	}

	function addTooltipTestCases() {
		testValue =
			'Test tooltips: @weather for weather info, @calculator for math, @timer for time tools. Hover over each @ tool in the preview!';
	}

	// Monitor tooltip state from FormattedTextInput
	function updateTooltipDebugInfo() {
		const formattedInput = formattedTextInput;
		if (formattedInput) {
			// This would require exposing internal state from FormattedTextInput
			// For now, we'll track what we can observe
			tooltipDebugInfo.lastHoverEvent = new Date().toISOString();
		}
	}

	// Alternative tooltip approach - add tooltips directly to formatted preview text
	let tooltipData = $state(null);
	let tooltipPosition = $state({ x: 0, y: 0 });
	let showTooltip = $state(false);



	function getToolData(toolName) {
		try {
			const tools = toolRegistry.getEnabledTools();
			return tools[toolName] || null;
		} catch (error) {
			console.warn('Error getting tool data:', error);
			return null;
		}
	}

	function getCategoryIcon(category) {
		switch (category) {
			case 'utility':
				return '🔧';
			case 'web':
				return '🌐';
			case 'data':
				return '📊';
			case 'ai':
				return '🤖';
			case 'development':
				return '💻';
			case 'weather':
				return '🌤️';
			default:
				return '⚡';
		}
	}
</script>

<svelte:head>
	<title>Text Formatting Debug - AI Tool Chat</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 py-8">
		<div class="mx-auto max-w-4xl">
			<h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
				Text Formatting Debug
			</h1>

			<!-- Debug Info -->
			<div class="mb-4 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
				<h3 class="mb-2 font-medium text-yellow-800 dark:text-yellow-200">Debug Info:</h3>
				<div class="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
					<p><strong>Test Value:</strong> "{testValue}"</p>
					<p><strong>Segments Count:</strong> {segments.length}</p>
					<p>
						<strong>Has Rules:</strong>
						{defaultFormatRules ? 'Yes' : 'No'} ({defaultFormatRules?.length || 0} rules)
					</p>
					<p>
						<strong>Available Tools:</strong>
						{Object.keys(toolRegistry.getEnabledTools()).join(', ') || 'None'}
					</p>
					<p>
						<strong>Sample Segments:</strong>
						{JSON.stringify(
							segments
								.slice(0, 3)
								.map((s) => ({ text: s.text, isFormatted: s.isFormatted, hasClass: !!s.className }))
						)}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<!-- Input Testing Section -->
				<div class="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
						Interactive Input Test
					</h2>

					<div class="space-y-4">
						<div>
							<label for="formatted-input" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Formatted Text Input:
							</label>
							<div class="relative">
								<FormattedTextInput
									id="formatted-input"
									bind:this={formattedTextInput}
									bind:value={testValue}
									rules={defaultFormatRules}
									onInput={handleInput}
									onKeydown={handleKeydown}
									onFocus={handleFocus}
									onBlur={handleBlur}
									class="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
									placeholder="Type @weather or https://example.com..."
									rows={3}
								/>

								<!-- Tool Selector -->
								<ToolSelector
									bind:this={toolSelectorComponent}
									visible={showToolSelector}
									position={toolSelectorPosition}
									filter={toolFilterText}
									on:select={handleToolSelect}
									on:close={hideToolSelector}
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<button
								onclick={testCursorPosition}
								class="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
							>
								Get Cursor Position
							</button>

							<div class="flex items-center text-sm text-gray-600 dark:text-gray-400">
								Position: <span class="ml-1 font-mono">{cursorPosition}</span>
							</div>
						</div>

						<div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
							<p><strong>Tool Selector:</strong> {showToolSelector ? 'Open' : 'Closed'}</p>
							<p><strong>Filter:</strong> "{toolFilterText}"</p>
							<p><strong>@ Position:</strong> {atSymbolPosition}</p>
							<p><strong>Input Focused:</strong> {isInputFocused ? 'Yes' : 'No'}</p>
						</div>

						<!-- Tooltip Debugging Controls -->
						<div class="mt-4 space-y-2">
							<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
								Tooltip Debug Controls:
							</h4>
							<div class="grid grid-cols-2 gap-2">
								<button
									onclick={testTooltipWithSampleText}
									class="rounded bg-purple-100 px-3 py-1 text-xs text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
								>
									🔍 Hover Test
								</button>
								<button
									onclick={addTooltipTestCases}
									class="rounded bg-purple-100 px-3 py-1 text-xs text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
								>
									📋 Multi-Tool Test
								</button>


								<button
									onclick={simulateTooltipHover}
									class="rounded bg-green-100 px-3 py-1 text-xs text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
								>
									💡 Show Example
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Formatting & Tooltip Debugging Section -->
				<div class="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
						Formatting & Tooltip Debugging
					</h2>

					<div class="space-y-4">
						<!-- Real-time formatted preview -->
						{#if testValue.trim()}
							<div class="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
								<h3 class="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">
									Real-time Formatted Preview:
								</h3>
								<div class="text-sm" id="formatted-preview">
									{#each segments as segment}
										{#if segment.isFormatted && segment.className}
											{#if segment.text.startsWith('@')}
												<span
													class="{segment.className} relative cursor-pointer"
													role="button"
													tabindex="0"
													title="Hover for tool information"
													onmouseover={(e) => {
														const toolName = segment.text.slice(1);
														tooltipData = getToolData(toolName);
													
														// Calculate position to avoid viewport edges
														const rect = e.target.getBoundingClientRect();
														const tooltipWidth = 320; // max-w-xs is roughly 320px
														const tooltipHeight = 150; // estimated height
													
														let x = rect.left + (rect.width / 2);
														let y = rect.top - 10;
													
														// Adjust if too far right
														if (x + tooltipWidth / 2 > window.innerWidth - 20) {
															x = window.innerWidth - tooltipWidth / 2 - 20;
														}
														// Adjust if too far left
														if (x - tooltipWidth / 2 < 20) {
															x = tooltipWidth / 2 + 20;
														}
														// Adjust if too close to top
														if (y - tooltipHeight < 20) {
															y = rect.bottom + 10;
														}
													
														tooltipPosition = { x, y };
														showTooltip = true;
													}}
													onfocus={(e) => {
														const toolName = segment.text.slice(1);
														tooltipData = getToolData(toolName);
													
														// Calculate position to avoid viewport edges
														const rect = e.target.getBoundingClientRect();
														const tooltipWidth = 320; // max-w-xs is roughly 320px
														const tooltipHeight = 150; // estimated height
													
														let x = rect.left + (rect.width / 2);
														let y = rect.top - 10;
													
														// Adjust if too far right
														if (x + tooltipWidth / 2 > window.innerWidth - 20) {
															x = window.innerWidth - tooltipWidth / 2 - 20;
														}
														// Adjust if too far left
														if (x - tooltipWidth / 2 < 20) {
															x = tooltipWidth / 2 + 20;
														}
														// Adjust if too close to top
														if (y - tooltipHeight < 20) {
															y = rect.bottom + 10;
														}
													
														tooltipPosition = { x, y };
														showTooltip = true;
													}}
													onmouseout={() => {
														showTooltip = false;
														tooltipData = null;
													}}
													onblur={() => {
														showTooltip = false;
														tooltipData = null;
													}}
												>
													{segment.text}
												</span>
											{:else}
												<span
													class="{segment.className} relative cursor-pointer"
													title="Formatted text"
												>
													{segment.text}
												</span>
											{/if}
										{:else}
											<span class="text-gray-900 dark:text-gray-100">{segment.text}</span>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						<div class="rounded bg-gray-50 p-4 dark:bg-gray-700">
							<h3 class="mb-2 font-medium text-gray-700 dark:text-gray-300">Parsed Segments:</h3>
							<div class="space-y-1 text-sm">
								{#each segments as segment, index}
									<div class="flex items-center gap-2">
										<span class="text-xs text-gray-500">#{index}:</span>
										{#if segment.isFormatted}
											<span class="text-xs text-green-600 dark:text-green-400">Formatted</span>
											<span class="mx-1">→</span>
											<span class={segment.className}>{segment.text}</span>
											{#if segment.text.startsWith('@')}
												<span
													class="ml-1 rounded bg-purple-100 px-1 text-xs text-purple-600 dark:bg-purple-900/50 dark:text-purple-300"
												>
													tooltip target
												</span>
											{/if}
										{:else}
											<span class="text-xs text-gray-600 dark:text-gray-400">Plain</span>
											<span class="mx-1">→</span>
											<span class="text-gray-700 dark:text-gray-300">"{segment.text}"</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Alternative Tooltip Display -->
			{#if showTooltip && tooltipData}
				<div
					class="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800"
					style="left: {tooltipPosition?.x || 0}px; top: {tooltipPosition?.y || 0}px; transform: translateX(-50%) translateY(-100%);"
				>
					<div class="mb-2 flex items-center gap-2">
						<span class="text-sm">{getCategoryIcon(tooltipData.category || 'general')}</span>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
								@{tooltipData.name}
							</div>
							<div class="text-xs text-gray-500 capitalize dark:text-gray-400">
								{tooltipData.category || 'general'}
							</div>
						</div>
					</div>
					<div class="mb-2 text-sm text-gray-700 dark:text-gray-300">
						{tooltipData.description}
					</div>
					{#if tooltipData.tags && tooltipData.tags.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each tooltipData.tags as tag (tag)}
								<span
									class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Test Cases Section -->
			<div class="mt-8 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Test Cases</h2>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<button
						onclick={() => (testValue = 'test @weather')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">test @weather</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">Tooltip + cursor test</div>
					</button>

					<button
						onclick={() => (testValue = 'a @weather')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">a @weather</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">Short prefix test</div>
					</button>

					<button
						onclick={() => (testValue = 'Visit https://example.com for info')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">URL test</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">URL highlighting</div>
					</button>

					<button
						onclick={() => (testValue = 'Use @calculator for https://math.com')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">Mixed content</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">Tool + URL</div>
					</button>

					<button
						onclick={() => (testValue = '@invalidtool should not highlight')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">Invalid tool</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">No highlighting</div>
					</button>

					<button
						onclick={() => (testValue = '@weather @calculator @time')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">Multiple tools</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">Multiple highlighting</div>
					</button>

					<button
						onclick={() => (testValue = 'Check https://a.com and https://b.org')}
						class="rounded bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="font-mono text-sm">Multiple URLs</div>
						<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
							Multiple URL highlighting
						</div>
					</button>

					<button
						onclick={() => (testValue = 'Hover @weather @calculator @time for tooltips')}
						class="rounded bg-purple-50 p-3 text-left transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
					>
						<div class="font-mono text-sm">🔍 Tooltip test</div>
						<div class="mt-1 text-xs text-purple-600 dark:text-purple-400">
							Hover over @tools for popover
						</div>
					</button>

					<button
						onclick={() => (testValue = '')}
						class="rounded bg-red-50 p-3 text-left transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
					>
						<div class="font-mono text-sm text-red-600 dark:text-red-400">Clear</div>
						<div class="mt-1 text-xs text-red-500 dark:text-red-400">Reset input</div>
					</button>
				</div>
			</div>

			<!-- Instructions Section -->
			<div class="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
				<h2 class="mb-4 text-xl font-semibold text-blue-900 dark:text-blue-100">
					Testing Instructions
				</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<h3 class="mb-2 font-medium text-blue-800 dark:text-blue-200">
							Tool Selector Testing:
						</h3>
						<ol class="list-inside list-decimal space-y-1 text-sm text-blue-700 dark:text-blue-300">
							<li>Type "@" to see if tool selector appears</li>
							<li>Type "@wea" and press Tab to test autocomplete</li>
							<li>Use arrow keys to navigate options</li>
							<li>Press Enter or Tab to select</li>
							<li>Check cursor position after selection</li>
						</ol>
					</div>

					<div>
						<h3 class="mb-2 font-medium text-blue-800 dark:text-blue-200">Formatting Testing:</h3>
						<ol class="list-inside list-decimal space-y-1 text-sm text-blue-700 dark:text-blue-300">
							<li>Type valid tool names (should get blue background)</li>
							<li>Type invalid tool names (should stay plain)</li>
							<li>Type URLs (should get blue text + underline)</li>
							<li>See real-time formatting while typing</li>
							<li>Formatting updates instantly as you type</li>
						</ol>
					</div>

					<div>
						<h3 class="mb-2 font-medium text-blue-800 dark:text-blue-200">Tooltip Testing:</h3>
						<ol class="list-inside list-decimal space-y-1 text-sm text-blue-700 dark:text-blue-300">
							<li>Click "Load Tooltip Test" to add test content with @weather</li>
							<li>Verify the text shows blue highlighting (means formatting is working)</li>
							<li>Hover slowly over the blue highlighted @weather text in the input above</li>
							<li>Tooltip should appear after 100ms delay with tool information</li>
							<li>Should show tool name, description, category, tags</li>
							<li>Tooltip should disappear when mouse leaves</li>
							<li>Check tooltip positioning and styling</li>
							<li>Test keyboard navigation (Tab, Enter, Escape)</li>
							<li>Monitor real-time state in Formatting & Tooltip Debugging section</li>
							<li>Use "Inspect DOM" button to check actual DOM elements</li>
							<li>Check console for detailed debugging information</li>
						</ol>
					</div>

					<div>
						<h3 class="mb-2 font-medium text-blue-800 dark:text-blue-200">Troubleshooting:</h3>
						<div class="space-y-2 text-sm text-blue-700 dark:text-blue-300">
							<div class="rounded bg-blue-100 p-3 dark:bg-blue-900/30">
								<p class="mb-1 font-medium">Alternative Tooltip Method:</p>
								<ol class="list-inside list-decimal space-y-1 text-xs">
									<li>Click "🔍 Hover Test" to load test content with @weather</li>
									<li>Hover over any @tool text in the "Real-time Formatted Preview" section</li>
									<li>Tooltip appears automatically on hover with tool information</li>
									<li>Move mouse away to hide tooltip</li>
									<li>Check console for debugging information</li>
								</ol>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Raw Data Section -->
			<div class="mt-8 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Raw Data</h2>

				<div class="space-y-4">
					<div>
						<h4 class="mb-2 font-medium text-gray-700 dark:text-gray-300">Current Value:</h4>
						<pre class="overflow-x-auto rounded bg-gray-50 p-3 text-sm dark:bg-gray-700"><code
								>{JSON.stringify(testValue, null, 2)}</code
							></pre>
					</div>

					<div>
						<h4 class="mb-2 font-medium text-gray-700 dark:text-gray-300">Parsed Segments:</h4>
						<pre class="overflow-x-auto rounded bg-gray-50 p-3 text-sm dark:bg-gray-700"><code
								>{JSON.stringify(segments, null, 2)}</code
							></pre>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
