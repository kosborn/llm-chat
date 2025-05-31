import { json } from '@sveltejs/kit';
import { getSupportedModels } from '$lib/utils/cost-calculator.js';

export async function GET({ url }) {
	const provider = url.searchParams.get('provider');

	if (!provider) {
		return json(
			{
				error: 'Provider parameter is required'
			},
			{ status: 400 }
		);
	}

	const models = getSupportedModels(provider);

	if (models.length === 0) {
		return json(
			{
				error: `No models found for provider: ${provider}`
			},
			{ status: 404 }
		);
	}

	return json({
		provider,
		models
	});
}

export async function POST() {
	// Return all providers and their models
	const allModels = {
		groq: getSupportedModels('groq'),
		openai: getSupportedModels('openai'),
		anthropic: getSupportedModels('anthropic')
	};

	return json(allModels);
}
