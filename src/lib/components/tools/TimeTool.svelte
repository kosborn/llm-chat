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

<ToolResultCard {toolInvocation} {onTechnicalView} title="Current Time" emoji="🕐" variant="purple">
	<div class="space-y-2 text-sm">
		{#if toolInvocation.args && Object.keys(toolInvocation.args).length > 0}
			<div>
				<span class="font-medium text-gray-700 dark:text-gray-300">Input:</span>
				<code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800 ml-2"
					>{JSON.stringify(toolInvocation.args)}</code
				>
			</div>
		{/if}
		<div>
			<div>📍 Timezone: <strong>{data?.timezone || 'Unknown'}</strong></div>
			<div>🕐 Time: <strong>{data?.formattedTime || data?.time || 'Unknown'}</strong></div>
			<div>
				⏱️ Unix: <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800"
					>{data?.unixTimestamp || data?.timestamp || 'Unknown'}</code
				>
			</div>
		</div>
	</div>
</ToolResultCard>
