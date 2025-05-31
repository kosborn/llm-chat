<script lang="ts">
	import type { ToolMetadata } from '$lib/tools/types.js';

	interface Props {
		tool: ToolMetadata;
		onToggle: () => void;
		onViewDetails: () => void;
	}

	const { tool, onToggle, onViewDetails }: Props = $props();

	function getCategoryColor(category?: string) {
		switch (category) {
			case 'utility':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'data':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'communication':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'entertainment':
				return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
		}
	}

	function getStatusColor(enabled: boolean) {
		return enabled
			? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	}
</script>

<div
	class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
>
	<!-- Header -->
	<div class="mb-4 flex items-start justify-between">
		<div class="flex-1">
			<h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
				{tool.name}
			</h3>
			<div class="mb-2 flex items-center gap-2">
				{#if tool.category}
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getCategoryColor(
							tool.category
						)}"
					>
						{tool.category}
					</span>
				{/if}
				<span
					class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getStatusColor(
						tool.enabled !== false
					)}"
				>
					{tool.enabled !== false ? 'Enabled' : 'Disabled'}
				</span>
			</div>
		</div>

		<!-- Toggle Switch -->
		<label class="relative inline-flex cursor-pointer items-center">
			<input
				type="checkbox"
				checked={tool.enabled !== false}
				onchange={onToggle}
				class="peer sr-only"
			/>
			<div
				class="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
			></div>
		</label>
	</div>

	<!-- Description -->
	<p class="mb-4 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
		{tool.description}
	</p>

	<!-- Tags -->
	{#if tool.tags && tool.tags.length > 0}
		<div class="mb-4 flex flex-wrap gap-1">
			{#each tool.tags.slice(0, 3) as tag (tag)}
				<span
					class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
				>
					{tag}
				</span>
			{/each}
			{#if tool.tags.length > 3}
				<span
					class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
				>
					+{tool.tags.length - 3} more
				</span>
			{/if}
		</div>
	{/if}

	<!-- Footer -->
	<div class="flex items-center justify-between">
		<div class="text-xs text-gray-500 dark:text-gray-400">
			{#if tool.version}
				<span>v{tool.version}</span>
			{/if}
			{#if tool.author}
				<span class="ml-2">by {tool.author}</span>
			{/if}
		</div>

		<button
			onclick={onViewDetails}
			class="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
		>
			View Details
			<svg class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
