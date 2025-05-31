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

	function getProviderIcon(provider?: string): string {
		switch (provider) {
			case 'groq':
				return '🚀';
			case 'anthropic':
				return '🎭';
			case 'openai':
				return '🤖';
			default:
				return '🤖';
		}
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
			<div class="prose prose-sm dark:prose-invert max-w-none">
				<EnhancedText text={message.content} enableFormatting={true} enableMarkdown={false} />
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
</style>
