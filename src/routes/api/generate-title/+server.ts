import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { GROQ_API_KEY } from '$env/static/private';

const groq = createGroq({
	apiKey: GROQ_API_KEY
});

export async function POST({ request }: { request: Request }) {
	try {
		const { userMessage, assistantMessage } = await request.json();

		// Check if API key is available
		if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
			return new Response(
				JSON.stringify({
					error: 'Server API key not configured'
				}),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const result = await generateText({
			model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
			messages: [
				{
					role: 'system',
					content:
						'Generate a concise, descriptive title (3-6 words) for this conversation. Return only the title, no quotes or extra text.'
				},
				{
					role: 'user',
					content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`
				}
			],
			temperature: 0.3,
			maxTokens: 50
		});

		// Get the text from the result
		const title = result.text.trim();

		return new Response(JSON.stringify({ title }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Title generation API error:', error);
		return new Response(JSON.stringify({ error: 'Failed to generate title' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
