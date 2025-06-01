<script lang="ts">
	import {
		parseFormattedText,
		getFormattedTextClasses,
		invalidateToolCache,
		type FormatRule
	} from '$lib/utils/text-formatter';
	import { onMount } from 'svelte';

	interface Props {
		text: string;
		rules?: FormatRule[];
		class?: string;
	}

	let { text, rules, class: className = '' }: Props = $props();

	// Invalidate cache on mount to ensure fresh tool data
	onMount(() => {
		invalidateToolCache();
	});

	const segments = $derived(() => parseFormattedText(text, rules));
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
