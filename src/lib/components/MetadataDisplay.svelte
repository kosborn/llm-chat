<script lang="ts">
	import {
		formatCost,
		getModelDisplayName,
		getProviderDisplayName,
		isFreeProvider
	} from '$lib/utils/cost-calculator.js';
	import type { ApiUsageMetadata } from '../../app.d.ts';

	interface Props {
		metadata: ApiUsageMetadata;
		isVisible?: boolean;
		compact?: boolean;
	}

	let { metadata, isVisible = false, compact = false }: Props = $props();

	function formatTokens(tokens: number | undefined): string {
		if (!tokens) return 'N/A';
		return new Intl.NumberFormat().format(tokens);
	}

	function formatResponseTime(time: number | undefined): string {
		if (!time) return 'N/A';
		if (time < 1000) return `${time}ms`;
		return `${(time / 1000).toFixed(2)}s`;
	}

	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	let showDetails = $state(false);
</script>

{#if isVisible}
	<div
		class="rounded-lg border border-gray-200 bg-gray-50 text-xs dark:border-gray-700 dark:bg-gray-800"
	>
		{#if compact}
			<!-- Compact view - single line -->
			<div class="flex items-center justify-between p-2">
				<div class="flex items-center gap-2">
					<span class="font-medium text-gray-700 dark:text-gray-300">
						{getModelDisplayName(metadata.provider || '', metadata.model || '')}
					</span>
					{#if metadata.mode === 'client'}
						<span
							class="text-xs text-blue-600 dark:text-blue-400"
							title="Generated using browser client"
						>
							📱 Client
						</span>
					{/if}
					{#if metadata.totalTokens}
						<span class="text-gray-500 dark:text-gray-400">
							{formatTokens(metadata.totalTokens)} tokens
						</span>
					{/if}
					{#if metadata.cost?.totalCost && !isFreeProvider(metadata.provider || '')}
						<span class="text-green-600 dark:text-green-400">
							{formatCost(metadata.cost.totalCost)}
						</span>
					{/if}
					{#if metadata.responseTime}
						<span class="text-blue-600 dark:text-blue-400">
							{formatResponseTime(metadata.responseTime)}
						</span>
					{/if}
				</div>
				<button
					onclick={() => (showDetails = !showDetails)}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					aria-label="Toggle metadata details"
				>
					<svg
						class="h-3 w-3 transform transition-transform"
						class:rotate-180={showDetails}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
			</div>

			{#if showDetails}
				<div class="border-t border-gray-200 p-2 dark:border-gray-700">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<span class="text-gray-600 dark:text-gray-400">Provider:</span>
							<span class="ml-1 font-mono">{getProviderDisplayName(metadata.provider || '')}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">Time:</span>
							<span class="ml-1 font-mono">{formatTimestamp(metadata.timestamp)}</span>
						</div>
						{#if metadata.mode}
							<div>
								<span class="text-gray-600 dark:text-gray-400">Mode:</span>
								<span
									class="ml-1 font-mono {metadata.mode === 'client'
										? 'text-blue-600 dark:text-blue-400'
										: 'text-gray-700 dark:text-gray-300'}"
								>
									{metadata.mode === 'client' ? '📱 Browser Client' : '🌐 Server AI'}
								</span>
							</div>
						{/if}
						{#if metadata.promptTokens}
							<div>
								<span class="text-gray-600 dark:text-gray-400">Input:</span>
								<span class="ml-1 font-mono">{formatTokens(metadata.promptTokens)}</span>
							</div>
						{/if}
						{#if metadata.completionTokens}
							<div>
								<span class="text-gray-600 dark:text-gray-400">Output:</span>
								<span class="ml-1 font-mono">{formatTokens(metadata.completionTokens)}</span>
							</div>
						{/if}
						{#if metadata.cost && !isFreeProvider(metadata.provider || '')}
							<div>
								<span class="text-gray-600 dark:text-gray-400">Input Cost:</span>
								<span class="ml-1 font-mono text-green-600 dark:text-green-400">
									{formatCost(metadata.cost.inputCost || 0)}
								</span>
							</div>
							<div>
								<span class="text-gray-600 dark:text-gray-400">Output Cost:</span>
								<span class="ml-1 font-mono text-green-600 dark:text-green-400">
									{formatCost(metadata.cost.outputCost || 0)}
								</span>
							</div>
						{/if}
						{#if metadata.requestId}
							<div class="col-span-2">
								<span class="text-gray-600 dark:text-gray-400">Request ID:</span>
								<span class="ml-1 font-mono text-xs break-all">{metadata.requestId}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<!-- Full view -->
			<div class="p-3">
				<div class="mb-2 flex items-center justify-between">
					<h4 class="font-medium text-gray-900 dark:text-gray-100">API Metadata</h4>
					<span class="text-gray-500 dark:text-gray-400">{formatTimestamp(metadata.timestamp)}</span
					>
				</div>

				<div class="space-y-2">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Model</span>
							<span class="font-mono text-sm font-medium">
								{getModelDisplayName(metadata.provider || '', metadata.model || '')}
							</span>
						</div>
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Provider</span>
							<span class="font-mono text-sm font-medium">
								{getProviderDisplayName(metadata.provider || '')}
							</span>
						</div>
					</div>

					{#if metadata.mode}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Mode</span>
							<span
								class="font-mono text-sm font-medium {metadata.mode === 'client'
									? 'text-blue-600 dark:text-blue-400'
									: 'text-gray-700 dark:text-gray-300'}"
							>
								{metadata.mode === 'client' ? '📱 Browser Client' : '🌐 Server AI'}
							</span>
						</div>
					{/if}

					{#if metadata.promptTokens || metadata.completionTokens || metadata.totalTokens}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Token Usage</span>
							<div class="grid grid-cols-3 gap-2 text-sm">
								{#if metadata.promptTokens}
									<div>
										<span class="text-gray-500">Input:</span>
										<span class="font-mono">{formatTokens(metadata.promptTokens)}</span>
									</div>
								{/if}
								{#if metadata.completionTokens}
									<div>
										<span class="text-gray-500">Output:</span>
										<span class="font-mono">{formatTokens(metadata.completionTokens)}</span>
									</div>
								{/if}
								{#if metadata.totalTokens}
									<div>
										<span class="text-gray-500">Total:</span>
										<span class="font-mono font-medium">{formatTokens(metadata.totalTokens)}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					{#if metadata.cost && !isFreeProvider(metadata.provider || '')}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Cost Breakdown</span>
							<div class="grid grid-cols-3 gap-2 text-sm">
								<div>
									<span class="text-gray-500">Input:</span>
									<span class="font-mono text-green-600 dark:text-green-400">
										{formatCost(metadata.cost.inputCost || 0)}
									</span>
								</div>
								<div>
									<span class="text-gray-500">Output:</span>
									<span class="font-mono text-green-600 dark:text-green-400">
										{formatCost(metadata.cost.outputCost || 0)}
									</span>
								</div>
								<div>
									<span class="text-gray-500">Total:</span>
									<span class="font-mono font-medium text-green-600 dark:text-green-400">
										{formatCost(metadata.cost.totalCost || 0)}
									</span>
								</div>
							</div>
						</div>
					{:else if isFreeProvider(metadata.provider || '')}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Cost</span>
							<span class="font-mono text-sm font-medium text-green-600 dark:text-green-400"
								>Free</span
							>
						</div>
					{/if}

					{#if metadata.responseTime}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Response Time</span>
							<span class="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
								{formatResponseTime(metadata.responseTime)}
							</span>
						</div>
					{/if}

					{#if metadata.requestId}
						<div>
							<span class="block text-gray-600 dark:text-gray-400">Request ID</span>
							<span class="font-mono text-xs break-all">{metadata.requestId}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
