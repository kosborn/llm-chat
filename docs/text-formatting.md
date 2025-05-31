# Text Formatting and Tool Completion Features

## Overview

The chat interface now supports rich text formatting and enhanced tool selection with autocomplete functionality. This includes highlighting of tool mentions and URLs in the chat input.

## Features

### 1. Tool Highlighting

When you type `@toolname` in the chat input, valid tool names will be automatically highlighted with a blue background and rounded styling. Only tools that are actually available in the system will be highlighted.

Example:

- `@weather` - Will be highlighted if the weather tool is available
- `@calculator` - Will be highlighted if the calculator tool is available
- `@invalidtool` - Will NOT be highlighted as it's not a real tool

### 2. URL Highlighting

URLs starting with `http://` or `https://` are automatically detected and highlighted with blue text and underline styling.

Example:

- `https://example.com` - Will be highlighted as a clickable-looking link
- `http://api.openweathermap.org` - Will be highlighted

### 3. Tool Selector with @ Shortcut

Type `@` followed by any characters to open the tool selector popup:

- **Navigation**: Use arrow keys (↑/↓) to navigate through available tools
- **Filtering**: Type characters after `@` to filter tools by name, description, category, or tags
- **Selection**: Press Enter or Tab to select the highlighted tool
- **Autocomplete**: Press Tab to quickly select the first matching tool
- **Close**: Press Escape to close without selecting

Example workflow:

1. Type `@wea` - Opens selector showing weather-related tools
2. Use arrow keys to navigate or press Tab to select the first match
3. The text becomes `@weather ` with proper formatting

### 4. Visual Feedback

- **Focused Input**: Shows plain text for easy editing
- **Blurred Input**: Shows formatted text with highlighting
- **Real-time**: Formatting updates as you type

## Technical Implementation

### Format Rules

The system uses a flexible regex-based formatting system defined in `src/lib/utils/text-formatter.ts`:

```typescript
export const defaultFormatRules: FormatRule[] = [
	{
		pattern: /(https?:\/\/[^\s]+)/g,
		className:
			'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300'
	},
	{
		pattern: /@(\w+)/g,
		className:
			'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded font-medium',
		validate: (match: string) => isValidTool(match.slice(1))
	}
];
```

### Adding Custom Rules

You can extend the formatting system by creating custom rules:

```typescript
import { createCustomRule } from '$lib/utils/text-formatter';

const customRule = createCustomRule(
	/\*\*(.*?)\*\*/g, // Bold text pattern
	'font-bold', // CSS classes
	(match) => true // Optional validation
);
```

### Components

- **FormattedTextInput**: Enhanced textarea with rich text overlay
- **ToolSelector**: Popup tool selection with filtering and keyboard navigation
- **FormattedText**: Display component for formatted text

## Styling

The formatting uses Tailwind CSS classes and supports both light and dark themes:

- **Tool mentions**: Blue background with rounded corners
- **URLs**: Blue text with underline and hover effects
- **Compatible**: Works with existing dark/light theme system

## Keyboard Shortcuts

| Key           | Action                  |
| ------------- | ----------------------- |
| `@`           | Open tool selector      |
| `↑`/`↓`       | Navigate tool selector  |
| `Tab`         | Autocomplete first tool |
| `Enter`       | Select highlighted tool |
| `Escape`      | Close tool selector     |
| `Shift+Enter` | New line in input       |

## Future Extensions

The formatting system is designed to be extensible:

1. **Custom Patterns**: Add new regex patterns for highlighting
2. **Theme Support**: CSS classes support theme customization
3. **Validation**: Optional validation functions for conditional formatting
4. **Performance**: Efficient parsing for real-time updates

## Usage Tips

1. **Tool Discovery**: Use `@` to explore available tools
2. **Quick Selection**: Type partial tool names and use Tab for fast completion
3. **Visual Confirmation**: Check that tool names are highlighted to ensure they're valid
4. **URL Sharing**: URLs are automatically formatted for better readability
