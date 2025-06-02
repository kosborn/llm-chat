<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toolRegistry } from '$lib/tools/registry.js';
	import { toolSettingsStore } from '$lib/stores/tool-settings-store.svelte.js';
	import { networkStatus } from '$lib/services/network-status.svelte.js';
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

	// Expose filtered tools for external access (only available enabled tools for backward compatibility)
	export function getFilteredTools(): ToolMetadata[] {
		return enabledAvailableTools();
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

	// Separate tools by their availability and network requirements
	const enabledAvailableTools = $derived(() =>
		filteredTools().filter(
			(tool) =>
				toolSettingsStore.getToolSetting(tool.name) &&
				(!tool.requiresNetwork || networkStatus.isOnline)
		)
	);
	const enabledUnavailableTools = $derived(() =>
		filteredTools().filter(
			(tool) =>
				toolSettingsStore.getToolSetting(tool.name) &&
				tool.requiresNetwork &&
				!networkStatus.isOnline
		)
	);
	const disabledTools = $derived(() =>
		filteredTools().filter((tool) => !toolSettingsStore.getToolSetting(tool.name))
	);

	// Combined list for indexing (available enabled first, then unavailable enabled, then disabled)
	const combinedTools = $derived(() => [
		...enabledAvailableTools(),
		...enabledUnavailableTools(),
		...disabledTools()
	]);

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
			const isDesktop = viewportWidth >= 768; // md breakpoint

			let newX = position.x;
			let newY = position.y;

			if (isDesktop) {
				// Desktop: Adjust horizontal position if popup would go off-screen (assuming max width)
				if (newX + 320 > viewportWidth) {
					newX = Math.max(10, viewportWidth - 320 - 10);
				}
			} else {
				// Mobile: Center horizontally, already calculated in ChatInput
				// Ensure it doesn't go off screen edges
				if (newX < 10) {
					newX = 10;
				} else if (newX + 320 > viewportWidth - 10) {
					newX = viewportWidth - 320 - 10;
				}
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

	// Group enabled available tools by category
	const groupedEnabledAvailableTools = $derived(() => {
		const groups: Record<string, ToolMetadata[]> = {};
		for (const tool of enabledAvailableTools()) {
			const category = tool.category || 'general';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	});

	// Group enabled unavailable tools by category
	const groupedEnabledUnavailableTools = $derived(() => {
		const groups: Record<string, ToolMetadata[]> = {};
		for (const tool of enabledUnavailableTools()) {
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
					Select a tool ({enabledAvailableTools().length} available{enabledUnavailableTools()
						.length > 0
						? `, ${enabledUnavailableTools().length} offline`
						: ''}{disabledTools().length > 0 ? `, ${disabledTools().length} disabled` : ''})
				</div>
			{/if}

			<!-- Available Enabled Tools Section -->
			{#if enabledAvailableTools().length > 0}
				{#each Object.entries(groupedEnabledAvailableTools()) as [category, tools], categoryIndex (category)}
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

			<!-- Unavailable Enabled Tools Section (Requires Network) -->
			{#if enabledUnavailableTools().length > 0}
				{#if enabledAvailableTools().length > 0}
					<div class="my-2 border-t border-red-200 dark:border-red-800"></div>
					<div
						class="mb-2 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
					>
						<span>🌐</span>
						<span>Requires Internet Connection</span>
					</div>
				{/if}

				{#each Object.entries(groupedEnabledUnavailableTools()) as [category, tools], categoryIndex (category)}
					{#if categoryIndex > 0 || enabledAvailableTools().length === 0}
						<div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
					{/if}

					<div class="mb-1">
						<div
							class="mb-1 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400"
						>
							<span class="opacity-80">{getCategoryIcon(category)}</span>
							<span class="capitalize opacity-80">{category} (offline)</span>
						</div>

						{#each tools as tool}
							{@const globalIndex = combinedTools().indexOf(tool)}
							<button
								data-index={globalIndex}
								class="w-full cursor-not-allowed rounded px-2 py-1.5 text-left text-sm opacity-60 transition-colors {globalIndex ===
								selectedIndex
									? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
									: 'text-gray-500 dark:text-gray-400'}"
								disabled
								title="This tool requires an internet connection"
							>
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1 truncate font-medium">
											<span>@{tool.name}</span>
											<span
												class="rounded bg-red-100 px-1 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300"
												>offline</span
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

			<!-- Disabled Tools Section -->
			{#if disabledTools().length > 0}
				{#if enabledAvailableTools().length > 0 || enabledUnavailableTools().length > 0}
					<div class="my-2 border-t border-gray-200 dark:border-gray-600"></div>
					<div
						class="mb-2 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"
					>
						<span>⚠️</span>
						<span>Disabled Tools (will be temporarily enabled)</span>
					</div>
				{/if}

				{#each Object.entries(groupedDisabledTools()) as [category, tools], categoryIndex (category)}
					{#if categoryIndex > 0 || (enabledAvailableTools().length === 0 && enabledUnavailableTools().length === 0)}
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
							{@const canUseWhenEnabled = !tool.requiresNetwork || networkStatus.isOnline}
							<button
								data-index={globalIndex}
								class="w-full rounded px-2 py-1.5 text-left text-sm transition-colors {canUseWhenEnabled
									? 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
									: 'cursor-not-allowed'} {globalIndex === selectedIndex
									? canUseWhenEnabled
										? 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100'
										: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
									: canUseWhenEnabled
										? 'text-gray-500 dark:text-gray-400'
										: 'text-gray-400 dark:text-gray-500'} {canUseWhenEnabled
									? 'opacity-75'
									: 'opacity-50'}"
								onclick={() => canUseWhenEnabled && handleToolClick(tool)}
								disabled={!canUseWhenEnabled}
								title={!canUseWhenEnabled ? 'This tool requires an internet connection' : undefined}
							>
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1 truncate font-medium">
											<span>@{tool.name}</span>
											<span
												class="rounded {canUseWhenEnabled
													? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
													: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'} px-1 py-0.5 text-xs"
												>{canUseWhenEnabled ? 'disabled' : 'offline'}</span
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
