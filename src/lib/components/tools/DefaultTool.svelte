<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';
	import ToolResultCard from '../ToolResultCard.svelte';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let data = $derived(toolInvocation.result?.data || toolInvocation.result);
	
	// Format the display data for better visibility
	let displayData = $derived(() => {
		if (data === null || data === undefined) {
			return 'No result data';
		}
		
		if (typeof data === 'string') {
			return data;
		}
		
		if (typeof data === 'object') {
			try {
				return JSON.stringify(data, null, 2);
			} catch (error) {
				return `Error formatting data: ${error}`;
			}
		}
		
		return String(data);
	});
</script>

<ToolResultCard
	{toolInvocation}
	{onTechnicalView}
	title="Tool: {toolInvocation.toolName}"
	emoji="🔧"
>
	<div class="space-y-2">
		{#if toolInvocation.args && Object.keys(toolInvocation.args).length > 0}
			<div>
				<h5 class="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</h5>
				<pre class="overflow-x-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-900"><code>{JSON.stringify(toolInvocation.args, null, 2)}</code></pre>
			</div>
		{/if}
		
		<div>
			<h5 class="font-medium text-gray-700 dark:text-gray-300 mb-1">Output:</h5>
			<pre class="overflow-x-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-900"><code>{displayData()}</code></pre>
		</div>
	</div>
</ToolResultCard>
