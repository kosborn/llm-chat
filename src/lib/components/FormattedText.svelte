<script lang="ts">
	import {
		parseFormattedText,
		getFormattedTextClasses,
		type FormatRule
	} from '$lib/utils/text-formatter-manager';

	interface Props {
		text: string;
		rules?: FormatRule[];
		class?: string;
	}

	let { text, rules, class: className = '' }: Props = $props();

	// Use cached parsing - no need to invalidate cache here as it's managed globally
	const segments = $derived(() => {
		// Skip parsing for empty text
		if (!text || !text.trim()) {
			return [{ text: text || '', isFormatted: false }];
		}
		return parseFormattedText(text, rules);
	});
</script>

<div class="{getFormattedTextClasses()} {className}">
	{#each segments as segment, index (index)}
		{#if segment.isFormatted && segment.className}
			<span class={segment.className}>{segment.text}</span>
		{:else}
			{segment.text}
		{/if}
	{/each}
</div>
