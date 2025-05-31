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
	title="Current Time"
	emoji="🕐"
	variant="purple"
>
	<div class="text-sm">
		<div>📍 Timezone: <strong>{data.timezone}</strong></div>
		<div>🕐 Time: <strong>{data.formattedTime}</strong></div>
		<div>
			⏱️ Unix: <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800"
				>{data.unixTimestamp}</code
			>
		</div>
	</div>
</ToolResultCard>
