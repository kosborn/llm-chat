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
{:else if data.error}
	<ToolResultCard
		{toolInvocation}
		{onTechnicalView}
		title="Calculation Error"
		emoji="❌"
		variant="red"
	>
		<div class="text-sm">
			<div>
				Expression: <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800"
					>{data.expression}</code
				>
			</div>
			<div class="mt-1 text-red-600 dark:text-red-400">Error: {data.error}</div>
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
		<div class="text-sm">
			<div>
				Expression: <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800"
					>{data.expression}</code
				>
			</div>
			<div class="mt-2 text-lg font-bold text-green-700 dark:text-green-300">= {data.result}</div>
		</div>
	</ToolResultCard>
{/if}
