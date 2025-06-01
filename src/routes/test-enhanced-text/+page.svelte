<script lang="ts">
	import EnhancedText from '$lib/components/EnhancedText.svelte';

	const testCases = [
		{
			title: 'Markdown Only',
			text: `# Heading 1
## Heading 2
This is **bold** and *italic* text.

\`\`\`javascript
console.log('Hello World');
\`\`\`

- List item 1
- List item 2`,
			enableMarkdown: true,
			enableFormatting: false
		},
		{
			title: 'Formatting Only',
			text: `Tool mention: @grep
IP Address: 192.168.1.1
URL: https://example.com
Regular text here`,
			enableMarkdown: false,
			enableFormatting: true
		},
		{
			title: 'Both Markdown and Formatting',
			text: `# Combined Test
This demonstrates **both** markdown and formatting working together.

## Tool mentions
You can use @grep to search files.
Try @find_path for finding files by pattern.

## Network information
Server IP: 192.168.1.100
IPv6 address: 2001:db8::1

## Links
Visit https://example.com for more info.

\`\`\`bash
curl https://api.example.com
\`\`\`

*This text is italic* and contains @terminal tool mention.`,
			enableMarkdown: true,
			enableFormatting: true
		},
		{
			title: 'Complex Mixed Content',
			text: `# Network Configuration

## Primary Server
- **IP**: 10.0.0.1
- **URL**: https://primary.example.com
- **Tools**: Use @ping and @traceroute

## Secondary Server
- **IP**: 10.0.0.2  
- **URL**: https://secondary.example.com

### Commands
\`\`\`bash
# Check connectivity with @ping
ping 10.0.0.1

# Use @nmap for port scanning
nmap https://primary.example.com
\`\`\`

**Note**: Use @ssh for secure connections to 10.0.0.1`,
			enableMarkdown: true,
			enableFormatting: true
		}
	];
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-3xl font-bold">Enhanced Text Test Page</h1>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		This page demonstrates the EnhancedText component with different combinations of markdown and formatting enabled.
	</p>

	<div class="space-y-8">
		{#each testCases as testCase, index (index)}
			<div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
				<h2 class="mb-4 text-xl font-semibold">{testCase.title}</h2>
				
				<div class="mb-4 flex gap-4 text-sm">
					<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
						Markdown: {testCase.enableMarkdown ? 'Enabled' : 'Disabled'}
					</span>
					<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-800 dark:bg-green-900 dark:text-green-300">
						Formatting: {testCase.enableFormatting ? 'Enabled' : 'Disabled'}
					</span>
				</div>

				<div class="space-y-4">
					<div>
						<h3 class="mb-2 font-medium">Input Text:</h3>
						<pre class="rounded bg-gray-100 p-3 text-sm dark:bg-gray-800"><code>{testCase.text}</code></pre>
					</div>

					<div>
						<h3 class="mb-2 font-medium">Rendered Output:</h3>
						<div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
							<EnhancedText 
								text={testCase.text}
								enableMarkdown={testCase.enableMarkdown}
								enableFormatting={testCase.enableFormatting}
							/>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-12 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
		<h2 class="mb-4 text-lg font-semibold">Features Demonstrated</h2>
		<ul class="space-y-2 text-sm">
			<li class="flex items-center gap-2">
				<span class="text-green-500">✓</span>
				<span>Markdown rendering (headings, bold, italic, code blocks, lists)</span>
			</li>
			<li class="flex items-center gap-2">
				<span class="text-green-500">✓</span>
				<span>Tool mentions (@toolname with hover tooltips)</span>
			</li>
			<li class="flex items-center gap-2">
				<span class="text-green-500">✓</span>
				<span>IP address detection and click-to-copy (IPv4 and IPv6)</span>
			</li>
			<li class="flex items-center gap-2">
				<span class="text-green-500">✓</span>
				<span>URL detection and automatic linking</span>
			</li>
			<li class="flex items-center gap-2">
				<span class="text-green-500">✓</span>
				<span>Combined markdown + formatting in same text</span>
			</li>
		</ul>
	</div>

	<div class="mt-8 text-center">
		<a href="/" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
			← Back to Chat
		</a>
	</div>
</div>

<style>
	:global(.prose) {
		max-width: none;
	}
</style>