<script lang="ts">
	import type { ToolInvocation } from '../../app.d.ts';

	interface Props {
		toolInvocation: ToolInvocation;
		isOpen: boolean;
		onClose: () => void;
	}

	let { toolInvocation, isOpen, onClose }: Props = $props();

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function formatJson(obj: unknown): string {
		return JSON.stringify(obj, null, 2);
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div
			class="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
				<h2 id="modal-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Technical Details: {toolInvocation.toolName}
				</h2>
				<button
					onclick={onClose}
					class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close modal"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-[calc(90vh-4rem)] overflow-y-auto p-4">
				<div class="space-y-6">
					<!-- Tool Call ID -->
					<div>
						<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tool Call ID</h3>
						<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
							<code class="text-sm text-gray-800 dark:text-gray-200">{toolInvocation.toolCallId}</code>
						</div>
					</div>

					<!-- Tool Name -->
					<div>
						<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tool Name</h3>
						<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
							<code class="text-sm text-gray-800 dark:text-gray-200">{toolInvocation.toolName}</code>
						</div>
					</div>

					<!-- Arguments -->
					<div>
						<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Arguments</h3>
						<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
							<pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{formatJson(toolInvocation.args)}</pre>
						</div>
					</div>

					<!-- State -->
					{#if toolInvocation.state}
						<div>
							<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">State</h3>
							<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
								<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
									{toolInvocation.state === 'result' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}">
									{toolInvocation.state}
								</span>
							</div>
						</div>
					{/if}

					<!-- Result -->
					{#if toolInvocation.result}
						<div>
							<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Result</h3>
							<div class="space-y-3">
								<!-- Success Status -->
								<div>
									<h4 class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Success</h4>
									<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
										<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
											{toolInvocation.result.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
											{toolInvocation.result.success ? 'True' : 'False'}
										</span>
									</div>
								</div>

								<!-- Error -->
								{#if toolInvocation.result.error}
									<div>
										<h4 class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Error</h4>
										<div class="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
											<pre class="whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">{toolInvocation.result.error}</pre>
										</div>
									</div>
								{/if}

								<!-- Data -->
								{#if toolInvocation.result.data !== undefined}
									<div>
										<h4 class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Data</h4>
										<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
											<pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{formatJson(toolInvocation.result.data)}</pre>
										</div>
									</div>
								{/if}

								<!-- Metadata -->
								{#if toolInvocation.result.metadata}
									<div>
										<h4 class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Metadata</h4>
										<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
											<pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{formatJson(toolInvocation.result.metadata)}</pre>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Raw JSON -->
					<div>
						<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Raw JSON</h3>
						<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
							<pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{formatJson(toolInvocation)}</pre>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body:has(.fixed.inset-0)) {
		overflow: hidden;
	}
</style>