<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';
	import ToolResultCard from '../ToolResultCard.svelte';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let data = $derived(toolInvocation.result?.data || toolInvocation.result);
</script>

<ToolResultCard
	{toolInvocation}
	{onTechnicalView}
	title="URL {data.action === 'shorten' ? 'Shortened' : 'Expanded'}"
	emoji="🔗"
	variant="indigo"
>
	<div class="space-y-1 text-sm">
		{#if data.action === 'shorten'}
			<div>
				Original: <a
					href={data.originalUrl}
					target="_blank"
					class="break-all text-blue-600 hover:underline dark:text-blue-400">{data.originalUrl}</a
				>
			</div>
			<div>
				Short URL: <a
					href={data.shortUrl}
					target="_blank"
					class="text-blue-600 hover:underline dark:text-blue-400">{data.shortUrl}</a
				>
			</div>
		{:else}
			<div>
				Short URL: <a
					href={data.shortUrl}
					target="_blank"
					class="text-blue-600 hover:underline dark:text-blue-400">{data.shortUrl}</a
				>
			</div>
			<div>
				Original: <a
					href={data.originalUrl}
					target="_blank"
					class="break-all text-blue-600 hover:underline dark:text-blue-400">{data.originalUrl}</a
				>
			</div>
		{/if}
	</div>
</ToolResultCard>
