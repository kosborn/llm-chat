# Enhanced Debug JSON Formatting

## Overview

The debug interface now includes enhanced formatting for raw stream data containing encoded JSON. This feature automatically detects and pretty-prints JSON objects within debug messages, making them much easier to read and analyze.

## Features

### Automatic JSON Detection

- Detects patterns like `e:{...}` and `d:{...}` (common in streaming responses)
- Handles standalone JSON objects within strings
- Processes each line separately for better formatting

### Pretty Printing

- Converts minified JSON to properly indented, readable format
- Preserves original structure while improving readability
- Handles nested objects and arrays correctly

### Error Handling

- Gracefully handles malformed JSON
- Falls back to original content if parsing fails
- Never breaks the debug interface due to parsing errors

## Examples

### Before Enhancement

```
{
  "chunk": "e:{\"finishReason\":\"stop\",\"usage\":{\"promptTokens\":688,\"completionTokens\":10},\"isContinued\":false}\nd:{\"finishReason\":\"stop\",\"usage\":{\"promptTokens\":688,\"completionTokens\":10}}\n"
}
```

### After Enhancement

```
{
  "chunk": "e:\n  {\n    \"finishReason\": \"stop\",\n    \"usage\": {\n      \"promptTokens\": 688,\n      \"completionTokens\": 10\n    },\n    \"isContinued\": false\n  }\nd:\n  {\n    \"finishReason\": \"stop\",\n    \"usage\": {\n      \"promptTokens\": 688,\n      \"completionTokens\": 10\n    }\n  }\n"
}
```

## Supported Patterns

### Stream Data Patterns

- `e:{json}` - Event data with JSON payload
- `d:{json}` - Data with JSON payload
- `0:{json}` - Text delta data
- `2:{json}` - Tool call data
- `3:{json}` - Tool result data

### Standalone JSON

- Any `{...}` pattern within a string
- Nested objects and arrays
- Complex data structures

## Usage

The formatting happens automatically in the debug interface when:

1. Debug mode is enabled (Ctrl/Cmd + D)
2. Raw stream data is captured
3. The data contains a `chunk` property with encoded JSON

## Technical Implementation

The enhancement is implemented in the `formatData` function within `DebugInterface.svelte`:

- Line-by-line processing for better accuracy
- Regex pattern matching for stream formats
- JSON.parse() with fallback error handling
- Proper indentation and formatting

## Benefits

1. **Improved Readability**: JSON data is now properly formatted and indented
2. **Better Debugging**: Easier to identify issues in stream data
3. **Developer Experience**: Reduces time spent manually formatting JSON
4. **Robust Error Handling**: Never breaks even with malformed data

## Performance Considerations

- Processing only occurs when debug mode is active
- Minimal performance impact on production usage
- Efficient regex patterns for pattern matching
- Graceful degradation for parsing failures
