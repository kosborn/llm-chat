<script lang="ts">
	import {
		parseFormattedText,
		type FormatRule,
		type FormatSegment
	} from '$lib/utils/text-formatter-manager';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';
	import { debugConsole } from '$lib/utils/console.js';

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

	let segments = $state<FormatSegment[]>([]);
	let hoveredTool = $state<ToolMetadata | null>(null);
	let tooltipPosition = $state({ x: 0, y: 0 });
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
	let parseTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastParsedValue = $state('');
	let viewportStart = $state(0);
	let viewportEnd = $state(5000); // Initial viewport for first 5000 chars

	// Optimized parsing with shorter debounce and incremental updates
	$effect(() => {
		if (parseTimeout) {
			clearTimeout(parseTimeout);
		}

		// Skip if value hasn't changed
		if (value === lastParsedValue) {
			return;
		}

		// For empty values, parse immediately
		if (!value.trim()) {
			segments = [];
			lastParsedValue = value;
			return;
		}

		// For short text (< 100 chars), parse immediately
		if (value.length < 100) {
			try {
				const result = parseFormattedText(value, rules);
				segments = Array.isArray(result) ? result : [];
				lastParsedValue = value;
			} catch (error) {
				debugConsole.error('Error parsing text:', error);
				segments = [];
			}
			return;
		}

		// For longer text, use viewport-aware parsing
		parseTimeout = setTimeout(() => {
			try {
				// For very long text (>2000 chars), only parse visible portion plus buffer
				if (value.length > 2000) {
					const buffer = 500; // Parse 500 chars before/after viewport
					const textToParse = value.slice(
						Math.max(0, viewportStart - buffer),
						Math.min(value.length, viewportEnd + buffer)
					);
					const offsetStart = Math.max(0, viewportStart - buffer);

					// Parse the viewport section
					const result = parseFormattedText(textToParse, rules);

					// Add unformatted segments for text outside viewport
					const fullSegments: FormatSegment[] = [];

					if (offsetStart > 0) {
						fullSegments.push({
							text: value.slice(0, offsetStart),
							isFormatted: false
						});
					}

					fullSegments.push(...(Array.isArray(result) ? result : []));

					const endOfParsed = offsetStart + textToParse.length;
					if (endOfParsed < value.length) {
						fullSegments.push({
							text: value.slice(endOfParsed),
							isFormatted: false
						});
					}

					segments = fullSegments;
				} else {
					const result = parseFormattedText(value, rules);
					segments = Array.isArray(result) ? result : [];
				}
				lastParsedValue = value;
			} catch (error) {
				debugConsole.error('Error parsing text:', error);
				segments = [];
			}
		}, 50); // Reduced to 50ms debounce for better responsiveness
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

	function updateViewport() {
		if (!textareaElement) return;

		try {
			const scrollTop = textareaElement.scrollTop;
			const clientHeight = textareaElement.clientHeight;
			const lineHeight = 24; // Approximate line height
			const charsPerLine = Math.floor(textareaElement.clientWidth / 8); // Approximate chars per line

			const visibleLines = Math.ceil(clientHeight / lineHeight);
			const startLine = Math.floor(scrollTop / lineHeight);
			const endLine = startLine + visibleLines;

			viewportStart = Math.max(0, startLine * charsPerLine);
			viewportEnd = Math.min(value.length, endLine * charsPerLine);
		} catch (error) {
			debugConsole.warn('Error updating viewport:', error);
		}
	}

	function getToolData(toolName: string): ToolMetadata | null {
		try {
			// First check enabled tools, then all tools (for disabled ones)
			const enabledTools = toolRegistry.getEnabledTools();
			if (enabledTools[toolName]) {
				return enabledTools[toolName];
			}

			const allTools = toolRegistry.getAllTools();
			return allTools[toolName] || null;
		} catch (error) {
			debugConsole.warn('Error getting tool data:', error);
			return null;
		}
	}

	// Optimized mouse move handler with throttling
	let lastMouseMoveTime = 0;
	function handleMouseMove(event: MouseEvent) {
		try {
			if (!value.trim()) return;

			// Throttle mouse move events to every 50ms
			const now = Date.now();
			if (now - lastMouseMoveTime < 50) return;
			lastMouseMoveTime = now;

			const textarea = event.currentTarget as HTMLTextAreaElement;

			// Use textarea properties to calculate approximate character position
			const rect = textarea.getBoundingClientRect();
			const x = event.clientX - rect.left - 16; // Account for padding
			const y = event.clientY - rect.top - 12; // Account for padding

			// Early return if coordinates are negative
			if (x < 0 || y < 0) return;

			// Estimate character position based on font metrics
			const lineHeight = 24; // Approximate line height
			const charWidth = 8; // Approximate character width
			const lineNumber = Math.floor(y / lineHeight);
			const charInLine = Math.max(0, Math.floor(x / charWidth));

			// Calculate approximate text position
			const lines = value.split('\n');
			let charPosition = 0;

			// Ensure lineNumber is within bounds
			const clampedLineNumber = Math.max(0, Math.min(lineNumber, lines.length - 1));

			for (let i = 0; i < clampedLineNumber && i < lines.length; i++) {
				charPosition += lines[i].length + 1; // +1 for newline
			}

			if (clampedLineNumber < lines.length && lines[clampedLineNumber] !== undefined) {
				charPosition += Math.min(charInLine, lines[clampedLineNumber].length);
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
			if (hoveredSegment?.isFormatted && hoveredSegment.text.startsWith('@')) {
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
		} catch (error) {
			debugConsole.warn('Error in handleMouseMove:', error);
			// Clear any pending hover state on error
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
				hoverTimeout = null;
			}
			hoveredTool = null;
		}
	}

	function isToolEnabled(toolName: string): boolean {
		try {
			const enabledTools = toolRegistry.getEnabledTools();
			return !!enabledTools[toolName];
		} catch (error) {
			debugConsole.warn('Error checking tool enabled status:', error);
			return false;
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

	// Cleanup timeouts on component destruction
	$effect(() => {
		return () => {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
			}
			if (parseTimeout) {
				clearTimeout(parseTimeout);
			}
		};
	});
</script>

<div class="relative {className}">
	{#if value.trim() && segments.length > 0}
		<!-- Formatted overlay - always visible when there's text -->
		<div
			class="pointer-events-none absolute inset-0 z-10 px-4 py-3 break-words whitespace-pre-wrap"
			style="font-family: inherit; font-size: inherit; line-height: inherit; overflow: hidden;"
		>
			{#each segments as segment, index (`${index}-${segment.text.slice(0, 10)}`)}
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
		class="relative z-30 w-full resize-none overflow-hidden px-4 py-3 placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder-gray-400 {value.trim() &&
		segments.length > 0
			? 'text-transparent caret-gray-900 dark:caret-gray-100'
			: 'text-gray-900 dark:text-gray-100'}"
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
		onmousemove={handleMouseMove}
		onscroll={updateViewport}
	></textarea>

	<!-- Tooltip -->
	{#if hoveredTool}
		{@const isEnabled = isToolEnabled(hoveredTool.name)}
		<div
			class="pointer-events-none fixed z-50 max-w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800"
			style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; transform: translateX(-50%) translateY(-100%);"
		>
			<div class="mb-2 flex items-center gap-2">
				<span class="text-sm">{getCategoryIcon(hoveredTool.category || 'general')}</span>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
							@{hoveredTool.name}
						</div>
						{#if !isEnabled}
							<span
								class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-300"
							>
								Disabled
							</span>
						{/if}
					</div>
					<div class="text-xs text-gray-500 capitalize dark:text-gray-400">
						{hoveredTool.category || 'general'}
					</div>
				</div>
			</div>
			<div class="mb-2 text-sm text-gray-700 dark:text-gray-300">
				{hoveredTool.description}
			</div>
			{#if !isEnabled}
				<div class="mb-2 text-xs text-amber-600 dark:text-amber-400">
					💡 This tool is disabled but will be temporarily enabled when used.
				</div>
			{/if}
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
