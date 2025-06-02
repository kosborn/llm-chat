<script lang="ts">
	import type { ToolMetadata } from '$lib/tools/types.js';
	import { onMount } from 'svelte';
	import { networkStatus } from '$lib/services/network-status.svelte.js';

	interface Props {
		tool: ToolMetadata;
		onClose: () => void;
		onToggle: () => void;
	}

	const { tool, onClose, onToggle }: Props = $props();
	let isOnline = $derived(networkStatus.isOnline);
	let modal: HTMLDivElement;

	onMount(() => {
		// Focus trap and escape key handling
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		modal?.focus();

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

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

	function getNetworkStatusColor(requiresNetwork: boolean, isOnline: boolean) {
		if (!requiresNetwork) {
			return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
		}
		return isOnline
			? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	}

	function getNetworkStatusText(requiresNetwork: boolean, isOnline: boolean) {
		if (!requiresNetwork) {
			return 'Works Offline';
		}
		return isOnline ? 'Internet Required' : 'Offline - Unavailable';
	}

	function getToolParameters() {
		try {
			// Extract parameters from the tool schema if available
			const toolDef = tool.tool as unknown;
			if (toolDef && typeof toolDef === 'object' && 'parameters' in toolDef) {
				const params = (toolDef as { parameters?: { shape?: Record<string, unknown> } }).parameters;
				if (params?.shape) {
					return Object.entries(params.shape).map(([name, schema]: [string, unknown]) => {
						const schemaDef =
							schema && typeof schema === 'object' && '_def' in schema
								? (schema as { _def?: Record<string, unknown> })._def
								: undefined;
						return {
							name,
							type: schemaDef?.typeName || 'unknown',
							description: schemaDef?.description || 'No description available',
							required: !schemaDef?.defaultValue && schemaDef?.typeName !== 'ZodOptional',
							default: schemaDef?.defaultValue
						};
					});
				}
			}
		} catch (error) {
			console.warn('Could not extract tool parameters:', error);
		}
		return [];
	}

	const parameters = $derived(getToolParameters());
</script>

<!-- Modal Backdrop -->
<div
	bind:this={modal}
	class="bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black p-4"
	onclick={handleBackdropClick}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
>
	<!-- Modal Content -->
	<div
		class="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
		>
			<div class="flex-1">
				<h2 id="modal-title" class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
					{tool.name}
				</h2>
				<div class="flex flex-wrap items-center gap-2">
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
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {tool.enabled !==
						false
							? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
							: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
					>
						{tool.enabled !== false ? 'Enabled' : 'Disabled'}
					</span>
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getNetworkStatusColor(
							tool.requiresNetwork === true,
							isOnline
						)}"
						title={tool.requiresNetwork === true
							? 'This tool requires internet connection'
							: 'This tool works offline'}
					>
						{tool.requiresNetwork === true ? '🌐' : '📱'}
						{getNetworkStatusText(tool.requiresNetwork === true, isOnline)}
					</span>
					{#if tool.version}
						<span class="text-xs text-gray-500 dark:text-gray-400">v{tool.version}</span>
					{/if}
				</div>
			</div>

			<button
				onclick={onClose}
				class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Close modal"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
			<!-- Network Requirements -->
			{#if tool.requiresNetwork === true}
				<div
					class="mb-6 rounded-lg border {isOnline
						? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
						: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}"
				>
					<div class="flex items-start gap-3 p-4">
						<div class="flex-shrink-0">
							<svg
								class="h-5 w-5 {isOnline
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'}"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div>
							<h4
								class="text-sm font-medium {isOnline
									? 'text-green-800 dark:text-green-200'
									: 'text-red-800 dark:text-red-200'}"
							>
								{isOnline ? 'Internet Connection Required' : 'Tool Currently Unavailable'}
							</h4>
							<p
								class="mt-1 text-sm {isOnline
									? 'text-green-700 dark:text-green-300'
									: 'text-red-700 dark:text-red-300'}"
							>
								{#if isOnline}
									This tool requires an active internet connection to function properly.
								{:else}
									This tool needs internet access but you're currently offline.
								{/if}
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
				>
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0">
							<svg
								class="h-5 w-5 text-blue-600 dark:text-blue-400"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div>
							<h4 class="text-sm font-medium text-blue-800 dark:text-blue-200">Works Offline</h4>
							<p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
								This tool works entirely offline and doesn't require an internet connection.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Description -->
			<div class="mb-6">
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Description</h3>
				<p class="text-gray-600 dark:text-gray-300">
					{tool.description}
				</p>
			</div>

			<!-- Parameters -->
			{#if parameters.length > 0}
				<div class="mb-6">
					<h3 class="mb-3 text-lg font-medium text-gray-900 dark:text-white">Parameters</h3>
					<div class="space-y-3">
						{#each parameters as param}
							<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
								<div class="mb-2 flex items-center gap-2">
									<code
										class="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-blue-600 dark:bg-gray-700 dark:text-blue-400"
									>
										{param.name}
									</code>
									<span class="text-xs text-gray-500 dark:text-gray-400">{param.type}</span>
									{#if param.required}
										<span
											class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200"
										>
											required
										</span>
									{/if}
								</div>
								<p class="text-sm text-gray-600 dark:text-gray-300">
									{param.description}
								</p>
								{#if param.default !== undefined}
									<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
										Default: <code class="rounded bg-gray-100 px-1 dark:bg-gray-700"
											>{JSON.stringify(param.default)}</code
										>
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Tags -->
			{#if tool.tags && tool.tags.length > 0}
				<div class="mb-6">
					<h3 class="mb-3 text-lg font-medium text-gray-900 dark:text-white">Tags</h3>
					<div class="flex flex-wrap gap-2">
						{#each tool.tags as tag}
							<span
								class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300"
							>
								{tag}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Metadata -->
			<div class="mb-6">
				<h3 class="mb-3 text-lg font-medium text-gray-900 dark:text-white">Metadata</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					{#if tool.author}
						<div>
							<span class="text-gray-500 dark:text-gray-400">Author:</span>
							<span class="ml-1 text-gray-900 dark:text-white">{tool.author}</span>
						</div>
					{/if}
					{#if tool.version}
						<div>
							<span class="text-gray-500 dark:text-gray-400">Version:</span>
							<span class="ml-1 text-gray-900 dark:text-white">{tool.version}</span>
						</div>
					{/if}
					{#if tool.category}
						<div>
							<span class="text-gray-500 dark:text-gray-400">Category:</span>
							<span class="ml-1 text-gray-900 dark:text-white">{tool.category}</span>
						</div>
					{/if}
					<div>
						<span class="text-gray-500 dark:text-gray-400">Status:</span>
						<span class="ml-1 text-gray-900 dark:text-white">
							{tool.enabled !== false ? 'Enabled' : 'Disabled'}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div
			class="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-700"
		>
			<div class="flex gap-3">
				<button
					onclick={onToggle}
					class="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors {tool.enabled !==
					false
						? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800'
						: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800'}"
				>
					{tool.enabled !== false ? 'Disable Tool' : 'Enable Tool'}
				</button>
			</div>

			<button
				onclick={onClose}
				class="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			>
				Close
			</button>
		</div>
	</div>
</div>
