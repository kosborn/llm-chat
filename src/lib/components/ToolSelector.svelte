<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toolRegistry } from '$lib/tools/registry.js';
	import { toolSettingsStore } from '$lib/stores/tool-settings-store.svelte.js';
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

	// Expose filtered tools for external access (only enabled tools for backward compatibility)
	export function getFilteredTools(): ToolMetadata[] {
		return enabledTools();
	}

	let selectedIndex = $state(0);
	let selectorElement = $state<HTMLDivElement>();
	let stablePosition = $state({ x: position.x, y: position.y });
	let maxHeight = $state(256); // 16rem in pixels

	// Get all tools (enabled and disabled) and filter them
	const allTools = $derived(() => Object.values(toolRegistry.getAllTools()));
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

	// Separate enabled and disabled tools
	const enabledTools = $derived(() =>
		filteredTools().filter((tool) => toolSettingsStore.getToolSetting(tool.name))
	);
	const disabledTools = $derived(() =>
		filteredTools().filter((tool) => !toolSettingsStore.getToolSetting(tool.name))
	);

	// Combined list for indexing (enabled first, then disabled)
	const combinedTools = $derived(() => [...enabledTools(), ...disabledTools()]);

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

	// Group enabled tools by category
	const groupedEnabledTools = $derived(() => {
		const groups: Record<string, ToolMetadata[]> = {};
		for (const tool of enabledTools()) {
			const category = tool.category || 'general';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	});

	// Group disabled tools by category
	const groupedDisabledTools = $derived(() => {
		const groups: Record<string, ToolMetadata[]> = {};
		for (const tool of disabledTools()) {
			const category = tool.category || 'general';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!visible || combinedTools().length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, combinedTools().length - 1);
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
				if (combinedTools()[selectedIndex]) {
					dispatch('select', { tool: combinedTools()[selectedIndex] });
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

{#if visible && combinedTools().length > 0}
	<div
		bind:this={selectorElement}
		class="absolute z-50 max-w-80 min-w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
		style="left: {stablePosition.x}px; top: {stablePosition.y}px; transform: translateY(-100%); max-height: {maxHeight}px; width: {combinedTools()
			.length <= 3
			? 'auto'
			: '20rem'};"
	>
		<div class="p-2">
			{#if combinedTools().length > 1}
				<div class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
					Select a tool ({enabledTools().length} enabled{disabledTools().length > 0
						? `, ${disabledTools().length} disabled`
						: ''})
				</div>
			{/if}

			<!-- Enabled Tools Section -->
			{#if enabledTools().length > 0}
				{#each Object.entries(groupedEnabledTools()) as [category, tools], categoryIndex (category)}
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
							{@const globalIndex = combinedTools().indexOf(tool)}
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
			{/if}

			<!-- Disabled Tools Section -->
			{#if disabledTools().length > 0}
				{#if enabledTools().length > 0}
					<div class="my-2 border-t border-gray-200 dark:border-gray-600"></div>
					<div
						class="mb-2 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"
					>
						<span>⚠️</span>
						<span>Disabled Tools (will be temporarily enabled)</span>
					</div>
				{/if}

				{#each Object.entries(groupedDisabledTools()) as [category, tools], categoryIndex (category)}
					{#if categoryIndex > 0 || enabledTools().length === 0}
						<div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
					{/if}

					<div class="mb-1">
						<div
							class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400"
						>
							<span class="opacity-60">{getCategoryIcon(category)}</span>
							<span class="capitalize opacity-60">{category} (disabled)</span>
						</div>

						{#each tools as tool}
							{@const globalIndex = combinedTools().indexOf(tool)}
							<button
								data-index={globalIndex}
								class="w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 {globalIndex ===
								selectedIndex
									? 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100'
									: 'text-gray-500 dark:text-gray-400'} opacity-75"
								onclick={() => handleToolClick(tool)}
							>
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1 truncate font-medium">
											<span>@{tool.name}</span>
											<span
												class="rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
												>disabled</span
											>
										</div>
										<div class="truncate text-xs text-gray-400 dark:text-gray-500">
											{tool.description}
										</div>
									</div>
									{#if tool.tags && tool.tags.length > 0}
										<div class="ml-2 flex gap-1">
											{#each tool.tags.slice(0, 2) as tag (tag)}
												<span
													class="rounded bg-gray-200 px-1 py-0.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400"
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
			{/if}
		</div>

		{#if combinedTools().length === 0 && filter}
			<div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
				No tools found matching "{filter}"
			</div>
		{/if}
	</div>
{/if}
