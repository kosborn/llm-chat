<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';

	import {
		countTokens,
		formatTokenCount,
		getTokenCountColor
	} from '$lib/utils/simple-token-counter';
	import ToolSelector from './ToolSelector.svelte';
	import FormattedTextInput from './FormattedTextInput.svelte';
	import { createOptimizedDefaultRules } from '$lib/utils/text-formatter-manager';
	import { ToolMentionManager } from '$lib/utils/tool-mention-manager.js';
	import { debugConsole } from '$lib/utils/console.js';

	import type { ToolMetadata } from '$lib/tools/types.js';
	import type { ProviderId } from '$lib/providers/index.js';

	interface Props {
		disabled?: boolean;
		placeholder?: string;
		provider?: ProviderId;
		model?: string;
	}

	let {
		disabled = false,
		placeholder = 'Type a message...',
		provider = 'groq',
		model = 'meta-llama/llama-4-scout-17b-16e-instruct'
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: {
			message: string;
			provider: string;
			model: string;
			mentionedTools?: string[];
		};
	}>();

	let inputValue = $state('');
	let formattedTextInput: FormattedTextInput;

	// Tool selector state
	let showToolSelector = $state(false);
	let toolSelectorPosition = $state({ x: 0, y: 0 });
	let toolFilterText = $state('');
	let atSymbolPosition = $state(-1);
	let toolSelectorComponent: ToolSelector;
	let checkToolTimeout: ReturnType<typeof setTimeout> | null = null;

	// Token counting
	const tokenCount = $derived(() => countTokens(inputValue));

	// Send button styling based on provider status
	const sendButtonClass = $derived(() => {
		if (disabled) {
			return 'flex min-w-[60px] items-center justify-center gap-2 rounded-lg bg-gray-400 px-3 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed md:min-w-[80px] md:px-6';
		}

		if (!networkStore.isOnline || !providerStore.isConfigured || !providerStore.canSend) {
			return 'flex min-w-[60px] items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-3 font-medium text-white transition-colors hover:bg-red-700 md:min-w-[80px] md:px-6';
		}

		if (
			providerStore.effectiveMode === 'server' ||
			(providerStore.preferredMode === 'server' && providerStore.effectiveMode === 'server')
		) {
			return 'flex min-w-[60px] items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-3 font-medium text-white transition-colors hover:bg-green-700 md:min-w-[80px] md:px-6';
		}

		if (providerStore.effectiveMode === 'client' || providerStore.preferredMode === 'client') {
			return 'flex min-w-[60px] items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-3 font-medium text-white transition-colors hover:bg-purple-700 md:min-w-[80px] md:px-6';
		}

		// Default blue for auto mode
		return 'flex min-w-[60px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 font-medium text-white transition-colors hover:bg-blue-700 md:min-w-[80px] md:px-6';
	});

	function handleSubmit(event?: SubmitEvent) {
		event?.preventDefault();
		const message = inputValue.trim();
		if (message && !disabled) {
			// Analyze tool mentions for temporary enabling
			const mentionContext = ToolMentionManager.analyzeMessage(message);

			dispatch('submit', {
				message,
				provider,
				model,
				mentionedTools: mentionContext.mentionedTools
			});
			inputValue = '';
			// Reset textarea height
			const textarea = formattedTextInput?.getTextarea();
			if (textarea) {
				textarea.style.height = 'auto';
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Handle tool selector navigation
		if (showToolSelector) {
			if (event.key === 'Tab') {
				event.preventDefault();
				handleTabComplete();
				return;
			}
			// Let ToolSelector handle other navigation keys
			return;
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		} else if (event.key === 'Escape') {
			hideToolSelector();
		}
	}

	function autoResize() {
		try {
			const textarea = formattedTextInput?.getTextarea();
			if (textarea) {
				textarea.style.height = 'auto';
				textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
			}
		} catch (error) {
			debugConsole.error('Error in autoResize:', error);
		}
	}

	function handleInput() {
		try {
			autoResize();
			checkForToolSelector();
		} catch (error) {
			debugConsole.error('Error in handleInput:', error);
		}
	}

	function checkForToolSelector() {
		try {
			const text = inputValue;
			const textarea = formattedTextInput?.getTextarea();
			const cursorPosition = textarea?.selectionStart || 0;

			// Debounce rapid calls
			if (checkToolTimeout) {
				clearTimeout(checkToolTimeout);
			}

			checkToolTimeout = setTimeout(() => {
				try {
					// Find the last @ symbol before cursor
					let lastAtIndex = -1;
					for (let i = cursorPosition - 1; i >= 0; i--) {
						if (text[i] === '@') {
							// Check if @ is at start or preceded by whitespace
							if (i === 0 || /\s/.test(text[i - 1])) {
								lastAtIndex = i;
								break;
							}
						} else if (/\s/.test(text[i])) {
							// Hit whitespace before finding valid @
							break;
						}
					}

					if (lastAtIndex >= 0) {
						// Extract filter text after @
						const filterStart = lastAtIndex + 1;
						const filterText = text.slice(filterStart, cursorPosition);

						// Only show if filter doesn't contain spaces and is reasonable length
						if (!filterText.includes(' ') && filterText.length <= 30) {
							atSymbolPosition = lastAtIndex;
							toolFilterText = filterText;
							showToolSelector = true;
							updateToolSelectorPosition();
							return;
						}
					}

					hideToolSelector();
				} catch (innerError) {
					debugConsole.error('Error in checkForToolSelector timeout:', innerError);
					hideToolSelector();
				}
			}, 100); // 100ms debounce
		} catch (error) {
			debugConsole.error('Error in checkForToolSelector:', error);
			hideToolSelector();
		}
	}

	function updateToolSelectorPosition() {
		try {
			const textarea = formattedTextInput?.getTextarea();
			if (!textarea || atSymbolPosition < 0) return;

			const textareaRect = textarea.getBoundingClientRect();

			// Position for bottom-anchored popup - set Y to just above textarea
			toolSelectorPosition = {
				x: textareaRect.left + 16, // Account for padding
				y: textareaRect.top - 5 // Position just above textarea for bottom-anchored popup
			};
		} catch (error) {
			debugConsole.error('Error updating tool selector position:', error);
		}
	}

	function hideToolSelector() {
		if (checkToolTimeout) {
			clearTimeout(checkToolTimeout);
			checkToolTimeout = null;
		}
		showToolSelector = false;
		toolFilterText = '';
		atSymbolPosition = -1;
	}

	function handleToolSelect(event: CustomEvent<{ tool: ToolMetadata }>) {
		try {
			const tool = event.detail.tool;

			if (atSymbolPosition >= 0) {
				// Replace @filter with @toolname
				const beforeAt = inputValue.slice(0, atSymbolPosition);
				const afterFilter = inputValue.slice(atSymbolPosition + 1 + toolFilterText.length);

				// Check if we need to add a space after the tool name
				const needsSpace = !afterFilter.startsWith(' ');
				const toolText = needsSpace ? `@${tool.name} ` : `@${tool.name}`;

				inputValue = `${beforeAt}${toolText}${afterFilter}`;

				// Position cursor after the tool name (and space if added)
				setTimeout(() => {
					const textarea = formattedTextInput?.getTextarea();
					if (textarea) {
						const newPosition = beforeAt.length + toolText.length;
						textarea.setSelectionRange(newPosition, newPosition);
						textarea.focus();
					}
				}, 0);
			}

			hideToolSelector();
			autoResize();
		} catch (error) {
			debugConsole.error('Error handling tool selection:', error);
			hideToolSelector();
		}
	}

	export function handleTabComplete() {
		try {
			const filteredTools = toolSelectorComponent?.getFilteredTools() || [];
			if (filteredTools.length > 0) {
				handleToolSelect({ detail: { tool: filteredTools[0] } } as CustomEvent<{
					tool: ToolMetadata;
				}>);
			}
		} catch (error) {
			debugConsole.error('Error in tab completion:', error);
		}
	}

	export function focus() {
		formattedTextInput?.focus();
	}

	$effect(() => {
		// Only run autoResize when inputValue changes, not on every state change
		if (inputValue !== undefined) {
			try {
				const textarea = formattedTextInput?.getTextarea();
				if (textarea) {
					autoResize();
				}
			} catch (error) {
				debugConsole.error('Error in effect autoResize:', error);
			}
		}
	});
</script>

<div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
	<form onsubmit={handleSubmit} class="flex items-end gap-2 md:gap-3">
		<div class="flex-1">
			<FormattedTextInput
				bind:this={formattedTextInput}
				bind:value={inputValue}
				onKeydown={handleKeydown}
				onInput={handleInput}
				{disabled}
				{placeholder}
				rows={1}
				rules={createOptimizedDefaultRules()}
				class="max-h-[120px] min-h-[48px] rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
			/>
		</div>

		<button type="submit" {disabled} class={sendButtonClass()}>
			{#if disabled}
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></div>
			{:else}
				<span class="hidden md:inline">Send</span>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
				</svg>
			{/if}
		</button>
	</form>

	<div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
		<div class="flex items-center gap-2 md:gap-4">
			<span class="hidden md:inline">Press Enter to send, Shift+Enter for new line</span>
			{#if inputValue.trim()}
				<span class="font-mono {getTokenCountColor(tokenCount())}">
					{formatTokenCount(tokenCount())}
				</span>
			{/if}
		</div>
	</div>

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
