<script lang="ts">
	import { onMount } from 'svelte';
	import {
		toolRegistry,
		enableToolPersistent,
		disableToolPersistent
	} from '$lib/tools/registry.js';
	import { toolSettingsStore } from '$lib/stores/tool-settings-store.svelte.js';
	import type { ToolMetadata } from '$lib/tools/types.js';
	import ToolCard from './ToolCard.svelte';
	import ToolDetail from './ToolDetail.svelte';

	let tools: ToolMetadata[] = $state([]);
	let filteredTools: ToolMetadata[] = $state([]);
	let selectedTool: ToolMetadata | null = $state(null);
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let selectedTag = $state('all');
	let showOnlyEnabled = $state(false);
	let categories: string[] = $state([]);
	let tags: string[] = $state([]);
	let stats = $state({ total: 0, enabled: 0, disabled: 0, categories: 0, tags: 0 });

	onMount(async () => {
		await loadTools();
	});

	async function loadTools() {
		tools = await toolRegistry.scanTools();
		categories = toolRegistry.getAvailableCategories();
		tags = toolRegistry.getAvailableTags();
		stats = toolRegistry.getToolStats();
		filterTools();
	}

	function filterTools() {
		filteredTools = tools.filter((tool) => {
			// Search filter
			const matchesSearch =
				!searchQuery ||
				tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(tool.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);

			// Category filter
			const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

			// Tag filter
			const matchesTag = selectedTag === 'all' || (tool.tags?.includes(selectedTag) ?? false);

			// Enabled filter
			const matchesEnabled = !showOnlyEnabled || tool.enabled !== false;

			return matchesSearch && matchesCategory && matchesTag && matchesEnabled;
		});
	}

	async function toggleTool(name: string) {
		const tool = tools.find((t) => t.name === name);
		if (tool) {
			if (tool.enabled !== false) {
				await disableToolPersistent(name);
				tool.enabled = false;
			} else {
				await enableToolPersistent(name);
				tool.enabled = true;
			}
			stats = toolRegistry.getToolStats();
			filterTools();
		}
	}

	function clearFilters() {
		searchQuery = '';
		selectedCategory = 'all';
		selectedTag = 'all';
		showOnlyEnabled = false;
		filterTools();
	}

	$effect(() => {
		filterTools();
	});
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
	<!-- Filters Sidebar -->
	<div class="lg:col-span-1">
		<div
			class="sticky top-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>

			<!-- Search -->
			<div class="mb-4">
				<label for="search" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Search
				</label>
				<input
					id="search"
					type="text"
					placeholder="Search tools..."
					bind:value={searchQuery}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				/>
			</div>

			<!-- Category Filter -->
			<div class="mb-4">
				<label
					for="category"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Category
				</label>
				<select
					id="category"
					bind:value={selectedCategory}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="all">All Categories</option>
					{#each categories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>

			<!-- Tag Filter -->
			<div class="mb-4">
				<label for="tag" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Tag
				</label>
				<select
					id="tag"
					bind:value={selectedTag}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="all">All Tags</option>
					{#each tags as tag}
						<option value={tag}>{tag}</option>
					{/each}
				</select>
			</div>

			<!-- Enabled Only Filter -->
			<div class="mb-4">
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={showOnlyEnabled}
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
					/>
					<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Show enabled only</span>
				</label>
			</div>

			<!-- Clear Filters -->
			<button
				onclick={clearFilters}
				class="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
			>
				Clear Filters
			</button>

			<!-- Stats -->
			<div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
				<h3 class="mb-3 text-sm font-medium text-gray-900 dark:text-white">Statistics</h3>
				<div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
					<div class="flex justify-between">
						<span>Total Tools:</span>
						<span>{stats.total}</span>
					</div>
					<div class="flex justify-between">
						<span>Enabled:</span>
						<span class="text-green-600 dark:text-green-400">{stats.enabled}</span>
					</div>
					<div class="flex justify-between">
						<span>Disabled:</span>
						<span class="text-red-600 dark:text-red-400">{stats.disabled}</span>
					</div>
					<div class="flex justify-between">
						<span>Categories:</span>
						<span>{stats.categories}</span>
					</div>
					<div class="flex justify-between">
						<span>Tags:</span>
						<span>{stats.tags}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Tools Grid -->
	<div class="lg:col-span-3">
		{#if filteredTools.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-gray-400 dark:text-gray-500">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No tools found</h3>
				<p class="text-gray-500 dark:text-gray-400">
					Try adjusting your filters or search criteria.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{#each filteredTools as tool (tool.name)}
					<ToolCard
						{tool}
						onToggle={() => toggleTool(tool.name)}
						onViewDetails={() => (selectedTool = tool)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Tool Detail Modal -->
{#if selectedTool}
	<ToolDetail
		tool={selectedTool}
		onClose={() => (selectedTool = null)}
		onToggle={() => toggleTool(selectedTool?.name || '')}
	/>
{/if}
