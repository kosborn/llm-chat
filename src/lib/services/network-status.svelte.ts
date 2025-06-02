import { browser } from '$app/environment';

class NetworkStatusService {
	private _isOnline = $state(true);
	private _lastCheck = $state<Date | null>(null);
	private _checkInterval: number | null = null;

	constructor() {
		if (browser) {
			this.initialize();
		}
	}

	get isOnline() {
		return this._isOnline;
	}

	get isOffline() {
		return !this._isOnline;
	}

	get lastCheck() {
		return this._lastCheck;
	}

	private initialize() {
		// Initial status from navigator
		this._isOnline = navigator.onLine;

		// Listen for online/offline events
		window.addEventListener('online', this.handleOnline.bind(this));
		window.addEventListener('offline', this.handleOffline.bind(this));

		// Start periodic checks
		this.startPeriodicChecks();

		// Initial check
		this.checkNetworkStatus();
	}

	private handleOnline() {
		this._isOnline = true;
		this._lastCheck = new Date();
		this.dispatchNetworkEvent('online');
	}

	private handleOffline() {
		this._isOnline = false;
		this._lastCheck = new Date();
		this.dispatchNetworkEvent('offline');
	}

	private startPeriodicChecks() {
		// Check every 30 seconds
		this._checkInterval = window.setInterval(() => {
			this.checkNetworkStatus();
		}, 30000);
	}

	private async checkNetworkStatus() {
		if (!browser) return;

		try {
			// Try to fetch a small resource to verify actual connectivity
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const response = await fetch('/api/health', {
				method: 'HEAD',
				signal: controller.signal,
				cache: 'no-cache'
			});

			clearTimeout(timeoutId);

			const wasOnline = this._isOnline;
			this._isOnline = response.ok;
			this._lastCheck = new Date();

			// Dispatch event if status changed
			if (wasOnline !== this._isOnline) {
				this.dispatchNetworkEvent(this._isOnline ? 'online' : 'offline');
			}
		} catch {
			const wasOnline = this._isOnline;
			this._isOnline = false;
			this._lastCheck = new Date();

			// Only dispatch if we were previously online
			if (wasOnline) {
				this.dispatchNetworkEvent('offline');
			}
		}
	}

	private dispatchNetworkEvent(type: 'online' | 'offline') {
		if (browser) {
			window.dispatchEvent(
				new CustomEvent(`network-${type}`, {
					detail: {
						isOnline: this._isOnline,
						timestamp: this._lastCheck
					}
				})
			);
		}
	}

	async forceCheck(): Promise<boolean> {
		await this.checkNetworkStatus();
		return this._isOnline;
	}

	destroy() {
		if (browser) {
			window.removeEventListener('online', this.handleOnline.bind(this));
			window.removeEventListener('offline', this.handleOffline.bind(this));

			if (this._checkInterval) {
				clearInterval(this._checkInterval);
				this._checkInterval = null;
			}
		}
	}

	// Method to check if a specific URL is reachable
	async checkUrl(url: string, timeout = 5000): Promise<boolean> {
		if (!browser || !this._isOnline) return false;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				method: 'HEAD',
				signal: controller.signal,
				cache: 'no-cache'
			});

			clearTimeout(timeoutId);
			return response.ok;
		} catch {
			return false;
		}
	}

	// Method to register a callback for network status changes
	onNetworkChange(callback: (isOnline: boolean) => void) {
		if (!browser) return () => {};

		const handleOnline = () => callback(true);
		const handleOffline = () => callback(false);

		window.addEventListener('network-online', handleOnline);
		window.addEventListener('network-offline', handleOffline);

		return () => {
			window.removeEventListener('network-online', handleOnline);
			window.removeEventListener('network-offline', handleOffline);
		};
	}
}

// Create singleton instance
export const networkStatus = new NetworkStatusService();
