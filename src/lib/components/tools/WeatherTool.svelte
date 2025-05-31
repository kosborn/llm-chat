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
		class="my-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-2xl">🌤️</span>
			<h4 class="font-semibold text-blue-800 dark:text-blue-200">Weather for {data.location}</h4>
		</div>
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div>
				🌡️ Temperature: <strong>{data.temperature}°{data.unit === 'celsius' ? 'C' : 'F'}</strong>
			</div>
			<div>☁️ Conditions: <strong>{data.conditions}</strong></div>
			<div>💧 Humidity: <strong>{data.humidity}%</strong></div>
			<div>🕐 Updated: <strong>{new Date(data.timestamp).toLocaleTimeString()}</strong></div>
		</div>
	</div>
{/if}
