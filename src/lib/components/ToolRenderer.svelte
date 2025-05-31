<script lang="ts">
	import type { ToolInvocation } from '../../app.d.ts';
	import { getToolComponent } from '$lib/utils/toolRenderer.js';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let ToolComponent = $derived(getToolComponent(toolInvocation));
</script>

<ToolComponent {toolInvocation} {onTechnicalView} />
