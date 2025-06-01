class MobileStore {
	sidebarVisible = $state(false);

	toggleSidebar() {
		this.sidebarVisible = !this.sidebarVisible;
	}

	closeSidebar() {
		this.sidebarVisible = false;
	}

	openSidebar() {
		this.sidebarVisible = true;
	}
}

export const mobileStore = new MobileStore();
