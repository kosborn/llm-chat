<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';

	interface Props {
		text: string;
		class?: string;
		enableMarkdown?: boolean;
	}

	let {
		text,
		class: className = '',
		enableMarkdown = true
	}: Props = $props();

	// Simple text processing - just apply markdown if enabled
	const processedText = $derived(() => {
		if (!text) return '';
		
		if (enableMarkdown) {
			try {
				return renderMarkdown(text);
			} catch (error) {
				console.error('Error rendering markdown:', error);
				return text.replace(/\n/g, '<br>');
			}
		}
		
		return text.replace(/\n/g, '<br>');
	});
</script>

<div class="whitespace-pre-wrap break-words {className}">
	{#if enableMarkdown}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html processedText()}
	{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html processedText()}
	{/if}
</div>
