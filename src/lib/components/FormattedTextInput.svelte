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
	}

	function handleBlur(event: FocusEvent) {
		onBlur?.(event);
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

	function handleMouseMove(event: MouseEvent) {
		if (!value.trim()) return;

		const textarea = event.currentTarget as HTMLTextAreaElement;

		// Use textarea properties to calculate approximate character position
		const rect = textarea.getBoundingClientRect();
		const x = event.clientX - rect.left - 16; // Account for padding
		const y = event.clientY - rect.top - 12; // Account for padding

		// Estimate character position based on font metrics
		const lineHeight = 24; // Approximate line height
		const charWidth = 8; // Approximate character width
		const lineNumber = Math.floor(y / lineHeight);
		const charInLine = Math.floor(x / charWidth);

		// Calculate approximate text position
		const lines = value.split('\n');
		let charPosition = 0;

		for (let i = 0; i < lineNumber && i < lines.length; i++) {
			charPosition += lines[i].length + 1; // +1 for newline
		}

		if (lineNumber < lines.length) {
			charPosition += Math.min(charInLine, lines[lineNumber].length);
		}

		// Find which segment contains this position
		let currentPos = 0;
		let hoveredSegment = null;

		for (const segment of segments) {
			const segmentEnd = currentPos + segment.text.length;
			if (charPosition >= currentPos && charPosition < segmentEnd) {
				hoveredSegment = segment;
				break;
			}
			currentPos = segmentEnd;
		}

		// Show tooltip if hovering over a tool segment
		if (hoveredSegment && hoveredSegment.isFormatted && hoveredSegment.text.startsWith('@')) {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
			}

			hoverTimeout = setTimeout(() => {
				const toolName = hoveredSegment.text.slice(1);
				const tool = getToolData(toolName);
				if (tool) {
					hoveredTool = tool;
					tooltipPosition = { x: event.clientX, y: event.clientY - 10 };
				}
			}, 100);
		} else {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
				hoverTimeout = null;
			}
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
							class={segment.className}
							style="text-decoration: underline; text-decoration-color: rgba(59, 130, 246, 0.5); text-decoration-thickness: 2px; text-underline-offset: 1px;"
							>{segment.text}</span
						>
					{:else}
						<span class={segment.className}>{segment.text}</span>
					{/if}
				{:else}
					<span class="text-gray-900 dark:text-gray-100">{segment.text}</span>
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
		onmousemove={handleMouseMove}
	></textarea>

	<!-- Tooltip -->
	{#if hoveredTool}
		<div
			class="pointer-events-none fixed z-50 max-w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800"
			style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; transform: translateX(-50%) translateY(-100%);"
		>
			<div class="mb-2 flex items-center gap-2">
				<span class="text-sm">{getCategoryIcon(hoveredTool.category || 'general')}</span>
				<div>
					<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
						@{hoveredTool.name}
					</div>
					<div class="text-xs text-gray-500 capitalize dark:text-gray-400">
						{hoveredTool.category || 'general'}
					</div>
				</div>
			</div>
			<div class="mb-2 text-sm text-gray-700 dark:text-gray-300">
				{hoveredTool.description}
			</div>
			{#if hoveredTool.tags && hoveredTool.tags.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each hoveredTool.tags as tag (tag)}
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
</div>
