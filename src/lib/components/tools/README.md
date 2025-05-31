# Tool Rendering System

This directory contains the modular tool rendering system for the AI Tool Chat application. Each tool has its own Svelte component that handles the display of tool results.

## Architecture

The system consists of:

1. **Individual Tool Components**: Each tool has its own `.svelte` component
2. **Tool Renderer Utility**: Maps tool names to their corresponding components
3. **Tool Renderer Component**: Wrapper component that dynamically renders the appropriate tool
4. **Default Tool Component**: Fallback for unknown tools

## Adding a New Tool Component

To add a new tool component:

1. **Create the component** in this directory:

```svelte
<!-- ExampleTool.svelte -->
<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';

	interface Props {
		toolInvocation: ToolInvocation;
	}

	let { toolInvocation }: Props = $props();

	$: data = toolInvocation.result?.data || toolInvocation.result;
</script>

{#if toolInvocation.state !== 'result'}
	<div class="text-amber-600 italic dark:text-amber-400">
		⏳ Running {toolInvocation.toolName}...
	</div>
{:else}
	<!-- Your tool-specific UI here -->
	<div
		class="my-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-2xl">🛠️</span>
			<h4 class="font-semibold text-emerald-800 dark:text-emerald-200">Example Tool</h4>
		</div>
		<div class="text-sm">
			<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
		</div>
	</div>
{/if}
```

2. **Register the component** in `src/lib/utils/toolRenderer.ts`:

```typescript
import ExampleTool from '../components/tools/ExampleTool.svelte';

const toolComponentMap: Record<string, ComponentType> = {
	// ... existing tools
	example: ExampleTool
};
```

3. **Export the component** in `index.ts`:

```typescript
export { default as ExampleTool } from './ExampleTool.svelte';
```

## Design Guidelines

### Consistent Structure

Each tool component should follow this structure:

1. **Props Interface**: Define props with `ToolInvocation` type
2. **Data Extraction**: Extract data from `toolInvocation.result`
3. **Loading State**: Show loading indicator when `state !== 'result'`
4. **Tool UI**: Render the tool-specific interface

### Styling Guidelines

- Use consistent color schemes for different tool types
- Include appropriate emoji icons for visual identification
- Follow the existing design patterns for borders, padding, and typography
- Ensure dark/light theme compatibility
- Use semantic HTML structure

### Color Schemes by Tool Type

- **Weather**: Blue (`bg-blue-50`, `border-blue-200`, etc.)
- **Calculator**: Green for success, Red for errors
- **Time**: Purple (`bg-purple-50`, `border-purple-200`, etc.)
- **Random**: Orange (`bg-orange-50`, `border-orange-200`, etc.)
- **URL**: Indigo (`bg-indigo-50`, `border-indigo-200`, etc.)
- **Default**: Gray (`bg-gray-50`, `border-gray-200`, etc.)

## Error Handling

Tools should handle different states:

- **Loading**: When `toolInvocation.state !== 'result'`
- **Error**: When `data.error` exists
- **Success**: When tool execution completed successfully

## Data Structure

Tool invocations follow this structure:

```typescript
interface ToolInvocation {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: {
		success: boolean;
		data?: unknown;
		error?: string;
		metadata?: {
			executionTime?: number;
			timestamp: string;
			toolName: string;
		};
	};
	state?: 'result' | 'running';
}
```

## Benefits of This System

1. **Modularity**: Each tool is self-contained
2. **Maintainability**: Easy to update individual tools without affecting others
3. **Extensibility**: Simple to add new tools
4. **Type Safety**: Full TypeScript support
5. **Consistency**: Common interface for all tools
6. **Performance**: No unnecessary re-renders of unrelated tools
