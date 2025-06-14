# Tools System Documentation

A modular, extensible tools system for the AI Tool Chat application. This system allows for easy addition, management, and configuration of AI tools.

## Architecture Overview

The tools system is built with modularity and extensibility in mind:

```
src/lib/tools/
├── index.ts              # Main entry point
├── types.ts              # Type definitions and base classes
├── config.ts             # Configuration management
├── registry.ts           # Tool discovery and registration
├── implementations/      # Individual tool implementations
│   ├── weather.ts
│   ├── calculator.ts
│   ├── time.ts
│   ├── random.ts
│   ├── url.ts
│   └── _template.ts      # Template for new tools
└── README.md            # This file
```

## Key Features

- **Modular Design**: Each tool is a separate file for easy maintenance
- **Automatic Discovery**: Tools are automatically registered when imported
- **Configuration Management**: Easy enable/disable and configuration per tool
- **Type Safety**: Full TypeScript support with Zod validation
- **Category System**: Organize tools by category and tags
- **Rate Limiting**: Built-in rate limiting support per tool
- **Error Handling**: Standardized error handling and reporting
- **Network Awareness**: Automatic filtering of network-dependent tools when offline
- **Backward Compatibility**: Maintains compatibility with existing code

## Quick Start

### Using Tools

```typescript
import { toolsRegistry, getAvailableTools } from '$lib/tools';

// Get all available tools
const tools = getAvailableTools();

// Use tools registry directly
const result = await toolsRegistry.weather.execute({
	location: 'New York',
	unit: 'celsius'
});
```

### Getting Tool Information

```typescript
import {
	getToolDescriptions,
	getToolsByCategory,
	getToolStats,
	getOfflineTools,
	getNetworkTools,
	canUseTool
} from '$lib/tools';

// Get all tool descriptions
const descriptions = getToolDescriptions();

// Get tools by category
const utilityTools = getToolsByCategory('utility');

// Get system statistics
const stats = getToolStats();

// Get tools that work offline
const offlineTools = getOfflineTools();

// Get tools that require network
const networkTools = getNetworkTools();

// Check if a specific tool can be used
const canUseWeather = canUseTool('weather');
```

## Creating a New Tool

### Step 1: Create Tool File

Create a new file in `src/lib/tools/implementations/`:

```typescript
// src/lib/tools/implementations/my-tool.ts
import { z } from 'zod';
import { BaseTool, ToolConfig } from '../types.js';

const myToolConfig: ToolConfig = {
	name: 'my-tool',
	description: 'Does something useful',
	category: 'utility',
	version: '1.0.0',
	author: 'Your Name',
	tags: ['example', 'demo'],
	enabled: true,
	requiresNetwork: false // Set to true if tool needs internet connection
};

const myToolParameters = z.object({
	input: z.string().describe('Input text to process'),
	options: z
		.object({
			uppercase: z.boolean().default(false).describe('Convert to uppercase')
		})
		.optional()
});

async function executeMyTool({ input, options }: z.infer<typeof myToolParameters>) {
	const result = options?.uppercase ? input.toUpperCase() : input;

	return {
		input,
		output: result,
		processed: true,
		timestamp: new Date().toISOString()
	};
}

export const myTool = new BaseTool(myToolConfig, myToolParameters, executeMyTool);
```

### Step 2: Register Tool

Add your tool to the registry in `src/lib/tools/registry.ts`:

```typescript
// Add import
import { myTool } from './implementations/my-tool.js';

// Add to availableTools array in the init() method
const availableTools = [
	weatherTool,
	calculatorTool,
	timeTool,
	randomTool,
	urlTool,
	myTool // Add your tool here
];
```

### Step 3: Add Configuration (Optional)

Add configuration in `src/lib/tools/config.ts`:

```typescript
tools: {
  // ... existing tools
  'my-tool': {
    enabled: true,
    timeout: 5000,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000
    }
    // Note: requiresNetwork is defined in the tool implementation, not config
  }
}
```

### Step 4: Export (Optional)

Add export in `src/lib/tools/index.ts`:

```typescript
export { myTool } from './implementations/my-tool.js';
```

## Tool Categories

- **utility**: General utility tools (calculator, time, random)
- **web**: Web-related tools (URL shortener, web scraping)
- **data**: Data processing tools (JSON, CSV, text processing)
- **ai**: AI and ML tools (image processing, text analysis)
- **development**: Development tools (code formatting, API testing)
- **network**: Network-related tools (IP lookup, geolocation)

## Network Requirements

Tools are automatically categorized by their network requirements:

### Offline Compatible Tools

- **calculator**: Mathematical calculations
- **time**: Local time operations
- **random**: Random number/choice generation
- **text-processor**: Text manipulation and analysis
- **json-formatter**: JSON processing and validation

### Network Required Tools

- **weather**: Weather API calls
- **url**: URL shortening services
- **maxmind**: IP geolocation API calls

When the client is offline, only offline-compatible tools will be available.

## Configuration

### Global Configuration

```typescript
import { getToolsConfig, isToolEnabled } from '$lib/tools';

const config = getToolsConfig();

// Check if tools system is enabled
if (config.enabled) {
	// Check if specific tool is enabled
	if (isToolEnabled('weather')) {
		// Use weather tool
	}
}
```

### Tool-Specific Configuration

```typescript
import { getToolTimeout, getToolRateLimit } from '$lib/tools';

// Get tool timeout
const timeout = getToolTimeout('weather'); // Returns number in ms

// Get rate limit settings
const rateLimit = getToolRateLimit('weather'); // Returns { maxRequests, windowMs }
```

### Runtime Configuration

```typescript
import { enableTool, disableTool } from '$lib/tools';

// Enable/disable tools at runtime
enableTool('weather');
disableTool('calculator');
```

## Advanced Usage

### Custom Tool Base Class

```typescript
import { BaseTool } from '$lib/tools';

class CustomTool extends BaseTool {
	constructor(config, parameters, execute) {
		super(config, parameters, execute);
	}

	// Add custom methods
	customMethod() {
		// Custom logic
	}
}
```

### Tool Discovery

```typescript
import { registry } from '$lib/tools';

// Get all tools
const allTools = await registry.scanTools();

// Get tools by category
const webTools = registry.getToolsByCategory('web');

// Get tools by tag
const mathTools = registry.getToolsByTag('math');

// Get tool statistics
const stats = registry.getToolStats();

// Get network-aware tool sets
const offlineTools = registry.getOfflineTools();
const networkTools = registry.getNetworkTools();

// Check if a tool can be used in current network state
const canUse = registry.canUseTool('weather');
```

### Direct Registry Access

```typescript
import { registry } from '$lib/tools';

// Register a tool manually
registry.registerTool(customToolMetadata);

// Unregister a tool
registry.unregisterTool('tool-name');

// Get specific tool
const weatherTool = registry.getToolByName('weather');
```

## Error Handling

Tools automatically wrap execution with error handling:

```typescript
// Tool execution returns standardized format
const result = await tool.execute(params);

if (result.success) {
	console.log('Result:', result.data);
} else {
	console.error('Error:', result.error);
}

// Access metadata
console.log('Execution time:', result.metadata.executionTime);
```

## Best Practices

1. **Naming**: Use kebab-case for tool names
2. **Categories**: Choose appropriate categories for easy discovery
3. **Tags**: Add relevant tags for filtering and search
4. **Validation**: Always validate input parameters with Zod
5. **Error Handling**: Provide clear error messages
6. **Documentation**: Include comprehensive parameter descriptions
7. **Testing**: Test tools thoroughly before deployment
8. **Versioning**: Use semantic versioning for tool updates
9. **Network Requirements**: Accurately specify `requiresNetwork` to ensure proper offline behavior
10. **Graceful Degradation**: Consider offline alternatives when designing network-dependent tools

## Environment Variables

Set environment-specific configurations:

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
TOOLS_MAX_CONCURRENT=3
TOOLS_DEFAULT_TIMEOUT=15000

# API Keys for network-dependent tools
MAXMIND_API_KEY=account:password
WEATHER_API_KEY=your_weather_api_key
```

## Troubleshooting

### Tool Not Available

1. Check if tool is imported in `registry.ts`
2. Verify tool is enabled in configuration
3. Check for import/export errors
4. **Check network status**: Network-dependent tools are disabled when offline
5. Verify `requiresNetwork` property is correctly set in tool configuration

### Tool Execution Fails

1. Check parameter validation
2. Verify tool timeout settings
3. Check rate limiting configuration
4. Review error logs for specific issues
5. **Check network connectivity**: Ensure network-dependent tools have internet access
6. Verify API keys for external services (MaxMind, weather APIs, etc.)

### Performance Issues

1. Adjust `maxConcurrentExecutions` in config
2. Set appropriate timeouts per tool
3. Enable rate limiting for expensive operations
4. Monitor tool execution times

## Migration from Legacy System

The new system maintains backward compatibility:

```typescript
// Old way (still works)
import { toolsRegistry } from '$lib/tools';

// New way (recommended)
import { registry, getToolsByCategory } from 'lib/tools';
```

## Contributing

1. Use the template in `implementations/_template.ts`
2. Follow existing naming conventions
3. Add appropriate tests
4. Update this documentation
5. **Specify network requirements**: Set `requiresNetwork` correctly in tool config
6. Test both online and offline scenarios for network-dependent tools
7. Submit PR with tool description and use cases

## Network Status Service

The tools system integrates with a network status service that:

- Automatically detects online/offline state
- Filters available tools based on network requirements
- Provides real-time updates when connectivity changes
- Offers manual network status checks

```typescript
import { networkStatus } from '$lib/services/network-status.svelte.js';

// Check current status
const isOnline = networkStatus.isOnline;

// Force a network check
await networkStatus.forceCheck();

// Listen for network changes
const cleanup = networkStatus.onNetworkChange((isOnline) => {
	console.log('Network status changed:', isOnline);
});
```
