<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';
	import { parseFormattedText, type FormatSegment } from '$lib/utils/text-formatter-manager.js';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';
	import { debugConsole } from '$lib/utils/console.js';

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
		if (!text) return { html: '', segments: [], useMarkdown: false };

		// If only markdown is enabled, use markdown (handled separately due to async)
		if (enableMarkdown && !enableFormatting) {
			return { html: markdownHtml, segments: [], useMarkdown: false };
		}

		// If formatting is enabled (with or without markdown), use text formatter
		if (enableFormatting) {
			const segments = parseFormattedText(text);
			return { html: '', segments, useMarkdown: enableMarkdown };
		}

		// Default: plain text with line breaks
		return { html: text.replace(/\n/g, '<br>'), segments: [], useMarkdown: false };
	});

	// Handle async markdown rendering
	async function updateMarkdown() {
		if (enableMarkdown && text) {
			isLoadingMarkdown = true;
			try {
				if (enableFormatting) {
					// Render markdown first, then post-process for special formatting
					let html = await renderMarkdown(text);
					debugConsole.log('Original text:', text);
					debugConsole.log('Rendered HTML before replacement:', html);

					// Find and replace special patterns in the rendered HTML
					const segments = parseFormattedText(text);
					debugConsole.log('Parsed segments:', segments);

					for (const segment of segments) {
						debugConsole.log('Processing segment:', segment);
						if (
							segment.isFormatted &&
							(isToolMention(segment) || isUrl(segment) || isIpAddress(segment))
						) {
							let replacement = '';

							if (isToolMention(segment)) {
								const toolName = segment.text.slice(1);
								const isEnabled = isToolEnabled(toolName);
								const statusTitle = isEnabled
									? `Tool: ${toolName}`
									: `Tool: ${toolName} (Disabled)`;
								replacement = `<span class="${segment.className} cursor-help border-b border-dotted border-current" data-tool="${toolName}" title="${statusTitle}">${segment.text}</span>`;
							} else if (isUrl(segment)) {
								replacement = `<a href="${segment.text}" class="${segment.className}" target="_blank" rel="noopener noreferrer">${segment.text}</a>`;
							} else if (isIpAddress(segment)) {
								replacement = `<span class="${segment.className} cursor-pointer" data-ip="${segment.text}" title="Click to copy IP address (${segment.text.includes(':') ? 'IPv6' : 'IPv4'})">${segment.text}</span>`;
							}

							debugConsole.log(`Replacing "${segment.text}" with:`, replacement);
							debugConsole.log('HTML before this replacement:', html);

							// Replace all occurrences of the segment text with formatted version
							html = html.split(segment.text).join(replacement);

							debugConsole.log('HTML after this replacement:', html);
						}
					}

					debugConsole.log('Final HTML:', html);
					markdownHtml = html;
				} else {
					// Plain markdown without formatting
					markdownHtml = await renderMarkdown(text);
				}
			} catch (error) {
				debugConsole.error('Error rendering markdown:', error);
				markdownHtml = text.replace(/\n/g, '<br>');
			} finally {
				isLoadingMarkdown = false;
			}
		}
	}

	$effect(() => {
		if (enableMarkdown) {
			updateMarkdown();
		}
	});

	// Handle clicks on markdown-rendered content with special formatting
	function handleMarkdownClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const ip = target.getAttribute('data-ip');
		if (ip) {
			event.preventDefault();
			copyIpToClipboard(ip);
		}
	}

	// Handle hover on markdown-rendered content with tool mentions
	function handleMarkdownHover(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const toolName = target.getAttribute('data-tool');
		if (toolName) {
			handleToolHover(event, toolName);
		}
	}

	function handleMarkdownLeave() {
		toolTooltip = null;
	}

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

	function isToolEnabled(toolName: string): boolean {
		try {
			const enabledTools = toolRegistry.getEnabledTools();
			return !!enabledTools[toolName];
		} catch (error) {
			debugConsole.warn('Error checking tool enabled status:', error);
			return false;
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
		debugConsole.log('Attempting to copy IP:', ip);
		debugConsole.log('Clipboard API available:', !!navigator.clipboard);
		debugConsole.log('Secure context:', window.isSecureContext);

		try {
			// Try modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				debugConsole.log('Using modern clipboard API');
				await navigator.clipboard.writeText(ip);
				debugConsole.log('Modern clipboard API succeeded');
			} else {
				debugConsole.log('Using fallback clipboard method');
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
				debugConsole.log('Fallback clipboard method result:', success);
			}

			copiedIp = ip;
			debugConsole.log('Copy successful, setting animation');
			// Clear the animation after 1 second
			setTimeout(() => {
				copiedIp = null;
				debugConsole.log('Animation cleared');
			}, 1000);
		} catch (error) {
			debugConsole.error('Failed to copy IP to clipboard:', error);
			// Try fallback method even if modern API failed
			try {
				debugConsole.log('Attempting fallback after error');
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
				debugConsole.log('Fallback after error result:', success);

				if (success) {
					copiedIp = ip;
					setTimeout(() => {
						copiedIp = null;
					}, 1000);
				}
			} catch (fallbackError) {
				debugConsole.error('All clipboard methods failed:', fallbackError);
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
	{:else if enableMarkdown && enableFormatting}
		<!-- Combined markdown and formatting -->
		<div
			role="presentation"
			onclick={handleMarkdownClick}
			onmouseenter={handleMarkdownHover}
			onmouseleave={handleMarkdownLeave}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					const target = e.target as HTMLElement;
					const ip = target.getAttribute('data-ip');
					if (ip) {
						e.preventDefault();
						copyIpToClipboard(ip);
					}
				}
			}}
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html markdownHtml}
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
			{@const toolEnabled = toolName ? isToolEnabled(toolName) : false}

			{#if toolName}
				<!-- Tool mention with hover -->
				<span
					class="{segment.className} cursor-help border-b border-dotted border-current"
					onmouseenter={(e) => handleToolHover(e, toolName)}
					onmouseleave={handleToolLeave}
					role="button"
					tabindex="0"
					title="Tool: {toolName}{toolEnabled ? '' : ' (Disabled)'}"
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
						: ''}"
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
	{@const toolEnabled = isToolEnabled(toolTooltip.tool.name)}
	<div
		class="pointer-events-none fixed z-50 max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-white shadow-lg dark:bg-gray-800"
		style="left: {toolTooltip.x}px; top: {toolTooltip.y}px; transform: translateX(-50%) translateY(-100%);"
	>
		<div class="mb-1 flex items-center gap-2">
			<div class="font-semibold text-blue-300">@{toolTooltip.tool.name}</div>
			{#if !toolEnabled}
				<span
					class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-300"
				>
					Disabled
				</span>
			{/if}
		</div>
		<div class="mb-2 text-gray-300">{toolTooltip.tool.description}</div>

		{#if !toolEnabled}
			<div class="mb-2 text-xs text-amber-400">
				💡 This tool is disabled but will be temporarily enabled when used.
			</div>
		{/if}

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
