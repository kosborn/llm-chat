import {
	filterEmptyMessages,
	prepareMessagesForLLM,
	filterEmptyContentBlocks
} from './message-filter.js';
import type { ChatMessage } from '../../app.d.ts';

// Example messages with empty content that should be filtered
const exampleMessages: ChatMessage[] = [
	{
		id: '1',
		role: 'user',
		content: 'Hello, how can you help me?',
		timestamp: Date.now()
	},
	{
		id: '2',
		role: 'assistant',
		content: '',
		timestamp: Date.now()
	},
	{
		id: '3',
		role: 'user',
		content: '   \n\t  ',
		timestamp: Date.now()
	},
	{
		id: '4',
		role: 'assistant',
		content: 'I can help you with various tasks!',
		timestamp: Date.now()
	},
	{
		id: '5',
		role: 'user',
		content: [
			{ type: 'text', text: 'What about images?' },
			{ type: 'text', text: '' },
			{ type: 'image', url: 'example.jpg' }
		] as any,
		timestamp: Date.now()
	},
	{
		id: '6',
		role: 'assistant',
		content: [
			{ type: 'text', text: '' },
			{ type: 'text', text: '   ' }
		] as any,
		timestamp: Date.now()
	}
];

export function demonstrateFiltering() {
	console.log('=== Message Filtering Demonstration ===\n');

	console.log('Original messages:');
	exampleMessages.forEach((msg, index) => {
		console.log(`${index + 1}. ${msg.role}: ${JSON.stringify(msg.content)}`);
	});

	console.log('\n--- After filtering empty messages ---');
	const filtered = filterEmptyMessages(exampleMessages);
	filtered.forEach((msg, index) => {
		console.log(`${index + 1}. ${msg.role}: ${JSON.stringify(msg.content)}`);
	});

	console.log('\n--- Prepared for LLM (AI SDK format) ---');
	const prepared = prepareMessagesForLLM(exampleMessages);
	prepared.forEach((msg, index) => {
		console.log(`${index + 1}. ${msg.role}: ${JSON.stringify(msg.content)}`);
	});

	console.log('\n--- Content block filtering example ---');
	const mixedContent = [
		{ type: 'text', text: 'Valid text' },
		{ type: 'text', text: '' },
		{ type: 'image', url: 'photo.jpg' },
		{ type: 'text', text: '   \n  ' },
		{ type: 'text', text: 'Another valid text' }
	];

	console.log('Before filtering:', JSON.stringify(mixedContent, null, 2));
	const filteredContent = filterEmptyContentBlocks(mixedContent);
	console.log('After filtering:', JSON.stringify(filteredContent, null, 2));

	return {
		original: exampleMessages.length,
		filtered: filtered.length,
		prepared: prepared.length,
		savings: `${Math.round(((exampleMessages.length - filtered.length) / exampleMessages.length) * 100)}% reduction in empty messages`
	};
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
	(window as any).demonstrateMessageFiltering = demonstrateFiltering;
}
