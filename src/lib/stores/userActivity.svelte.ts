import { chatStore } from './chatStore.svelte';
import { onDestroy } from 'svelte';

/**
 * Hook-like function to set user activity status within a component lifecycle.
 * Updates the global presence status on mount and resets it on destroy.
 */
export function useActivityStatus(status: string, resetTo = 'Active') {
	chatStore.setUserStatus(status);

	onDestroy(() => {
		chatStore.setUserStatus(resetTo);
	});
}

/**
 * Manual activity status controller for non-lifecycle usage.
 */
export const activityStore = {
	async setStatus(status: string) {
		await chatStore.setUserStatus(status);
	},

	async clear() {
		await chatStore.setUserStatus('Active');
	}
};
