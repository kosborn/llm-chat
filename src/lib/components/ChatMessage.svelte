<script lang="ts">
	import type { ChatMessage } from '../../app.d.ts';

	import { onMount } from 'svelte';
	import ToolRenderer from './ToolRenderer.svelte';
	import MetadataDisplay from './MetadataDisplay.svelte';
	import EnhancedText from './EnhancedText.svelte';
	import TechnicalModal from './TechnicalModal.svelte';
	import {
		countTokens,
		formatTokenCount,
		getTokenCountColor
	} from '$lib/utils/simple-token-counter';
	import { getProviderDisplayName } from '$lib/utils/cost-calculator.js';
	import { extractToolMentions } from '$lib/utils/text-formatter.js';

	interface Props {
		message: ChatMessage;
		isStreaming?: boolean;
	}

	let { message, isStreaming = false }: Props = $props();

	let messageElement: HTMLDivElement;
	let showMetadata = $state(false);
	let showTechnicalModal = $state(false);
	let selectedToolInvocation = $state<ToolInvocation | null>(null);

	// Token counting
	const tokenCount = $derived(() => (message.content ? countTokens(message.content) : 0));

	// Tool mention analysis
	const mentionedTools = $derived(() =>
		message.content ? extractToolMentions(message.content) : []
	);
	const hasToolMentions = $derived(() => mentionedTools().length > 0);
	const hasToolInvocations = $derived(
		() => message.toolInvocations && message.toolInvocations.length > 0
	);

	onMount(() => {
		// Auto-scroll to bottom when new messages arrive
		if (messageElement) {
			messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
		}
	});

	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function openTechnicalModal(toolInvocation: ToolInvocation) {
		selectedToolInvocation = toolInvocation;
		showTechnicalModal = true;
	}

	function closeTechnicalModal() {
		showTechnicalModal = false;
		selectedToolInvocation = null;
	}

	import { providerStore } from '$lib/stores/provider-store.svelte.js';

	function getProviderIcon(provider?: string): string {
		if (!provider) return '💬';

		const providerConfig = providerStore.getProvider(provider as import('$lib/providers').ProviderId);
		return providerConfig?.icon || '🤖';
	}

	function getProviderName(message: ChatMessage): string {
		if (message.role === 'user') return 'You';
		return message.apiMetadata?.provider
			? getProviderDisplayName(message.apiMetadata.provider)
			: 'Assistant';
	}
</script>

<div
	bind:this={messageElement}
	class="flex gap-3 p-4 {message.role === 'user'
		? 'bg-blue-50 dark:bg-blue-900/20'
		: 'bg-gray-50 dark:bg-gray-800/50'} mb-4 rounded-lg"
>
	<!-- Avatar -->
	<div class="flex-shrink-0">
		<div
			class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
			{message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}"
		>
			{message.role === 'user' ? '👤' : getProviderIcon(message.apiMetadata?.provider)}
		</div>
	</div>

	<!-- Message content -->
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-center gap-2">
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
				{getProviderName(message)}
			</span>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{formatTimestamp(message.timestamp)}
			</span>
			{#if message.content && tokenCount() > 0}
				<span class="font-mono text-xs {getTokenCountColor(tokenCount())}">
					{formatTokenCount(tokenCount())}
				</span>
			{/if}
			{#if isStreaming}
				<span class="text-xs text-blue-500 dark:text-blue-400">
					<span class="inline-block animate-pulse">●</span> typing...
				</span>
			{/if}
			{#if hasToolMentions() && message.role === 'user'}
				<span class="text-xs text-amber-600 dark:text-amber-400" title="Tool mentions detected">
					🔧 {mentionedTools().length}
				</span>
			{/if}
			{#if hasToolInvocations() && message.role === 'assistant'}
				<span class="text-xs text-green-600 dark:text-green-400" title="Tools executed">
					⚡ {message.toolInvocations?.length}
				</span>
			{/if}
			{#if message.apiMetadata && message.role === 'assistant'}
				<button
					onclick={() => (showMetadata = !showMetadata)}
					class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					title="Show API metadata"
					aria-label="Toggle API metadata"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Message text content -->
		{#if message.content}
			<div class="prose prose-sm dark:prose-invert markdown-content max-w-none">
				<EnhancedText text={message.content} enableFormatting={true} enableMarkdown={true} />
			</div>
		{/if}

		<!-- Tool invocations -->
		{#if message.toolInvocations && message.toolInvocations.length > 0}
			<div class="mt-3 space-y-2">
				{#each message.toolInvocations as toolInvocation (toolInvocation.toolCallId)}
					<div class="tool-result">
						<ToolRenderer
							{toolInvocation}
							onTechnicalView={() => openTechnicalModal(toolInvocation)}
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- API Metadata -->
		{#if message.apiMetadata && message.role === 'assistant'}
			<div class="mt-3">
				<MetadataDisplay metadata={message.apiMetadata} isVisible={showMetadata} compact={true} />
			</div>
		{/if}
	</div>
</div>

<!-- Technical Modal -->
{#if selectedToolInvocation}
	<TechnicalModal
		toolInvocation={selectedToolInvocation}
		isOpen={showTechnicalModal}
		onClose={closeTechnicalModal}
	/>
{/if}

<style>
	:global(.prose p:last-child) {
		margin-bottom: 0;
	}

	:global(.prose pre) {
		margin: 0.5rem 0;
	}

	:global(.tool-result a) {
		word-break: break-all;
	}

	/* Prism.js syntax highlighting styles */
	:global(.markdown-content .token.comment),
	:global(.markdown-content .token.prolog),
	:global(.markdown-content .token.doctype),
	:global(.markdown-content .token.cdata) {
		color: #6a737d;
	}

	:global(.markdown-content .token.punctuation) {
		color: #586069;
	}

	:global(.markdown-content .token.property),
	:global(.markdown-content .token.tag),
	:global(.markdown-content .token.boolean),
	:global(.markdown-content .token.number),
	:global(.markdown-content .token.constant),
	:global(.markdown-content .token.symbol),
	:global(.markdown-content .token.deleted) {
		color: #d73a49;
	}

	:global(.markdown-content .token.selector),
	:global(.markdown-content .token.attr-name),
	:global(.markdown-content .token.string),
	:global(.markdown-content .token.char),
	:global(.markdown-content .token.builtin),
	:global(.markdown-content .token.inserted) {
		color: #22863a;
	}

	:global(.markdown-content .token.operator),
	:global(.markdown-content .token.entity),
	:global(.markdown-content .token.url),
	:global(.markdown-content .language-css .token.string),
	:global(.markdown-content .style .token.string) {
		color: #e36209;
	}

	:global(.markdown-content .token.atrule),
	:global(.markdown-content .token.attr-value),
	:global(.markdown-content .token.keyword) {
		color: #6f42c1;
	}

	:global(.markdown-content .token.function),
	:global(.markdown-content .token.class-name) {
		color: #005cc5;
	}

	:global(.markdown-content .token.regex),
	:global(.markdown-content .token.important),
	:global(.markdown-content .token.variable) {
		color: #e36209;
	}

	/* Dark theme syntax highlighting */
	:global(.dark .markdown-content .token.comment),
	:global(.dark .markdown-content .token.prolog),
	:global(.dark .markdown-content .token.doctype),
	:global(.dark .markdown-content .token.cdata) {
		color: #8b949e;
	}

	:global(.dark .markdown-content .token.punctuation) {
		color: #7d8590;
	}

	:global(.dark .markdown-content .token.property),
	:global(.dark .markdown-content .token.tag),
	:global(.dark .markdown-content .token.boolean),
	:global(.dark .markdown-content .token.number),
	:global(.dark .markdown-content .token.constant),
	:global(.dark .markdown-content .token.symbol),
	:global(.dark .markdown-content .token.deleted) {
		color: #ff7b72;
	}

	:global(.dark .markdown-content .token.selector),
	:global(.dark .markdown-content .token.attr-name),
	:global(.dark .markdown-content .token.string),
	:global(.dark .markdown-content .token.char),
	:global(.dark .markdown-content .token.builtin),
	:global(.dark .markdown-content .token.inserted) {
		color: #7ee787;
	}

	:global(.dark .markdown-content .token.operator),
	:global(.dark .markdown-content .token.entity),
	:global(.dark .markdown-content .token.url),
	:global(.dark .markdown-content .language-css .token.string),
	:global(.dark .markdown-content .style .token.string) {
		color: #ffa657;
	}

	:global(.dark .markdown-content .token.atrule),
	:global(.dark .markdown-content .token.attr-value),
	:global(.dark .markdown-content .token.keyword) {
		color: #d2a8ff;
	}

	:global(.dark .markdown-content .token.function),
	:global(.dark .markdown-content .token.class-name) {
		color: #79c0ff;
	}

	:global(.dark .markdown-content .token.regex),
	:global(.dark .markdown-content .token.important),
	:global(.dark .markdown-content .token.variable) {
		color: #ffa657;
	}

	/* Code block styling improvements */
	:global(.markdown-content .code-block-wrapper) {
		font-family:
			'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
	}

	:global(.markdown-content pre) {
		font-size: 14px;
		line-height: 1.5;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
	}

	:global(.markdown-content pre::-webkit-scrollbar) {
		height: 8px;
	}

	:global(.markdown-content pre::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.markdown-content pre::-webkit-scrollbar-thumb) {
		background-color: rgba(155, 155, 155, 0.5);
		border-radius: 20px;
	}

	:global(.markdown-content pre::-webkit-scrollbar-thumb:hover) {
		background-color: rgba(155, 155, 155, 0.7);
	}
</style>
