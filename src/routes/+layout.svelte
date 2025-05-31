<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/stores';

	const { children } = $props();
</script>

<!-- Navigation Header -->
<nav class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<div class="text-2xl">🤖</div>
					<span class="text-xl font-semibold text-gray-900 dark:text-white">AI Tool Chat</span>
				</a>
			</div>

			<div class="flex items-center space-x-4">
				<a
					href="/"
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors {$page.url.pathname ===
					'/'
						? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
						: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}"
				>
					Chat
				</a>
				<a
					href="/tools"
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors {$page.url.pathname ===
					'/tools'
						? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
						: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}"
				>
					Tools
				</a>
			</div>
		</div>
	</div>
</nav>

{@render children()}
<Toast />
