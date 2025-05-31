<script lang="ts">
	import ToolsExplorer from '$lib/components/ToolsExplorer.svelte';
</script>

<svelte:head>
	<title>Tools Explorer - AI Tool Chat</title>
	<meta name="description" content="Explore and manage available AI tools" />
</svelte:head>

<div class="h-[calc(100vh-4rem)] overflow-auto bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 py-8">
		<header class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Tools Explorer</h1>
			<p class="text-gray-600 dark:text-gray-300">
				Discover and manage the available tools for your AI chat bot
			</p>
		</header>

		<!-- Demo Section -->
		<div
			class="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20"
		>
			<div class="flex items-start space-x-3">
				<div class="flex-shrink-0">
					<svg
						class="h-5 w-5 text-blue-600 dark:text-blue-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div>
					<h3 class="mb-2 text-lg font-medium text-blue-900 dark:text-blue-100">About Tools</h3>
					<p class="mb-3 text-sm text-blue-700 dark:text-blue-200">
						These tools extend the AI's capabilities by allowing it to perform specific tasks like
						calculations, weather lookups, text processing, and more. You can enable or disable
						tools to customize your chat experience.
					</p>
					<div class="flex flex-wrap gap-2">
						<span
							class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100"
						>
							🧮 Calculations
						</span>
						<span
							class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-100"
						>
							🌤️ Weather
						</span>
						<span
							class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-800 dark:text-purple-100"
						>
							📝 Text Processing
						</span>
						<span
							class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-800 dark:text-orange-100"
						>
							🔗 URL Operations
						</span>
					</div>
				</div>
			</div>
		</div>

		<ToolsExplorer />
	</div>
</div>
