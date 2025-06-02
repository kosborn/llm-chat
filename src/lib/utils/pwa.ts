import { browser } from '$app/environment';
import { debugConsole } from './console.js';

export interface PWAInstallPrompt {
	prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
	private deferredPrompt: PWAInstallPrompt | null = null;
	private isInstalled = false;

	constructor() {
		if (browser) {
			this.init();
		}
	}

	private async init() {
		// Check if already installed
		this.isInstalled = window.matchMedia('(display-mode: standalone)').matches;

		// Listen for install prompt
		this.setupInstallPrompt();

		// Listen for app installed
		window.addEventListener('appinstalled', () => {
			this.isInstalled = true;
			this.deferredPrompt = null;
			debugConsole.log('PWA installed successfully');
		});
	}

	private setupInstallPrompt() {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.deferredPrompt = e as PWAInstallPrompt;
			debugConsole.log('PWA install prompt ready');
		});
	}

	public canInstall(): boolean {
		return !this.isInstalled && this.deferredPrompt !== null;
	}

	public isAppInstalled(): boolean {
		return this.isInstalled;
	}

	public async install(): Promise<boolean> {
		if (!this.deferredPrompt) {
			debugConsole.warn('No install prompt available');
			return false;
		}

		try {
			const result = await this.deferredPrompt.prompt();
			debugConsole.log('Install prompt result:', result.outcome);
			
			const accepted = result.outcome === 'accepted';
			if (accepted) {
				this.deferredPrompt = null;
			}
			
			return accepted;
		} catch (error) {
			debugConsole.error('Install prompt failed:', error);
			return false;
		}
	}

	public async requestPersistentStorage(): Promise<boolean> {
		if ('storage' in navigator && 'persist' in navigator.storage) {
			try {
				const persistent = await navigator.storage.persist();
				debugConsole.log('Persistent storage:', persistent ? 'granted' : 'denied');
				return persistent;
			} catch (error) {
				debugConsole.error('Failed to request persistent storage:', error);
				return false;
			}
		}
		return false;
	}
}

// Create singleton instance
export const pwaManager = new PWAManager();