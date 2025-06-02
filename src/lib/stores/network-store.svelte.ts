import { browser } from '$app/environment';

import { debugConsole } from '../utils/console.js';

class NetworkStore {
	isOnline = $state(true);
	isOffline = $state(false);

	constructor() {
		if (browser) {
			this.init();
		}
	}

	private init(): void {
		// Set initial state
		this.updateNetworkStatus();

		// Listen for network changes
		window.addEventListener('online', this.handleOnline.bind(this));
		window.addEventListener('offline', this.handleOffline.bind(this));

		// Periodic connectivity check
		setInterval(() => {
			this.checkConnectivity();
		}, 30000); // Check every 30 seconds
	}

	private updateNetworkStatus(): void {
		this.isOnline = navigator.onLine;
		this.isOffline = !navigator.onLine;
	}

	private handleOnline(): void {
		this.isOnline = true;
		this.isOffline = false;
		debugConsole.log('Network: Internet connectivity restored');

		// Dispatch custom event for other components
		window.dispatchEvent(new CustomEvent('network-online'));
	}

	private handleOffline(): void {
		this.isOnline = false;
		this.isOffline = true;
		debugConsole.log('Network: No internet connectivity detected');

		// Notify provider manager that server is offline
		import('../providers/provider-manager.js').then(({ providerManager }) => {
			providerManager.markServerOffline();
		});

		// Dispatch custom event for other components
		window.dispatchEvent(new CustomEvent('network-offline'));
	}

	private async checkConnectivity(): Promise<void> {
		if (!navigator.onLine) {
			if (this.isOnline) {
				this.handleOffline();
			}
			return;
		}

		try {
			// First try to reach an external service to verify true internet connectivity
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			const response = await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!this.isOnline) {
				this.handleOnline();
			}
		} catch (error) {
			// If external check fails, try local server assets as fallback
			try {
				const response = await fetch('/favicon.png', {
					method: 'HEAD',
					mode: 'no-cors',
					cache: 'no-cache'
				});

				// Server reachable but maybe no internet - stay online for client mode
				if (!this.isOnline) {
					this.handleOnline();
				}
			} catch (localError) {
				// Both external and local failed - truly offline
				if (this.isOnline) {
					this.handleOffline();
				}
			}
		}
	}

	// Manual connectivity check - tests actual internet connectivity
	async testConnection(): Promise<boolean> {
		// Quick check first
		if (!navigator.onLine) {
			return false;
		}

		try {
			// Try external connectivity first
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
				signal: controller.signal
			});

			clearTimeout(timeoutId);
			return true;
		} catch (error) {
			// Fallback to local server check
			try {
				await fetch('/favicon.png', {
					method: 'HEAD',
					mode: 'no-cors',
					cache: 'no-cache'
				});
				return true;
			} catch (localError) {
				return false;
			}
		}
	}
}

export const networkStore = new NetworkStore();
