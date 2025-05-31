<script lang="ts">
	import {
		parseFormattedText,
		getFormattedTextClasses,
		type FormatRule
	} from '$lib/utils/text-formatter';

	interface Props {
		text: string;
		rules?: FormatRule[];
		class?: string;
	}

	let { text, rules, class: className = '' }: Props = $props();

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
