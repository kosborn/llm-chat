<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';
	import { parseFormattedText, type FormatSegment } from '$lib/utils/text-formatter.js';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';

	interface Props {
		text: string;
		class?: string;
		enableMarkdown?: boolean;
		enableFormatting?: boolean;
	}

	const {
		text,
		class: className = '',
		enableMarkdown = true,
		enableFormatting = true
	}: Props = $props();

	let toolTooltip = $state<{ x: number; y: number; tool: ToolMetadata } | null>(null);
	let markdownHtml = $state<string>('');
	let isLoadingMarkdown = $state<boolean>(false);
	let copiedIp = $state<string | null>(null);

	// Process text with both markdown and formatting
	const processedContent = $derived(() => {
		if (!text) return { html: '', segments: [] };

		// If only markdown is enabled, use markdown (handled separately due to async)
		if (enableMarkdown && !enableFormatting) {
			return { html: markdownHtml, segments: [] };
		}

		// If formatting is enabled, use text formatter (with or without markdown)
		if (enableFormatting) {
			const segments = parseFormattedText(text);
			return { html: '', segments };
		}

		// Default: plain text with line breaks
		return { html: text.replace(/\n/g, '<br>'), segments: [] };
	});

	// Handle async markdown rendering
	async function updateMarkdown() {
		if (enableMarkdown && !enableFormatting && text) {
			isLoadingMarkdown = true;
			try {
				markdownHtml = await renderMarkdown(text);
			} catch (error) {
				console.error('Error rendering markdown:', error);
				markdownHtml = text.replace(/\n/g, '<br>');
			} finally {
				isLoadingMarkdown = false;
			}
		}
	}

	$effect(() => {
		if (enableMarkdown && !enableFormatting) {
			updateMarkdown();
		}
	});

	function handleToolHover(event: MouseEvent, toolName: string) {
		const toolMetadata = toolRegistry.getToolByName(toolName);
		if (toolMetadata) {
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			toolTooltip = {
				x: rect.left + rect.width / 2,
				y: rect.top - 10,
				tool: toolMetadata
			};
		}
	}

	function handleToolLeave() {
		toolTooltip = null;
	}

	function isToolMention(segment: FormatSegment): string | null {
		if (segment.isFormatted && segment.text.startsWith('@')) {
			return segment.text.slice(1);
		}
		return null;
	}

	function isUrl(segment: FormatSegment): boolean {
		return (
			segment.isFormatted &&
			(segment.text.startsWith('http://') || segment.text.startsWith('https://'))
		);
	}

	function isIpAddress(segment: FormatSegment): boolean {
		if (!segment.isFormatted) return false;
		// Check if it matches IPv4 pattern
		const ipv4Pattern =
			/^\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b$/;
		// Check if it matches IPv6 pattern
		const ipv6Pattern =
			/^\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b|\b::1\b|\b::\b$/;
		return ipv4Pattern.test(segment.text) || ipv6Pattern.test(segment.text);
	}

	async function copyIpToClipboard(ip: string) {
		console.log('Attempting to copy IP:', ip);
		console.log('Clipboard API available:', !!navigator.clipboard);
		console.log('Secure context:', window.isSecureContext);

		try {
			// Try modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				console.log('Using modern clipboard API');
				await navigator.clipboard.writeText(ip);
				console.log('Modern clipboard API succeeded');
			} else {
				console.log('Using fallback clipboard method');
				// Fallback for older browsers or non-secure contexts
				const textArea = document.createElement('textarea');
				textArea.value = ip;
				textArea.style.position = 'fixed';
				textArea.style.left = '-999999px';
				textArea.style.top = '-999999px';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				const success = document.execCommand('copy');
				document.body.removeChild(textArea);
				console.log('Fallback clipboard method result:', success);
			}

			copiedIp = ip;
			console.log('Copy successful, setting animation');
			// Clear the animation after 1 second
			setTimeout(() => {
				copiedIp = null;
				console.log('Animation cleared');
			}, 1000);
		} catch (error) {
			console.error('Failed to copy IP to clipboard:', error);
			// Try fallback method even if modern API failed
			try {
				console.log('Attempting fallback after error');
				const textArea = document.createElement('textarea');
				textArea.value = ip;
				textArea.style.position = 'fixed';
				textArea.style.left = '-999999px';
				textArea.style.top = '-999999px';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				const success = document.execCommand('copy');
				document.body.removeChild(textArea);
				console.log('Fallback after error result:', success);

				if (success) {
					copiedIp = ip;
					setTimeout(() => {
						copiedIp = null;
					}, 1000);
				}
			} catch (fallbackError) {
				console.error('All clipboard methods failed:', fallbackError);
			}
		}
	}
</script>

<div class="relative break-words whitespace-pre-wrap {className}">
	{#if isLoadingMarkdown}
		<!-- Loading state for markdown -->
		<div class="animate-pulse">
			<div class="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
			<div class="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
		</div>
	{:else if processedContent().html}
		<!-- Markdown or plain HTML content -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html processedContent().html}
	{:else if processedContent().segments.length > 0}
		<!-- Formatted text segments -->
		{#each processedContent().segments as segment, index (index)}
			{@const toolName = isToolMention(segment)}
			{@const isUrlSegment = isUrl(segment)}
			{@const isIpSegment = isIpAddress(segment)}

			{#if toolName}
				<!-- Tool mention with hover -->
				<span
					class="{segment.className} cursor-help border-b border-dotted border-current"
					onmouseenter={(e) => handleToolHover(e, toolName)}
					onmouseleave={handleToolLeave}
					role="button"
					tabindex="0"
					title="Tool: {toolName}"
				>
					{segment.text}
				</span>
			{:else if isUrlSegment}
				<!-- URL link -->
				<a href={segment.text} class={segment.className} target="_blank" rel="noopener noreferrer">
					{segment.text}
				</a>
			{:else if isIpSegment}
				<!-- IP address with copy functionality -->
				<span
					class="{segment.className} {copiedIp === segment.text
						? 'animate-pulse bg-green-200/50 dark:bg-green-800/50'
						: ''} select-none"
					onclick={() => copyIpToClipboard(segment.text)}
					role="button"
					tabindex="0"
					title="Click to copy IP address ({segment.text.includes(':') ? 'IPv6' : 'IPv4'})"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							copyIpToClipboard(segment.text);
						}
					}}
				>
					{segment.text}
				</span>
			{:else if segment.isFormatted}
				<!-- Other formatted text -->
				<span class={segment.className}>
					{segment.text}
				</span>
			{:else}
				<!-- Plain text -->
				{segment.text}
			{/if}
		{/each}
	{:else}
		<!-- Fallback plain text -->
		{text}
	{/if}
</div>

<!-- Tool tooltip -->
{#if toolTooltip}
	<div
		class="pointer-events-none fixed z-50 max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-white shadow-lg dark:bg-gray-800"
		style="left: {toolTooltip.x}px; top: {toolTooltip.y}px; transform: translateX(-50%) translateY(-100%);"
	>
		<div class="mb-1 font-semibold text-blue-300">@{toolTooltip.tool.name}</div>
		<div class="mb-2 text-gray-300">{toolTooltip.tool.description}</div>

		{#if toolTooltip.tool.category}
			<div class="mb-1 text-xs text-gray-400">
				Category: <span class="text-purple-400">{toolTooltip.tool.category}</span>
			</div>
		{/if}

		{#if toolTooltip.tool.tags && toolTooltip.tool.tags.length > 0}
			<div class="text-xs text-gray-400">
				Tags: {toolTooltip.tool.tags.join(', ')}
			</div>
		{/if}

		<!-- Tooltip arrow -->
		<div
			class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-t-gray-900 border-r-transparent border-l-transparent dark:border-t-gray-800"
		></div>
	</div>
{/if}

<style>
	:global(.prose p:last-child) {
		margin-bottom: 0;
	}

	:global(.prose pre) {
		margin: 0.5rem 0;
	}
</style>
