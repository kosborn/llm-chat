import { browser } from '$app/environment';

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
		console.log('Network: Back online');

		// Dispatch custom event for other components
		window.dispatchEvent(new CustomEvent('network-online'));
	}

	private handleOffline(): void {
		this.isOnline = false;
		this.isOffline = true;
		console.log('Network: Gone offline');

		// Dispatch custom event for other components
		window.dispatchEvent(new CustomEvent('network-offline'));
	}

	private async checkConnectivity(): Promise<void> {
		if (!navigator.onLine) {
			return;
		}

		try {
			// Try to fetch a small resource to verify connectivity
			const response = await fetch('/favicon.png', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache'
			});

			if (!this.isOnline) {
				this.handleOnline();
			}
		} catch (error) {
			if (this.isOnline) {
				this.handleOffline();
			}
		}
	}

	// Manual connectivity check
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch('/favicon.png', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache'
			});
			return true;
		} catch (error) {
			return false;
		}
	}
}

export const networkStore = new NetworkStore();
