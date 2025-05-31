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

<div class="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
	<div class="mx-auto max-w-4xl">
		<h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">Text Formatter Test</h1>

		<div class="space-y-6">
			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Registry Status</h2>
				<div class="space-y-2 text-sm">
					<p>
						<strong>Available Tools:</strong>
						{Object.keys(toolRegistry.getEnabledTools()).join(', ')}
					</p>
					<p><strong>Rules Count:</strong> {defaultFormatRules.length}</p>
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Input</h2>
				<input
					bind:value={testText}
					class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					placeholder="Type text to test..."
				/>
			</div>

			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Segments</h2>
				<div class="space-y-2">
					{#each segments as segment, index}
						<div
							class="rounded border-l-4 bg-gray-50 p-2 dark:bg-gray-700 {segment.isFormatted
								? 'border-blue-500'
								: 'border-gray-300'}"
						>
							<div class="mb-1 text-xs text-gray-500">
								Segment {index + 1}: {segment.isFormatted ? 'Formatted' : 'Plain'}
							</div>
							<div class="font-mono text-sm">"{segment.text}"</div>
							{#if segment.className}
								<div class="mt-1 text-xs text-gray-500">CSS: {segment.className}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Live Preview</h2>
				<div
					class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					{#each segments as segment}
						{#if segment.isFormatted && segment.className}
							<span class={segment.className}>{segment.text}</span>
						{:else}
							<span class="text-gray-900 dark:text-gray-100">{segment.text}</span>
						{/if}
					{/each}
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Test Cases</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<button
						onclick={() => (testText = '@weather is nice')}
						class="rounded bg-blue-50 p-3 text-left hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
					>
						Tool Test: @weather
					</button>
					<button
						onclick={() => (testText = 'Visit https://example.com')}
						class="rounded bg-green-50 p-3 text-left hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
					>
						URL Test
					</button>
					<button
						onclick={() => (testText = '@invalidtool should not work')}
						class="rounded bg-red-50 p-3 text-left hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
					>
						Invalid Tool Test
					</button>
					<button
						onclick={() => (testText = 'Mixed @weather and https://test.com content')}
						class="rounded bg-purple-50 p-3 text-left hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
					>
						Mixed Content Test
					</button>
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Raw Data</h2>
				<pre class="overflow-auto rounded bg-gray-100 p-4 text-xs dark:bg-gray-700"><code
						>{JSON.stringify(segments, null, 2)}</code
					></pre>
			</div>
		</div>
	</div>
</div>
