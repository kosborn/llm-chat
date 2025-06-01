<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toolRegistry } from '$lib/tools/registry.js';
	import type { ToolMetadata } from '$lib/tools/types.js';

	interface Props {
		visible: boolean;
		position: { x: number; y: number };
		filter?: string;
	}

	let { visible = false, position = { x: 0, y: 0 }, filter = '' }: Props = $props();

	const dispatch = createEventDispatcher<{
		select: { tool: ToolMetadata };
		close: undefined;
	}>();

	// Expose filtered tools for external access
	export function getFilteredTools(): ToolMetadata[] {
		return filteredTools();
	}

	let selectedIndex = $state(0);
	let selectorElement = $state<HTMLDivElement>();
	let stablePosition = $state({ x: position.x, y: position.y });
	let maxHeight = $state(256); // 16rem in pixels

	// Get available tools and filter them
	const allTools = $derived(() => Object.values(toolRegistry.getEnabledTools()));
	const filteredTools = $derived(() => {
		if (!filter) return allTools();
		const lowerFilter = filter.toLowerCase();
		return allTools().filter(
			(tool) =>
				tool.name.toLowerCase().includes(lowerFilter) ||
				tool.description.toLowerCase().includes(lowerFilter) ||
				tool.category?.toLowerCase().includes(lowerFilter) ||
				tool.tags?.some((tag) => tag.toLowerCase().includes(lowerFilter))
		);
	});

	// Reset selected index when filter changes
	$effect(() => {
		if (filter !== undefined) {
			selectedIndex = 0;
		}
	});

	// Set stable position once when component becomes visible
	$effect(() => {
		if (visible && (position.x !== stablePosition.x || position.y !== stablePosition.y)) {
			const viewportWidth = window.innerWidth;

			let newX = position.x;
			let newY = position.y;

			// Adjust horizontal position if popup would go off-screen (assuming max width)
			if (newX + 320 > viewportWidth) {
				newX = Math.max(10, viewportWidth - 320 - 10);
			}

			// Calculate available space above cursor for upward growth
			const spaceAbove = newY - 10;

			// Set max height based on available space above
			maxHeight = Math.min(256, spaceAbove);

			// Position will be anchored at bottom using transform

			// Ensure minimum distance from edges
			newX = Math.max(10, newX);
			newY = Math.max(10, newY);

			stablePosition = { x: newX, y: newY };
		}
	});

	// Group tools by category
	const groupedTools = $derived(() => {
		const groups: Record<string, ToolMetadata[]> = {};
		for (const tool of filteredTools()) {
			const category = tool.category || 'general';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!visible || filteredTools().length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredTools().length - 1);
				scrollToSelected();
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				scrollToSelected();
				break;
			case 'Enter':
			case 'Tab':
				event.preventDefault();
				if (filteredTools()[selectedIndex]) {
					dispatch('select', { tool: filteredTools()[selectedIndex] });
				}
				break;
			case 'Escape':
				event.preventDefault();
				dispatch('close');
				break;
		}
	}

	function scrollToSelected() {
		if (selectorElement) {
			const selectedElement = selectorElement.querySelector(
				`[data-index="${selectedIndex}"]`
			) as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: 'nearest' });
			}
		}
	}

	function handleToolClick(tool: ToolMetadata) {
		dispatch('select', { tool });
	}

	function getCategoryIcon(category: string): string {
		switch (category) {
			case 'utility':
				return '🔧';
			case 'web':
				return '🌐';
			case 'data':
				return '📊';
			case 'ai':
				return '🤖';
			case 'development':
				return '💻';
			case 'weather':
				return '🌤️';
			default:
				return '⚡';
		}
	}

	// Handle clicks outside to close
	function handleClickOutside(event: MouseEvent) {
		if (selectorElement && !selectorElement.contains(event.target as Node)) {
			dispatch('close');
		}
	}

	$effect(() => {
		if (visible) {
			document.addEventListener('keydown', handleKeydown);
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('keydown', handleKeydown);
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

{#if visible && filteredTools().length > 0}
	<div
		bind:this={selectorElement}
		class="absolute z-50 max-w-80 min-w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
		style="left: {stablePosition.x}px; top: {stablePosition.y}px; transform: translateY(-100%); max-height: {maxHeight}px; width: {filteredTools()
			.length <= 3
			? 'auto'
			: '20rem'};"
	>
		<div class="p-2">
			{#if filteredTools().length > 1}
				<div class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
					Select a tool ({filteredTools().length} available)
				</div>
			{/if}

			{#each Object.entries(groupedTools()) as [category, tools], categoryIndex (category)}
				{#if categoryIndex > 0}
					<div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
				{/if}

				<div class="mb-1">
					<div
						class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
					>
						<span>{getCategoryIcon(category)}</span>
						<span class="capitalize">{category}</span>
					</div>

					{#each tools as tool}
						{@const globalIndex = filteredTools().indexOf(tool)}
						<button
							data-index={globalIndex}
							class="w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {globalIndex ===
							selectedIndex
								? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100'
								: 'text-gray-900 dark:text-gray-100'}"
							onclick={() => handleToolClick(tool)}
						>
							<div class="flex items-center justify-between">
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">@{tool.name}</div>
									<div class="truncate text-xs text-gray-500 dark:text-gray-400">
										{tool.description}
									</div>
								</div>
								{#if tool.tags && tool.tags.length > 0}
									<div class="ml-2 flex gap-1">
										{#each tool.tags.slice(0, 2) as tag (tag)}
											<span
												class="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
											>
												{tag}
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/each}
		</div>

		{#if filteredTools().length === 0 && filter}
			<div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
				No tools found matching "{filter}"
			</div>
		{/if}
	</div>
{/if}
