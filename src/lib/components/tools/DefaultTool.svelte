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
		class="my-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-2xl">🔧</span>
			<h4 class="font-semibold text-gray-800 dark:text-gray-200">
				Tool: {toolInvocation.toolName}
			</h4>
		</div>
		<pre class="overflow-x-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-900"><code
				>{JSON.stringify(data, null, 2)}</code
			></pre>
	</div>
{/if}
