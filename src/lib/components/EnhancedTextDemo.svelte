<script lang="ts">
	import EnhancedText from './EnhancedText.svelte';

	const sampleTexts = [
		'Check the weather using @weather or calculate something with @calculator',
		'You can get the current time with @time and generate random numbers using @random',
		'Process text with @textProcessor or format JSON using @jsonFormatter',
		'Visit https://example.com for more info or check @url tool for URL handling',
		"Here's a mix: @weather in New York, visit https://weather.com, and use @calculator for math",
		'Invalid tool mentions like @nonexistent should not be highlighted',
		'**Bold text** with @time tool and *italic* with https://github.com link'
	];

	let enableMarkdown = $state(true);
	let enableFormatting = $state(true);
</script>

<div class="mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
		EnhancedText Component Demo
	</h1>

	<div class="mb-6 flex gap-4">
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={enableMarkdown} />
			<span class="text-sm text-gray-700 dark:text-gray-300">Enable Markdown</span>
		</label>
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={enableFormatting} />
			<span class="text-sm text-gray-700 dark:text-gray-300">Enable Formatting</span>
		</label>
	</div>

	<div class="space-y-6">
		{#each sampleTexts as text, index (index)}
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="mb-2 font-mono text-xs text-gray-500 dark:text-gray-400">
					Example {index + 1}:
				</div>
				<div
					class="mb-3 rounded bg-gray-100 p-2 font-mono text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400"
				>
					{text}
				</div>
				<div class="border-t border-gray-200 pt-3 dark:border-gray-600">
					<EnhancedText
						{text}
						{enableMarkdown}
						{enableFormatting}
						class="text-gray-900 dark:text-gray-100"
					/>
				</div>
			</div>
		{/each}
	</div>

	<div
		class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<h2 class="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">Instructions</h2>
		<ul class="space-y-1 text-sm text-blue-800 dark:text-blue-200">
			<li>• Hover over @tool mentions to see tool information</li>
			<li>• Valid tools are highlighted and show tooltips</li>
			<li>• Invalid tool mentions remain unformatted</li>
			<li>• URLs are clickable and open in new tabs</li>
			<li>• Markdown formatting can be enabled/disabled</li>
		</ul>
	</div>
</div>
