<script lang="ts">
	import { fly } from 'svelte/transition';
	import { notificationStore } from '$lib/stores/notification-store.svelte.js';

	const notifications = $derived(notificationStore.notifications);

	function getIcon(type: string) {
		switch (type) {
			case 'success':
				return '✅';
			case 'error':
				return '❌';
			case 'warning':
				return '⚠️';
			case 'info':
			default:
				return 'ℹ️';
		}
	}

	function getColorClasses(type: string) {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200';
			case 'error':
				return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200';
			case 'info':
			default:
				return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200';
		}
	}
</script>

<div class="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
	{#each notifications as notification (notification.id)}
		<div
			class="pointer-events-auto max-w-sm rounded-lg border p-4 shadow-lg {getColorClasses(
				notification.type
			)}"
			transition:fly={{ x: 300, duration: 300 }}
		>
			<div class="flex items-start gap-3">
				<span class="text-lg">{getIcon(notification.type)}</span>
				<div class="flex-1">
					<p class="text-sm font-medium">{notification.message}</p>
				</div>
				<button
					class="ml-2 text-lg opacity-70 transition-opacity hover:opacity-100"
					onclick={() => notificationStore.remove(notification.id)}
					title="Dismiss"
				>
					×
				</button>
			</div>
		</div>
	{/each}
</div>
