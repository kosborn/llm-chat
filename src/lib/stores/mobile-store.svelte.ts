import { browser } from '$app/environment';

class MobileStore {
	isMobile = $state(false);
	screenWidth = $state(0);
	sidebarCollapsed = $state(false);

	constructor() {
		if (browser) {
			this.updateScreenSize();
			window.addEventListener('resize', this.updateScreenSize.bind(this));
		}
	}

	private updateScreenSize() {
		this.screenWidth = window.innerWidth;
		this.isMobile = window.innerWidth < 768; // md breakpoint

		// Auto-collapse sidebar on mobile
		if (this.isMobile && !this.sidebarCollapsed) {
			this.sidebarCollapsed = true;
		}
	}

	toggleSidebar() {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}

	closeSidebar() {
		this.sidebarCollapsed = true;
	}

	openSidebar() {
		this.sidebarCollapsed = false;
	}
}

export const mobileStore = new MobileStore();
