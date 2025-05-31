// Cost calculator utility using the centralized provider system

import { getProvider, getModel, type ProviderId } from '$lib/providers';

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

	const modelConfig = getModel(provider, model);
	if (!modelConfig) {
		return null;
	}

	const inputCost = (promptTokens / 1000) * modelConfig.inputCostPer1kTokens;
	const outputCost = (completionTokens / 1000) * modelConfig.outputCostPer1kTokens;
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

export function getModelDisplayName(providerId: string, modelId: string): string {
	const modelConfig = getModel(providerId, modelId);
	return modelConfig?.displayName || modelId || 'Unknown Model';
}

export function isFreeProvider(providerId: string): boolean {
	const provider = getProvider(providerId);
	if (!provider) return false;
	return provider.models.every(
		(model) => model.inputCostPer1kTokens === 0 && model.outputCostPer1kTokens === 0
	);
}

export function getSupportedModels(providerId: string): string[] {
	const provider = getProvider(providerId);
	return provider?.models.map((model) => model.id) || [];
}

export function getProviderDisplayName(providerId: string): string {
	const provider = getProvider(providerId);
	return provider?.displayName || providerId || 'Unknown Provider';
}
