<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';

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
{:else}
	<div
		class="my-2 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/30"
	>
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-2xl">🕐</span>
				<h4 class="font-semibold text-purple-800 dark:text-purple-200">Current Time</h4>
			</div>
			{#if onTechnicalView}
				<button
					onclick={onTechnicalView}
					class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					title="View technical details"
					aria-label="View technical details for {toolInvocation.toolName}"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				</button>
			{/if}
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
