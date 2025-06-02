import { providerManager } from '$lib/providers/provider-manager.js';
import type { ProviderId } from '$lib/providers/index.js';
import type {
	ProviderStatus,
	ModelSelection,
	ProviderCapabilities
} from '$lib/providers/provider-manager.js';

class ProviderStore {
	private _status = $state<ProviderStatus | null>(null);
	private _capabilities = $state<ProviderCapabilities | null>(null);
	private _isLoading = $state(false);
	private _error = $state<string | null>(null);

	constructor() {
		// Initialize with current status
		this.refreshStatus();
	}

	// === Reactive State ===

	get status() {
		return this._status;
	}

	get capabilities() {
		return this._capabilities;
	}

	get isLoading() {
		return this._isLoading;
	}

	get error() {
		return this._error;
	}

	get currentProvider(): ProviderId {
		return providerManager.getCurrentProvider();
	}

	get currentModel(): string {
		return providerManager.getCurrentModel();
	}

	get currentSelection(): ModelSelection {
		return providerManager.getCurrentSelection();
	}

	get canSend(): boolean {
		return this._status?.canSend ?? false;
	}

	get hasValidApiKey(): boolean {
		return this._status?.isValidApiKey ?? false;
	}

	get isServerAvailable(): boolean {
		return this._status?.isServerAvailable ?? false;
	}

	get isUsingClientMode(): boolean {
		return this._status?.isUsingClientMode ?? false;
	}

	get currentMode(): 'server' | 'client' | 'offline' {
		return providerManager.getCurrentMode();
	}

	get preferredMode(): import('$lib/providers/provider-manager').ModePreference {
		return providerManager.getPreferredMode();
	}

	get effectiveMode(): 'server' | 'client' | 'offline' {
		return providerManager.getEffectiveMode();
	}

	// === Mode Preference Management ===

	setPreferredMode(mode: import('$lib/providers/provider-manager').ModePreference) {
		providerManager.setPreferredMode(mode);
		this.refreshStatus();
	}

	// === Provider Management ===

	async setProvider(provider: ProviderId, model?: string) {
		this._isLoading = true;
		this._error = null;

		try {
			providerManager.setCurrentProvider(provider, model);
			await this.refreshStatus();
		} catch (error) {
			this._error = error instanceof Error ? error.message : 'Failed to set provider';
		} finally {
			this._isLoading = false;
		}
	}

	async setModel(model: string) {
		const currentProvider = providerManager.getCurrentProvider();

		if (!providerManager.isValidModelForProvider(currentProvider, model)) {
			this._error = `Model ${model} is not valid for provider ${currentProvider}`;
			return;
		}

		this._isLoading = true;
		this._error = null;

		try {
			providerManager.setCurrentProvider(currentProvider, model);
			await this.refreshStatus();
		} catch (error) {
			this._error = error instanceof Error ? error.message : 'Failed to set model';
		} finally {
			this._isLoading = false;
		}
	}

	// === API Key Management ===

	setApiKey(provider: ProviderId, apiKey: string) {
		this._error = null;

		try {
			providerManager.setApiKey(provider, apiKey);
			this.refreshStatus();
		} catch (error) {
			this._error = error instanceof Error ? error.message : 'Failed to set API key';
		}
	}

	clearApiKey(provider?: ProviderId) {
		providerManager.clearApiKey(provider);
		this.refreshStatus();
	}

	clearAllApiKeys() {
		providerManager.clearAllApiKeys();
		this.refreshStatus();
	}

	getApiKey(provider?: ProviderId): string | null {
		return providerManager.getApiKey(provider);
	}

	validateApiKey(apiKey: string, provider: ProviderId): boolean {
		return providerManager.validateApiKeyFormat(apiKey, provider);
	}

	// === Provider Information ===

	getAllProviders() {
		return providerManager.getAllProviders();
	}

	getProvider(provider: ProviderId) {
		return providerManager.getProvider(provider);
	}

	getProviderDisplayName(provider: ProviderId): string {
		return providerManager.getProviderDisplayName(provider);
	}

	getAvailableModels(provider: ProviderId) {
		return providerManager.getAvailableModels(provider);
	}

	getModelDisplayName(provider: ProviderId, model: string): string {
		return providerManager.getModelDisplayName(provider, model);
	}

	isValidModelForProvider(provider: ProviderId, model: string): boolean {
		return providerManager.isValidModelForProvider(provider, model);
	}

	getDefaultModelForProvider(provider: ProviderId): string {
		return providerManager.getDefaultModelForProvider(provider);
	}

	// === Cost Calculation ===

	calculateCost(
		provider: ProviderId,
		model: string,
		inputTokens: number,
		outputTokens: number
	): number {
		return providerManager.calculateCost(provider, model, inputTokens, outputTokens);
	}

	formatCost(cost: number): string {
		return providerManager.formatCost(cost);
	}

	isProviderFree(provider: ProviderId): boolean {
		return providerManager.isProviderFree(provider);
	}

	// === Server Capabilities ===

	async checkServerAvailability(): Promise<boolean> {
		return await providerManager.checkServerAvailability();
	}

	getServerAvailableProviders(): ProviderId[] {
		return providerManager.getServerAvailableProviders();
	}

	getClientAvailableProviders(): ProviderId[] {
		return providerManager.getClientAvailableProviders();
	}

	// === Provider Selection ===

	selectBestProvider(requestedProvider?: ProviderId): ProviderId | null {
		return providerManager.selectBestProvider(requestedProvider);
	}

	getFallbackProvider(currentProvider: ProviderId): ProviderId | null {
		return providerManager.getFallbackProvider(currentProvider);
	}

	// === Status Management ===

	async refreshStatus() {
		this._isLoading = true;
		this._error = null;

		try {
			const [status, capabilities] = await Promise.all([
				providerManager.getProviderStatus(),
				providerManager.getCapabilities()
			]);

			this._status = status;
			this._capabilities = capabilities;
		} catch (error) {
			this._error = error instanceof Error ? error.message : 'Failed to refresh status';
		} finally {
			this._isLoading = false;
		}
	}

	async getProviderStatus(provider?: ProviderId, model?: string): Promise<ProviderStatus> {
		return await providerManager.getProviderStatus(provider, model);
	}

	// === Utilities ===

	validateConfiguration() {
		return providerManager.validateConfiguration();
	}

	getDebugInfo() {
		return providerManager.getDebugInfo();
	}

	reset() {
		providerManager.reset();
		this.refreshStatus();
	}

	// === Provider Instances ===

	getClientProviderInstance(provider: ProviderId) {
		return providerManager.getClientProviderInstance(provider);
	}

	// Server instance only available server-side
	getServerProviderInstance(provider: ProviderId) {
		return providerManager.getServerProviderInstance(provider);
	}

	// === Mode Detection ===

	getModeDisplayName(): string {
		const mode = this.currentMode;
		switch (mode) {
			case 'server':
				return 'Server AI';
			case 'client':
				return 'Browser Client';
			case 'offline':
				return 'Offline';
			default:
				return 'Unknown';
		}
	}

	// === Backward Compatibility ===

	get provider(): ProviderId {
		return this.currentProvider;
	}

	get model(): string {
		return this.currentModel;
	}

	get isConfigured(): boolean {
		return this.hasValidApiKey || this.isServerAvailable;
	}

	getProviderName(): string {
		return this.getProviderDisplayName(this.currentProvider);
	}

	getModelForProvider(provider?: ProviderId): string {
		const targetProvider = provider || this.currentProvider;
		if (targetProvider === this.currentProvider) {
			return this.currentModel;
		}
		return this.getDefaultModelForProvider(targetProvider);
	}
}

// Create singleton instance
export const providerStore = new ProviderStore();
