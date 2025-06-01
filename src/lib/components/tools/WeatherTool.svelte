<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';
	import ToolResultCard from '../ToolResultCard.svelte';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let data = $derived(
		toolInvocation.result?.data?.data || toolInvocation.result?.data || toolInvocation.result
	);
</script>

<ToolResultCard
	{toolInvocation}
	{onTechnicalView}
	title="Weather for {data.location}"
	emoji="🌤️"
	variant="blue"
>
	<div class="grid grid-cols-2 gap-2 text-sm">
		<div>
			🌡️ Temperature: <strong>{data.temperature}°{data.unit === 'celsius' ? 'C' : 'F'}</strong>
		</div>
		<div>☁️ Conditions: <strong>{data.conditions}</strong></div>
		<div>💧 Humidity: <strong>{data.humidity}%</strong></div>
		<div>🕐 Updated: <strong>{new Date(data.timestamp).toLocaleTimeString()}</strong></div>
	</div>
</ToolResultCard>
