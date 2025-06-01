class MobileStore {
	sidebarVisible = $state(false);
	desktopSidebarVisible = $state(true);

	toggleSidebar() {
		this.sidebarVisible = !this.sidebarVisible;
	}

	closeSidebar() {
		this.sidebarVisible = false;
	}

	openSidebar() {
		this.sidebarVisible = true;
	}

	toggleDesktopSidebar() {
		this.desktopSidebarVisible = !this.desktopSidebarVisible;
	}

	closeDesktopSidebar() {
		this.desktopSidebarVisible = false;
	}

	openDesktopSidebar() {
		this.desktopSidebarVisible = true;
	}
}

export const mobileStore = new MobileStore();
