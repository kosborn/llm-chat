# Tool Shortcuts Documentation

## @ Shortcut Feature

The chat interface now supports an @ shortcut system that allows you to quickly select and invoke specific tools in your messages.

## How to Use

1. **Type @ symbol**: Start typing `@` in the chat input field
2. **Browse tools**: A dropdown will appear showing all available tools
3. **Filter tools**: Continue typing after `@` to filter tools by name, description, category, or tags
4. **Select tool**: Use arrow keys to navigate or click to select a tool
5. **Auto-complete**: The selected tool name will be inserted into your message

## Example Usage

```
@calculator 2 + 3 * 4
@weather New York
@time current timezone
@random number between 1 and 100
```

## Available Tools

The system includes several built-in tools organized by category:

### Utility Tools 🔧

- **calculator**: Perform mathematical calculations
- **time**: Get current time and date information
- **random**: Generate random numbers or selections

### Web Tools 🌐

- **url**: Process and validate URLs
- **weather**: Get weather information for locations

### Data Tools 📊

- **text-processor**: Process and manipulate text
- **json-formatter**: Format and validate JSON data

## Keyboard Navigation

- **↑/↓ Arrow Keys**: Navigate through tool options
- **Enter**: Select the highlighted tool
- **Escape**: Close the tool selector
- **Continue typing**: Filter tools in real-time

## Visual Features

- **Category grouping**: Tools are organized by category with icons
- **Real-time filtering**: Results update as you type
- **Tag display**: Shows relevant tags for each tool
- **Keyboard indicators**: Clear visual feedback for selected items
- **Bottom-anchored positioning**: Popup grows upward from cursor position for stability
- **Responsive sizing**: Becomes more compact when fewer tools match
- **Smart height adjustment**: Dynamically adjusts height based on available space above cursor

## Integration

The @ shortcut seamlessly integrates with the existing chat interface:

- Maintains message history and context
- Works with offline queue system
- Respects API key configuration
- Compatible with dark/light themes

## Technical Details

- Tools are loaded from the registry system
- Only enabled tools appear in the selector
- Filtering searches across name, description, category, and tags
- Position calculated once relative to input field with viewport boundary detection
- Bottom-anchored positioning prevents jumping while filtering
- Height dynamically adjusts to available space above cursor while maintaining position
- Accessible keyboard navigation support
- Optimized for upward growth from cursor position using CSS transform
