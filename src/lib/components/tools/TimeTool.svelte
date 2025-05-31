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
		class="my-2 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-2xl">🕐</span>
			<h4 class="font-semibold text-purple-800 dark:text-purple-200">Current Time</h4>
		</div>
		<div class="text-sm">
			<div>📍 Timezone: <strong>{data.timezone}</strong></div>
			<div>🕐 Time: <strong>{data.formattedTime}</strong></div>
			<div>
				⏱️ Unix: <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800"
					>{data.unixTimestamp}</code
				>
			</div>
		</div>
	</div>
{/if}
