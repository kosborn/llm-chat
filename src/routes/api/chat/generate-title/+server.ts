import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { GROQ_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

const groq = createGroq({
	apiKey: GROQ_API_KEY
});

export async function POST({ request }) {
	try {
		const { userMessage, assistantMessage } = await request.json();

		if (!userMessage || !assistantMessage) {
			return json({ error: 'Both userMessage and assistantMessage are required' }, { status: 400 });
		}

		const result = await generateText({
			model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
			prompt: `Based on this conversation, respond with ONLY a short title (3-50 characters). Do not include any explanations, quotes, or extra text.

User: ${userMessage}
Assistant: ${assistantMessage}

Examples of good titles:
Weather in San Francisco
JavaScript Array Methods
Recipe for Chocolate Cake
Math Problem Solving
Travel Planning Tips

Your title:`,
			temperature: 0.1,
			maxTokens: 15
		});

		let title = result.text.trim();

		// Clean up the title more aggressively
		title = title.replace(/^["']|["']$/g, ''); // Remove quotes
		title = title.replace(/^(Title:|Your title:|Here is|Here's).*?:?\s*/i, ''); // Remove common prefixes
		title = title.replace(/^(a|an|the)\s+/i, ''); // Remove articles at start
		title = title.split('\n')[0]; // Take only first line
		title = title.replace(/[.!?]+$/, ''); // Remove trailing punctuation

		// Ensure it's not too long
		if (title.length > 50) {
			title = `${title.substring(0, 47)}...`;
		}

		// More robust fallback if title is invalid
		if (
			title.length < 3 ||
			title.toLowerCase().includes('chat') ||
			title.toLowerCase().includes('conversation') ||
			title.toLowerCase().includes('title') ||
			title.toLowerCase().includes('here is')
		) {
			// Try to extract key words from user message as fallback
			const userWords = userMessage.split(' ').slice(0, 4).join(' ');
			title = userWords.length > 3 && userWords.length <= 50 ? userWords : 'New Conversation';
		}

		return json({ title });
	} catch (error) {
		console.error('Title generation error:', error);
		return json({ error: 'Failed to generate title' }, { status: 500 });
	}
}
