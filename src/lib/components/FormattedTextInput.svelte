<script lang="ts">
	import { parseFormattedText, type FormatRule } from '$lib/utils/text-formatter';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';

	interface Props {
		value: string;
		disabled?: boolean;
		placeholder?: string;
		rows?: number;
		class?: string;
		rules?: FormatRule[];
		onInput?: (event: Event) => void;
		onKeydown?: (event: KeyboardEvent) => void;
		onFocus?: (event: FocusEvent) => void;
		onBlur?: (event: FocusEvent) => void;
	}

	let {
		value = $bindable(),
		disabled = false,
		placeholder = '',
		rows = 1,
		class: className = '',
		rules,
		onInput,
		onKeydown,
		onFocus,
		onBlur
	}: Props = $props();

	let textareaElement: HTMLTextAreaElement;
	let isFocused = $state(false);

	let segments = $state([]);
	let hoveredTool = $state<ToolMetadata | null>(null);
	let tooltipPosition = $state({ x: 0, y: 0 });
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		try {
			const result = parseFormattedText(value, rules);
			segments = Array.isArray(result) ? result : [];
		} catch (error) {
			console.error('Error parsing text:', error);
			segments = [];
		}
	});

	function handleInput(event: Event) {
		onInput?.(event);
	}

	function handleKeydown(event: KeyboardEvent) {
		onKeydown?.(event);
	}

	function handleFocus(event: FocusEvent) {
		onFocus?.(event);
		isFocused = true;
	}

	function handleBlur(event: FocusEvent) {
		onBlur?.(event);
		isFocused = false;
	}

	export function getTextarea() {
		return textareaElement;
	}

	export function focus() {
		textareaElement?.focus();
	}

	export function blur() {
		textareaElement?.blur();
	}

	export function setSelectionRange(start: number, end: number) {
		textareaElement?.setSelectionRange(start, end);
	}

	function getToolData(toolName: string): ToolMetadata | null {
		try {
			const tools = toolRegistry.getEnabledTools();
			return tools[toolName] || null;
		} catch (error) {
			console.warn('Error getting tool data:', error);
			return null;
		}
	}

	function handleToolHover(event: MouseEvent, toolName: string) {
		// Clear any existing timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		
		// Set new timeout for 100ms delay
		hoverTimeout = setTimeout(() => {
			const tool = getToolData(toolName);
			if (tool) {
				hoveredTool = tool;
				const rect = (event.target as HTMLElement).getBoundingClientRect();
				tooltipPosition = { 
					x: rect.left + rect.width / 2, 
					y: rect.top - 10 
				};
			}
		}, 100);
	}

	function handleToolLeave() {
		// Clear timeout if hovering stops before delay
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		hoveredTool = null;
	}

	function handleToolKeydown(event: KeyboardEvent, toolName: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			const tool = getToolData(toolName);
			if (tool) {
				hoveredTool = tool;
				const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
				tooltipPosition = { 
					x: rect.left + rect.width / 2, 
					y: rect.top - 10 
				};
			}
		} else if (event.key === 'Escape') {
			hoveredTool = null;
		}
	}

	function getCategoryIcon(category: string): string {
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

	// Cleanup timeout on component destruction
	$effect(() => {
		return () => {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
			}
		};
	});
</script>

<div class="relative {className}">
	{#if value.trim()}
		<!-- Formatted overlay - always visible when there's text -->
		<div
			class="pointer-events-none absolute inset-0 z-10 px-4 py-3 break-words whitespace-pre-wrap"
			style="font-family: inherit; font-size: inherit; line-height: inherit; overflow: hidden;"
		>
			{#each segments as segment, index (index)}
				{#if segment.isFormatted && segment.className}
					{#if segment.text.startsWith('@')}
						<span 
							class="{segment.className} cursor-help pointer-events-auto"
							role="button"
							tabindex="0"
							style="text-decoration: underline; text-decoration-color: rgba(59, 130, 246, 0.5); text-decoration-thickness: 2px; text-underline-offset: 1px;"
							onmouseenter={(e) => handleToolHover(e, segment.text.slice(1))}
							onmouseleave={handleToolLeave}
							onkeydown={(e) => handleToolKeydown(e, segment.text.slice(1))}
						>{segment.text}</span>
					{:else}
						<span class="{segment.className}">{segment.text}</span>
					{/if}
				{:else}
					<span class="text-gray-900 dark:text-gray-100 pointer-events-none">{segment.text}</span>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Actual textarea -->
	<textarea
		bind:this={textareaElement}
		bind:value
		{disabled}
		{placeholder}
		{rows}
		class="relative z-30 w-full resize-none overflow-hidden px-4 py-3 placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder-gray-400 {value.trim()
			? 'text-transparent caret-gray-900 dark:caret-gray-100'
			: 'text-gray-900 dark:text-gray-100'}"
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
	></textarea>

	<!-- Tooltip -->
	{#if hoveredTool}
		<div
			class="pointer-events-none fixed z-50 max-w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800"
			style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; transform: translateX(-50%) translateY(-100%);"
		>
			<div class="flex items-center gap-2 mb-2">
				<span class="text-sm">{getCategoryIcon(hoveredTool.category || 'general')}</span>
				<div>
					<div class="font-medium text-sm text-gray-900 dark:text-gray-100">
						@{hoveredTool.name}
					</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 capitalize">
						{hoveredTool.category || 'general'}
					</div>
				</div>
			</div>
			<div class="text-sm text-gray-700 dark:text-gray-300 mb-2">
				{hoveredTool.description}
			</div>
			{#if hoveredTool.tags && hoveredTool.tags.length > 0}
				<div class="flex gap-1 flex-wrap">
					{#each hoveredTool.tags as tag (tag)}
						<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>