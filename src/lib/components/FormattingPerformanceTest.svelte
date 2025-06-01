<script lang="ts">
	import { onMount } from 'svelte';
	import {
		parseFormattedText,
		invalidateToolCache,
		extractToolMentions,
		extractUrls,
		extractIps,
		type FormatRule
	} from '$lib/utils/text-formatter';
	import FormattedText from './FormattedText.svelte';

	interface Props {
		visible?: boolean;
	}

	let { visible = false }: Props = $props();

	let performanceResults = $state<{
		originalCalls: number;
		cachedCalls: number;
		averageOriginalTime: number;
		averageCachedTime: number;
		cacheHitRate: number;
	}>({
		originalCalls: 0,
		cachedCalls: 0,
		averageOriginalTime: 0,
		averageCachedTime: 0,
		cacheHitRate: 0
	});

	let testRunning = $state(false);
	let testResults = $state<string[]>([]);

	const testTexts = [
		'Hello @weather, check https://example.com and IP 192.168.1.1',
		'Use @calculator for math and visit https://google.com',
		'Contact admin at 10.0.0.1 or use @random tool',
		'Server at 2001:db8::1 needs @maxmind lookup',
		'Visit https://github.com and use @url tool for processing',
		'Check @time and access https://localhost:3000 or 127.0.0.1'
	];

	async function runPerformanceTest() {
		testRunning = true;
		testResults = [];
		
		const originalTimes: number[] = [];
		const cachedTimes: number[] = [];
		
		// Clear cache first
		invalidateToolCache();
		
		// Test original performance (no cache)
		for (let i = 0; i < 100; i++) {
			const text = testTexts[i % testTexts.length];
			const start = performance.now();
			parseFormattedText(text);
			const end = performance.now();
			originalTimes.push(end - start);
		}
		
		// Test cached performance
		for (let i = 0; i < 100; i++) {
			const text = testTexts[i % testTexts.length];
			const start = performance.now();
			parseFormattedText(text); // Should hit cache
			const end = performance.now();
			cachedTimes.push(end - start);
		}
		
		// Calculate results
		const avgOriginal = originalTimes.reduce((a, b) => a + b, 0) / originalTimes.length;
		const avgCached = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;
		const improvement = ((avgOriginal - avgCached) / avgOriginal) * 100;
		
		performanceResults = {
			originalCalls: originalTimes.length,
			cachedCalls: cachedTimes.length,
			averageOriginalTime: avgOriginal,
			averageCachedTime: avgCached,
			cacheHitRate: improvement
		};
		
		testResults = [
			`Original parsing: ${avgOriginal.toFixed(3)}ms average`,
			`Cached parsing: ${avgCached.toFixed(3)}ms average`,
			`Performance improvement: ${improvement.toFixed(1)}%`,
			`Cache efficiency: ${improvement > 0 ? 'Effective' : 'No improvement'}`
		];
		
		testRunning = false;
	}

	function clearCache() {
		invalidateToolCache();
		testResults = [...testResults, 'Cache cleared successfully'];
	}

	let liveTestText = $state('Test @weather tool with https://example.com and IP 192.168.1.1');
	let parseCount = $state(0);
	let lastParseTime = $state(0);

	$effect(() => {
		// Live parsing performance tracking
		if (liveTestText) {
			const start = performance.now();
			parseFormattedText(liveTestText);
			const end = performance.now();
			lastParseTime = end - start;
			parseCount++;
		}
	});

	onMount(() => {
		// Auto-run test on mount if visible
		if (visible) {
			setTimeout(runPerformanceTest, 500);
		}
	});
</script>

{#if visible}
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
			Text Formatting Performance Test
		</h3>

		<div class="space-y-6">
			<!-- Performance Test Controls -->
			<div class="flex gap-3">
				<button
					onclick={runPerformanceTest}
					disabled={testRunning}
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{testRunning ? 'Running Test...' : 'Run Performance Test'}
				</button>
				
				<button
					onclick={clearCache}
					class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
				>
					Clear Cache
				</button>
			</div>

			<!-- Performance Results -->
			{#if performanceResults.originalCalls > 0}
				<div class="rounded bg-gray-50 p-4 dark:bg-gray-700">
					<h4 class="mb-2 font-medium text-gray-900 dark:text-white">Performance Results</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="font-medium">Original Time:</span>
							{performanceResults.averageOriginalTime.toFixed(3)}ms
						</div>
						<div>
							<span class="font-medium">Cached Time:</span>
							{performanceResults.averageCachedTime.toFixed(3)}ms
						</div>
						<div>
							<span class="font-medium">Improvement:</span>
							{performanceResults.cacheHitRate.toFixed(1)}%
						</div>
						<div>
							<span class="font-medium">Test Iterations:</span>
							{performanceResults.originalCalls}
						</div>
					</div>
				</div>
			{/if}

			<!-- Test Results Log -->
			{#if testResults.length > 0}
				<div class="rounded bg-green-50 p-4 dark:bg-green-900/20">
					<h4 class="mb-2 font-medium text-green-800 dark:text-green-200">Test Results</h4>
					<ul class="space-y-1 text-sm text-green-700 dark:text-green-300">
						{#each testResults as result}
							<li>• {result}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Live Performance Monitor -->
			<div class="space-y-3">
				<h4 class="font-medium text-gray-900 dark:text-white">Live Performance Monitor</h4>
				<div class="text-sm text-gray-600 dark:text-gray-400">
					Parse count: {parseCount} | Last parse: {lastParseTime.toFixed(3)}ms
				</div>
				
				<textarea
					bind:value={liveTestText}
					placeholder="Type text with @tools, URLs, and IPs to test live formatting..."
					class="w-full rounded border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700"
					rows="3"
				></textarea>
				
				<div class="rounded border border-gray-200 p-3 dark:border-gray-600">
					<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
						Formatted Output:
					</div>
					<FormattedText text={liveTestText} />
				</div>
			</div>

			<!-- Extraction Tests -->
			<div class="space-y-3">
				<h4 class="font-medium text-gray-900 dark:text-white">Feature Extraction Tests</h4>
				
				{#each testTexts.slice(0, 3) as testText}
					<div class="rounded bg-gray-50 p-3 dark:bg-gray-700">
						<div class="mb-2 text-sm">
							<strong>Text:</strong> {testText}
						</div>
						<div class="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
							<div>
								<strong>Tools:</strong> {extractToolMentions(testText).join(', ') || 'None'}
							</div>
							<div>
								<strong>URLs:</strong> {extractUrls(testText).length} found
							</div>
							<div>
								<strong>IPs:</strong> {extractIps(testText).length} found
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Cache Status -->
			<div class="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
				<h4 class="mb-2 font-medium text-blue-800 dark:text-blue-200">Cache Information</h4>
				<ul class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
					<li>• Tool names cached for 1 second</li>
					<li>• Tool validation cached for 5 seconds</li>
					<li>• Parsed segments cached for 2 seconds</li>
					<li>• Automatic cache cleanup when size exceeds limits</li>
					<li>• Cache invalidated when tools are enabled/disabled</li>
				</ul>
			</div>
		</div>
	</div>
{/if}