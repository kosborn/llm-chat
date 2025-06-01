<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';
	import ToolResultCard from '../ToolResultCard.svelte';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let data = $derived(
		toolInvocation.result?.data?.data || toolInvocation.result?.data || toolInvocation.result
	);
</script>

<ToolResultCard
	{toolInvocation}
	{onTechnicalView}
	title="Random {data.type === 'number' ? 'Number' : 'Choice'}"
	emoji="🎲"
	variant="orange"
>
	<div class="text-sm">
		{#if data.type === 'number'}
			<div>Range: <strong>{data.range.min} - {data.range.max}</strong></div>
			<div class="mt-2 text-lg font-bold text-orange-700 dark:text-orange-300">
				Result: {data.result}
			</div>
		{:else}
			<div>Choices: <em>{data.choices?.join(', ')}</em></div>
			<div class="mt-2 text-lg font-bold text-orange-700 dark:text-orange-300">
				Selected: {data.result}
			</div>
		{/if}
	</div>
</ToolResultCard>
