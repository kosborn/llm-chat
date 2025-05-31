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

{#if toolInvocation.state !== 'result'}
	<div class="text-amber-600 italic dark:text-amber-400">
		⏳ Running {toolInvocation.toolName}...
	</div>
{:else if data?.error}
	<ToolResultCard
		{toolInvocation}
		{onTechnicalView}
		title="Calculation Error"
		emoji="❌"
		variant="red"
	>
		<div class="space-y-2 text-sm">
			<div>
				<span class="font-medium text-gray-700 dark:text-gray-300">Input:</span>
				<code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800 ml-2"
					>{toolInvocation.args?.expression || 'Unknown expression'}</code
				>
			</div>
			<div class="text-red-600 dark:text-red-400">
				<span class="font-medium">Error:</span> {data.error}
			</div>
		</div>
	</ToolResultCard>
{:else}
	<ToolResultCard
		{toolInvocation}
		{onTechnicalView}
		title="Calculation Result"
		emoji="🧮"
		variant="green"
	>
		<div class="space-y-2 text-sm">
			<div>
				<span class="font-medium text-gray-700 dark:text-gray-300">Expression:</span>
				<code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800 ml-2"
					>{toolInvocation.args?.expression || data?.expression || 'Unknown'}</code
				>
			</div>
			<div class="text-lg font-bold text-green-700 dark:text-green-300">
				Result: {data?.result ?? 'No result'}
			</div>
		</div>
	</ToolResultCard>
{/if}
