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
		class="my-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-700 dark:bg-indigo-900/30"
	>
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-2xl">🔗</span>
				<h4 class="font-semibold text-indigo-800 dark:text-indigo-200">
					URL {data.action === 'shorten' ? 'Shortened' : 'Expanded'}
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
		<div class="space-y-1 text-sm">
			{#if data.action === 'shorten'}
				<div>
					Original: <a
						href={data.originalUrl}
						target="_blank"
						class="break-all text-blue-600 hover:underline dark:text-blue-400">{data.originalUrl}</a
					>
				</div>
				<div>
					Short URL: <a
						href={data.shortUrl}
						target="_blank"
						class="text-blue-600 hover:underline dark:text-blue-400">{data.shortUrl}</a
					>
				</div>
			{:else}
				<div>
					Short URL: <a
						href={data.shortUrl}
						target="_blank"
						class="text-blue-600 hover:underline dark:text-blue-400">{data.shortUrl}</a
					>
				</div>
				<div>
					Original: <a
						href={data.originalUrl}
						target="_blank"
						class="break-all text-blue-600 hover:underline dark:text-blue-400">{data.originalUrl}</a
					>
				</div>
			{/if}
		</div>
	</div>
{/if}
