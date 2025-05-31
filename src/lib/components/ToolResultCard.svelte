<script lang="ts">
	import type { ToolInvocation } from '../../app.d.ts';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
		title: string;
		emoji?: string;
		variant?: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'indigo';
		children: any;
	}

	let { toolInvocation, onTechnicalView, title, emoji = '🔧', variant = 'default', children }: Props = $props();

	function getVariantClasses(variant: string) {
		switch (variant) {
			case 'blue':
				return 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30';
			case 'green':
				return 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/30';
			case 'red':
				return 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30';
			case 'purple':
				return 'border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/30';
			case 'orange':
				return 'border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/30';
			case 'indigo':
				return 'border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30';
			default:
				return 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800';
		}
	}

	function getTitleClasses(variant: string) {
		switch (variant) {
			case 'blue':
				return 'text-blue-800 dark:text-blue-200';
			case 'green':
				return 'text-green-800 dark:text-green-200';
			case 'red':
				return 'text-red-800 dark:text-red-200';
			case 'purple':
				return 'text-purple-800 dark:text-purple-200';
			case 'orange':
				return 'text-orange-800 dark:text-orange-200';
			case 'indigo':
				return 'text-indigo-800 dark:text-indigo-200';
			default:
				return 'text-gray-800 dark:text-gray-200';
		}
	}
</script>

{#if toolInvocation.state !== 'result'}
	<div class="text-amber-600 italic dark:text-amber-400">
		⏳ Running {toolInvocation.toolName}...
	</div>
{:else}
	<div class="my-2 rounded-lg border p-4 {getVariantClasses(variant)}">
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-2xl">{emoji}</span>
				<h4 class="font-semibold {getTitleClasses(variant)}">
					{title}
				</h4>
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
		{@render children()}
	</div>
{/if}