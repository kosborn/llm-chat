<script lang="ts">
	import { parseFormattedText, defaultFormatRules } from '$lib/utils/text-formatter';
	import { toolRegistry } from '$lib/tools/registry.js';

	let testText = $state('Hello @weather and check https://example.com');
	
	$effect(() => {
		console.log('Test page loaded');
		console.log('Available tools:', Object.keys(toolRegistry.getEnabledTools()));
		console.log('Default rules:', defaultFormatRules);
	});

	let segments = $state([]);
	
	$effect(() => {
		try {
			const result = parseFormattedText(testText, defaultFormatRules);
			console.log('Parsing:', testText);
			console.log('Result:', result);
			segments = Array.isArray(result) ? result : [];
		} catch (error) {
			console.error('Error parsing text:', error);
			segments = [];
		}
	});
</script>

<svelte:head>
	<title>Text Formatter Test</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Text Formatter Test</h1>
		
		<div class="space-y-6">
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Registry Status</h2>
				<div class="space-y-2 text-sm">
					<p><strong>Available Tools:</strong> {Object.keys(toolRegistry.getEnabledTools()).join(', ')}</p>
					<p><strong>Rules Count:</strong> {defaultFormatRules.length}</p>
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Input</h2>
				<input 
					bind:value={testText}
					class="w-full p-3 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					placeholder="Type text to test..."
				/>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Segments</h2>
				<div class="space-y-2">
					{#each segments as segment, index}
						<div class="p-2 bg-gray-50 dark:bg-gray-700 rounded border-l-4 {segment.isFormatted ? 'border-blue-500' : 'border-gray-300'}">
							<div class="text-xs text-gray-500 mb-1">Segment {index + 1}: {segment.isFormatted ? 'Formatted' : 'Plain'}</div>
							<div class="font-mono text-sm">"{segment.text}"</div>
							{#if segment.className}
								<div class="text-xs text-gray-500 mt-1">CSS: {segment.className}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Live Preview</h2>
				<div class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
					{#each segments as segment}
						{#if segment.isFormatted && segment.className}
							<span class={segment.className}>{segment.text}</span>
						{:else}
							<span class="text-gray-900 dark:text-gray-100">{segment.text}</span>
						{/if}
					{/each}
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Test Cases</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<button
						onclick={() => testText = '@weather is nice'}
						class="p-3 text-left bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
					>
						Tool Test: @weather
					</button>
					<button
						onclick={() => testText = 'Visit https://example.com'}
						class="p-3 text-left bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
					>
						URL Test
					</button>
					<button
						onclick={() => testText = '@invalidtool should not work'}
						class="p-3 text-left bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
					>
						Invalid Tool Test
					</button>
					<button
						onclick={() => testText = 'Mixed @weather and https://test.com content'}
						class="p-3 text-left bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
					>
						Mixed Content Test
					</button>
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Raw Data</h2>
				<pre class="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto"><code>{JSON.stringify(segments, null, 2)}</code></pre>
			</div>
		</div>
	</div>
</div>