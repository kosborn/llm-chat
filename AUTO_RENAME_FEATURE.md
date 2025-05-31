# Auto-Rename Feature

## Overview

The auto-rename feature automatically generates descriptive titles for chat conversations using AI, eliminating the need for generic "New Chat" titles and improving chat organization.

## How It Works

### Automatic Renaming

- **Trigger**: After the first AI assistant response is completed (when a chat has exactly 2 messages: 1 user + 1 assistant)
- **Condition**: Applies to chats with default "New Chat" title OR malformed titles (e.g., containing "Here is a short, descriptive title..." or excessively long titles)
- **AI Model**: Uses Groq's Llama 4 Scout model to generate titles
- **Length**: Titles are limited to 50 characters maximum
- **Smart Detection**: Automatically detects and fixes problematic AI-generated titles

### Manual Regeneration

- **Access**: Hover over any chat in the sidebar to reveal action buttons
- **Icon**: Refresh/regenerate icon (↻) appears for chats with 2+ messages
- **Usage**: Click the regenerate button to create a new AI-generated title
- **Force**: Works on any chat regardless of current title

## User Experience

### Visual Indicators

- **Auto-renaming in progress**: Small spinner with "Renaming..." text appears next to chat title
- **Success notification**: Toast notification shows "Chat renamed to '[new title]'" for 2 seconds
- **Action buttons**: Edit and regenerate buttons are hidden during auto-renaming process

### Manual Title Editing

- **Preserved functionality**: Users can still manually rename chats by clicking the edit (pencil) icon
- **Priority**: Manual edits take precedence over auto-renaming
- **Keyboard shortcuts**: Enter to save, Escape to cancel

## Technical Implementation

### API Endpoint

- **Route**: `/api/chat/generate-title`
- **Method**: POST
- **Input**: User message and assistant response content
- **Output**: Generated title (max 50 characters)

### Error Handling

- **Graceful degradation**: If title generation fails, chat retains original title
- **Silent failures**: Auto-renaming errors don't interrupt chat functionality
- **Robust fallback**: Multiple fallback strategies including extracting key words from user message
- **Smart filtering**: Automatically detects and rejects invalid titles containing generic phrases like "chat", "conversation", "title", or "here is"
- **Clean formatting**: Removes common AI response prefixes, quotes, and trailing punctuation

### Performance

- **Non-blocking**: Title generation happens asynchronously
- **Efficient**: Uses lightweight text generation (not streaming)
- **Smart timing**: 500ms delay ensures message is fully saved before renaming

## Benefits

1. **Better Organization**: Descriptive titles make it easier to find specific conversations
2. **Automatic**: No user intervention required for basic use cases
3. **Flexible**: Users can regenerate or manually edit titles as needed
4. **Context-Aware**: AI analyzes actual conversation content to create relevant titles
5. **User-Friendly**: Clear visual feedback and intuitive controls
6. **Self-Healing**: Automatically detects and fixes malformed titles from previous AI responses
7. **Reliable**: Enhanced error handling and fallback mechanisms ensure consistent results

## Configuration

The feature uses optimized Groq API configuration for title generation:

- **Model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Temperature**: 0.1 (for highly consistent, focused titles)
- **Max Tokens**: 15 (optimized for concise titles)
- **Enhanced Prompt**: More explicit instructions to prevent verbose responses

## Examples

**Input Conversation:**

- User: "What's the weather like in San Francisco today?"
- Assistant: "The current weather in San Francisco is sunny with a temperature of 72°F..."

**Generated Title:** "Weather in San Francisco"

**Input Conversation:**

- User: "How do I sort an array in JavaScript?"
- Assistant: "Here are several ways to sort arrays in JavaScript..."

**Generated Title:** "JavaScript Array Sorting"
