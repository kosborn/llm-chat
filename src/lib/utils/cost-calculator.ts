// Cost calculator utility for different AI providers and models

interface ModelPricing {
	inputCostPer1kTokens: number; // Cost per 1000 input tokens
	outputCostPer1kTokens: number; // Cost per 1000 output tokens
}

interface ProviderPricing {
	[model: string]: ModelPricing;
}

// Pricing data as of 2024 (in USD)
const PRICING_DATA: Record<string, ProviderPricing> = {
	openai: {
		'gpt-4o': {
			inputCostPer1kTokens: 0.005,
			outputCostPer1kTokens: 0.015
		},
		'gpt-4o-mini': {
			inputCostPer1kTokens: 0.00015,
			outputCostPer1kTokens: 0.0006
		},
		'gpt-4-turbo': {
			inputCostPer1kTokens: 0.01,
			outputCostPer1kTokens: 0.03
		},
		'gpt-4': {
			inputCostPer1kTokens: 0.03,
			outputCostPer1kTokens: 0.06
		},
		'gpt-3.5-turbo': {
			inputCostPer1kTokens: 0.0015,
			outputCostPer1kTokens: 0.002
		}
	},
	anthropic: {
		'claude-3-5-sonnet-20241022': {
			inputCostPer1kTokens: 0.003,
			outputCostPer1kTokens: 0.015
		},
		'claude-3-5-sonnet-20240620': {
			inputCostPer1kTokens: 0.003,
			outputCostPer1kTokens: 0.015
		},
		'claude-3-opus-20240229': {
			inputCostPer1kTokens: 0.015,
			outputCostPer1kTokens: 0.075
		},
		'claude-3-sonnet-20240229': {
			inputCostPer1kTokens: 0.003,
			outputCostPer1kTokens: 0.015
		},
		'claude-3-haiku-20240307': {
			inputCostPer1kTokens: 0.00025,
			outputCostPer1kTokens: 0.00125
		}
	},
	groq: {
		'llama-3.1-405b-reasoning': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'llama-3.1-70b-versatile': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'llama-3.1-8b-instant': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'llama3-groq-70b-8192-tool-use-preview': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'llama3-groq-8b-8192-tool-use-preview': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'mixtral-8x7b-32768': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'gemma2-9b-it': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		},
		'gemma-7b-it': {
			inputCostPer1kTokens: 0.0,
			outputCostPer1kTokens: 0.0
		}
	}
};

export interface CostCalculation {
	inputCost: number;
	outputCost: number;
	totalCost: number;
	currency: string;
}

export function calculateCost(
	provider: string,
	model: string,
	promptTokens: number = 0,
	completionTokens: number = 0
): CostCalculation | null {
	if (!provider || !model) {
		return null;
	}

	const providerData = PRICING_DATA[provider.toLowerCase()];
	if (!providerData) {
		return null;
	}

	const modelData = providerData[model];
	if (!modelData) {
		return null;
	}

	const inputCost = (promptTokens / 1000) * modelData.inputCostPer1kTokens;
	const outputCost = (completionTokens / 1000) * modelData.outputCostPer1kTokens;
	const totalCost = inputCost + outputCost;

	return {
		inputCost: Number(inputCost.toFixed(6)),
		outputCost: Number(outputCost.toFixed(6)),
		totalCost: Number(totalCost.toFixed(6)),
		currency: 'USD'
	};
}

export function formatCost(cost: number, currency: string = 'USD'): string {
	if (cost === 0) {
		return 'Free';
	}

	if (cost < 0.000001) {
		return '< $0.000001';
	}

	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 6,
		maximumFractionDigits: 6
	}).format(cost);
}

export function getModelDisplayName(provider: string, model: string): string {
	if (!provider || !model) {
		return model || 'Unknown Model';
	}

	const displayNames: Record<string, Record<string, string>> = {
		openai: {
			'gpt-4o': 'GPT-4o',
			'gpt-4o-mini': 'GPT-4o Mini',
			'gpt-4-turbo': 'GPT-4 Turbo',
			'gpt-4': 'GPT-4',
			'gpt-3.5-turbo': 'GPT-3.5 Turbo'
		},
		anthropic: {
			'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Oct 2024)',
			'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet (Jun 2024)',
			'claude-3-opus-20240229': 'Claude 3 Opus',
			'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
			'claude-3-haiku-20240307': 'Claude 3 Haiku'
		},
		groq: {
			'llama-3.1-405b-reasoning': 'Llama 3.1 405B',
			'llama-3.1-70b-versatile': 'Llama 3.1 70B',
			'llama-3.1-8b-instant': 'Llama 3.1 8B',
			'llama3-groq-70b-8192-tool-use-preview': 'Llama 3 70B (Tool Use)',
			'llama3-groq-8b-8192-tool-use-preview': 'Llama 3 8B (Tool Use)',
			'mixtral-8x7b-32768': 'Mixtral 8x7B',
			'gemma2-9b-it': 'Gemma 2 9B',
			'gemma-7b-it': 'Gemma 7B'
		}
	};

	return displayNames[provider.toLowerCase()]?.[model] || model;
}

export function isFreeProvider(provider: string): boolean {
	return provider ? provider.toLowerCase() === 'groq' : false;
}

export function getSupportedModels(provider: string): string[] {
	if (!provider) return [];
	const providerData = PRICING_DATA[provider.toLowerCase()];
	return providerData ? Object.keys(providerData) : [];
}

export function getProviderDisplayName(provider: string): string {
	if (!provider) return 'Unknown Provider';

	const displayNames: Record<string, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		groq: 'Groq'
	};

	return displayNames[provider.toLowerCase()] || provider;
}
