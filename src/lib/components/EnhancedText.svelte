<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';
	import {
		parseFormattedText,
		getFormattedTextClasses,
		type FormatRule,
		defaultFormatRules
	} from '$lib/utils/text-formatter';

	interface Props {
		text: string;
		rules?: FormatRule[];
		class?: string;
		enableMarkdown?: boolean;
	}

	let {
		text,
		rules = defaultFormatRules,
		class: className = '',
		enableMarkdown = true
	}: Props = $props();

	// Parse the text for custom formatting first, then apply markdown
	const segments = $derived(() => {
		if (!text) return [];

		try {
			// First, get custom formatting segments
			const customSegments = parseFormattedText(text, rules);
			
			if (!enableMarkdown) {
				return customSegments;
			}

			// Apply markdown to non-formatted segments
			return customSegments.map((segment) => {
				if (segment.isFormatted) {
					// Keep custom formatted segments as-is
					return segment;
				} else {
					// Apply markdown to unformatted text segments
					const markdownHtml = renderMarkdown(segment.text);
					return {
						...segment,
						text: markdownHtml,
						isMarkdown: true
					};
				}
			});
		} catch (error) {
			console.error('Error processing enhanced text:', error);
			// Fallback to just markdown rendering
			return [
				{
					text: renderMarkdown(text),
					isFormatted: false,
					isMarkdown: true
				}
			];
		}
	});
</script>

<div class="{getFormattedTextClasses()} {className}">
	{#each segments as segment, index (index)}
		{#if segment.isFormatted && segment.className}
			<span class={segment.className}>{segment.text}</span>
		{:else if segment.isMarkdown}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html segment.text}
		{:else}
			{segment.text}
		{/if}
	{/each}
</div>
