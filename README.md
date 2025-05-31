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
- **URL Tool** 🔗: Shorten or expand URLs (mock implementation)

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
│   │   ├── ChatInput.svelte        # Message input component
│   │   └── ChatSidebar.svelte      # Chat list sidebar
│   ├── stores/
│   │   ├── chat-storage.ts         # IndexedDB storage layer
│   │   └── chat-store.svelte.ts    # Svelte 5 rune-based state management
│   ├── tools/
│   │   └── index.ts                # Custom AI tools registry
│   └── utils/
│       └── markdown.ts             # Markdown rendering utilities
├── routes/
│   ├── api/
│   │   └── chat/
│   │       └── +server.ts          # Groq API endpoint
│   └── +page.svelte                # Main page
└── app.d.ts                        # TypeScript definitions
```

## Usage

1. **Start a New Chat**: Click "New Chat" or "Start Your First Chat"
2. **Send Messages**: Type your message and press Enter or click Send
3. **Use Tools**: Ask the AI to use tools naturally:
   - "What's the weather in New York?"
   - "Calculate 25 \* 47 + 12"
   - "What time is it in Tokyo?"
   - "Pick a random number between 1 and 100"
4. **Manage Chats**:
   - Switch between chats in the sidebar
   - Rename chats by clicking the edit icon
   - Archive chats with the archive icon
   - View archived chats in the "Archived" tab
   - Restore archived chats or permanently delete them from the archived section

## Customizing Tools

To add new tools, edit `src/lib/tools/index.ts`:

```typescript
export const customTool = tool({
	description: 'Description of what the tool does',
	parameters: z.object({
		param: z.string().describe('Parameter description')
	}),
	execute: async ({ param }) => {
		// Tool implementation
		return { result: 'Tool output' };
	}
});

// Add to registry
export const toolsRegistry = {
	// ... existing tools
	custom: customTool
};
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
