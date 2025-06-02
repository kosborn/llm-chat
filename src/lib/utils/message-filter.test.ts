import { describe, it, expect } from 'vitest';
import {
	filterEmptyMessages,
	prepareMessagesForLLM,
	filterEmptyContentBlocks
} from './message-filter.js';
import type { ChatMessage } from '../../app.d.ts';

describe('message-filter', () => {
	describe('filterEmptyMessages', () => {
		it('should filter out messages with empty string content', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: 'Hello world',
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
					content: 'How are you?',
					timestamp: Date.now()
				}
			];

			const filtered = filterEmptyMessages(messages);
			expect(filtered).toHaveLength(2);
			expect(filtered[0].content).toBe('Hello world');
			expect(filtered[1].content).toBe('How are you?');
		});

		it('should filter out messages with whitespace-only content', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: 'Valid message',
					timestamp: Date.now()
				},
				{
					id: '2',
					role: 'assistant',
					content: '   \n\t  ',
					timestamp: Date.now()
				}
			];

			const filtered = filterEmptyMessages(messages);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].content).toBe('Valid message');
		});

		it('should filter out messages with null or undefined content', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: 'Valid message',
					timestamp: Date.now()
				},
				{
					id: '2',
					role: 'assistant',
					content: null as any,
					timestamp: Date.now()
				},
				{
					id: '3',
					role: 'system',
					content: undefined as any,
					timestamp: Date.now()
				}
			];

			const filtered = filterEmptyMessages(messages);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].content).toBe('Valid message');
		});

		it('should handle array content and filter empty text blocks', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: [
						{ type: 'text', text: 'Hello' },
						{ type: 'text', text: '' },
						{ type: 'image', url: 'test.jpg' }
					] as any,
					timestamp: Date.now()
				},
				{
					id: '2',
					role: 'assistant',
					content: [
						{ type: 'text', text: '' },
						{ type: 'text', text: '   ' }
					] as any,
					timestamp: Date.now()
				}
			];

			const filtered = filterEmptyMessages(messages);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('1');
		});

		it('should keep messages with non-text content blocks', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: [{ type: 'image', url: 'test.jpg' }] as any,
					timestamp: Date.now()
				}
			];

			const filtered = filterEmptyMessages(messages);
			expect(filtered).toHaveLength(1);
		});
	});

	describe('prepareMessagesForLLM', () => {
		it('should convert ChatMessage format to AI SDK format', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: 'Hello',
					timestamp: Date.now()
				},
				{
					id: '2',
					role: 'assistant',
					content: 'Hi there',
					timestamp: Date.now()
				}
			];

			const prepared = prepareMessagesForLLM(messages);
			expect(prepared).toHaveLength(2);
			expect(prepared[0]).toEqual({
				role: 'user',
				content: 'Hello'
			});
			expect(prepared[1]).toEqual({
				role: 'assistant',
				content: 'Hi there'
			});
		});

		it('should filter empty messages during conversion', () => {
			const messages: ChatMessage[] = [
				{
					id: '1',
					role: 'user',
					content: 'Hello',
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
					content: 'Still here?',
					timestamp: Date.now()
				}
			];

			const prepared = prepareMessagesForLLM(messages);
			expect(prepared).toHaveLength(2);
			expect(prepared[0].content).toBe('Hello');
			expect(prepared[1].content).toBe('Still here?');
		});
	});

	describe('filterEmptyContentBlocks', () => {
		it('should filter out empty text blocks', () => {
			const content = [
				{ type: 'text', text: 'Hello' },
				{ type: 'text', text: '' },
				{ type: 'text', text: '   ' },
				{ type: 'image', url: 'test.jpg' },
				{ type: 'text', text: 'World' }
			];

			const filtered = filterEmptyContentBlocks(content);
			expect(filtered).toHaveLength(3);
			expect(filtered[0]).toEqual({ type: 'text', text: 'Hello' });
			expect(filtered[1]).toEqual({ type: 'image', url: 'test.jpg' });
			expect(filtered[2]).toEqual({ type: 'text', text: 'World' });
		});

		it('should keep non-text blocks regardless of content', () => {
			const content = [
				{ type: 'image', url: '' },
				{ type: 'audio', data: null },
				{ type: 'video' }
			];

			const filtered = filterEmptyContentBlocks(content);
			expect(filtered).toHaveLength(3);
		});

		it('should handle text blocks without text property', () => {
			const content = [
				{ type: 'text' },
				{ type: 'text', text: undefined },
				{ type: 'text', text: 'Valid' }
			];

			const filtered = filterEmptyContentBlocks(content as any);
			expect(filtered).toHaveLength(1);
			expect(filtered[0]).toEqual({ type: 'text', text: 'Valid' });
		});
	});
});
