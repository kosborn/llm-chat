<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';

	interface Props {
		toolInvocation: ToolInvocation;
	}

	let { toolInvocation }: Props = $props();

	let data = $derived(toolInvocation.result?.data || toolInvocation.result);
</script>

{#if toolInvocation.state !== 'result'}
	<div class="text-amber-600 italic dark:text-amber-400">
		⏳ Running {toolInvocation.toolName}...
	</div>
{:else}
	<div
		class="my-2 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-2xl">🎲</span>
			<h4 class="font-semibold text-orange-800 dark:text-orange-200">
				Random {data.type === 'number' ? 'Number' : 'Choice'}
			</h4>
		</div>
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
	</div>
{/if}
