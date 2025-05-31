interface Notification {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
	duration?: number;
}

class NotificationStore {
	notifications = $state<Notification[]>([]);

	show(type: Notification['type'], message: string, duration = 3000): string {
		const id = Math.random().toString(36).substr(2, 9);
		const notification: Notification = { id, type, message, duration };

		this.notifications.push(notification);

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}

		return id;
	}

	success(message: string, duration?: number): string {
		return this.show('success', message, duration);
	}

	error(message: string, duration?: number): string {
		return this.show('error', message, duration);
	}

	info(message: string, duration?: number): string {
		return this.show('info', message, duration);
	}

	warning(message: string, duration?: number): string {
		return this.show('warning', message, duration);
	}

	remove(id: string): void {
		this.notifications = this.notifications.filter((n) => n.id !== id);
	}

	clear(): void {
		this.notifications = [];
	}
}

export const notificationStore = new NotificationStore();
