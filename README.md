# AI Tool Chat

A modern chat application built with SvelteKit 5 and Vercel's AI SDK, featuring custom function calling tools and Groq integration.

## Features

- 🤖 **AI-Powered Chat**: Uses Groq's `meta-llama/llama-4-scout-17b-16e-instruct` model
- 🛠️ **Custom Tools**: Built-in tools for weather, calculations, time, random generation, and URL manipulation
- 💬 **Multiple Chats**: Create and manage separate chat conversations
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🌙 **Dark Mode**: Automatic dark/light theme detection
- 💾 **Local Storage**: Uses IndexedDB for persistent chat history
- ✨ **Markdown Support**: Rich text rendering with syntax highlighting
- 🔄 **Streaming Responses**: Real-time AI response streaming

## Available Tools

- **Weather Tool** 🌤️: Get current weather information for any location
- **Calculator** 🧮: Perform mathematical calculations and computations
- **Time Tool** 🕐: Get current time for any timezone
- **Random Tool** 🎲: Generate random numbers or pick from choices
- **URL Tool** 🔗: Process and validate URLs
- **Text Processor** 📝: Text transformation and analysis operations
- **JSON Formatter** 📋: Format, validate, and manipulate JSON data
- **MaxMind Tool** 🌍: IP geolocation and network information lookup

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- A Groq API key (get one at [console.groq.com](https://console.groq.com))

## Installation

1. **Clone or download the project**

   ```bash
   cd ai-tool-chat
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Copy the `.env.local` file and add your Groq API key:

   ```bash
   # .env.local
   GROQ_API_KEY=your_groq_api_key_here
   ```

## Development

Start the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ChatInterface.svelte    # Main chat interface
│   │   ├── ChatMessage.svelte      # Individual message component
│   │   ├── ChatInput.svelte        # Message input with tool shortcuts
│   │   ├── ChatSidebar.svelte      # Chat list sidebar
│   │   ├── ArchivedChats.svelte    # Archived chats management
│   │   ├── ToolSelector.svelte     # Tool selection dropdown
│   │   ├── ToolsExplorer.svelte    # Tools interface explorer
│   │   ├── ToolRenderer.svelte     # Tool result rendering
│   │   ├── FormattedTextInput.svelte # Rich text input with formatting
│   │   └── FormattedText.svelte    # Formatted text display
│   ├── stores/
│   │   ├── chat-storage.ts         # IndexedDB storage layer
│   │   ├── chat-store.svelte.ts    # Svelte 5 rune-based state management
│   │   └── tool-settings-store.svelte.ts # Tool configuration management
│   ├── tools/
│   │   ├── index.ts                # Main tools entry point
│   │   ├── registry.ts             # Tool discovery and registration
│   │   ├── types.ts                # Tool type definitions
│   │   └── implementations/        # Individual tool implementations
│   │       ├── calculator.ts       # Calculator tool
│   │       ├── weather.ts          # Weather tool
│   │       ├── time.ts             # Time tool
│   │       ├── random.ts           # Random generator tool
│   │       ├── url.ts              # URL processing tool
│   │       ├── text-processor.ts   # Text manipulation tool
│   │       ├── json-formatter.ts   # JSON formatting tool
│   │       └── maxmind.ts          # IP geolocation tool
│   ├── utils/
│   │   ├── markdown.ts             # Markdown rendering utilities
│   │   ├── text-formatter.ts       # Text formatting system
│   │   └── serialization.ts        # Data serialization utilities
│   └── providers/
│       └── index.ts                # AI provider abstractions
├── routes/
│   ├── api/
│   │   ├── chat/
│   │   │   └── +server.ts          # Main chat API endpoint
│   │   └── generate-title/
│   │       └── +server.ts          # Auto-rename API endpoint
│   ├── tools/
│   │   └── +page.svelte            # Tools interface page
│   └── +page.svelte                # Main chat page
└── app.d.ts                        # TypeScript definitions
```

## Usage

1. **Start a New Chat**: Click "New Chat" or "Start Your First Chat"
2. **Send Messages**: Type your message and press Enter or click Send
3. **Use Tools**: Ask the AI to use tools naturally or use @ shortcuts:
   - "What's the weather in New York?" or "@weather New York"
   - "Calculate 25 \* 47 + 12" or "@calculator 25 \* 47 + 12"
   - "What time is it in Tokyo?" or "@time Tokyo"
   - "Pick a random number between 1 and 100" or "@random number 1-100"
   - "Format this JSON data" or "@json-formatter {...}"
   - "Process this text" or "@text-processor ..."
4. **Manage Chats**:
   - Switch between chats in the sidebar
   - Rename chats by clicking the edit icon
   - Archive chats with the archive icon
   - View archived chats in the "Archived" tab
   - Restore archived chats or permanently delete them from the archived section

## Customizing Tools

To add new tools, create a new file in `src/lib/tools/implementations/`:

```typescript
// src/lib/tools/implementations/custom-tool.ts
import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const config: ToolConfig = {
	name: 'custom-tool',
	description: 'Description of what the tool does',
	category: 'utility',
	tags: ['example'],
	version: '1.0.0',
	author: 'System',
	enabled: true
};

const parameters = z.object({
	param: z.string().describe('Parameter description')
});

async function execute({ param }) {
	// Tool implementation
	return { result: 'Tool output' };
}

export const customTool = new BaseTool(config, parameters, execute);
```

Then register it in `src/lib/tools/registry.ts`:

```typescript
import { customTool } from './implementations/custom-tool.js';

const availableTools = [
	// ... existing tools
	customTool
];
```

## Technical Details

- **Frontend**: SvelteKit 5 with TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: Vercel AI SDK with Groq provider
- **Storage**: IndexedDB for local persistence
- **State Management**: Svelte 5 runes
- **Markdown**: Marked.js with custom rendering

## Browser Support

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Any browser with IndexedDB support

## License

MIT License - feel free to use this project as a base for your own AI chat applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

**API Key Issues**: Make sure your Groq API key is correctly set in `.env.local`

**Build Warnings**: The Svelte 5 deprecation warnings are expected and don't affect functionality

**Storage Issues**: Clear browser data if you encounter IndexedDB problems

**Tool Errors**: Check the browser console for detailed error messages

For more help, please open an issue on the repository.
