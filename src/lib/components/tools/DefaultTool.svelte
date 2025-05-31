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
	title="Tool: {toolInvocation.toolName}"
	emoji="🔧"
>
	<pre class="overflow-x-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-900"><code
			>{JSON.stringify(data, null, 2)}</code
		></pre>
</ToolResultCard>
