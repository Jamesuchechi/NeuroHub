import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show: (message: string, type: ToastType = 'success', duration = 3000) => {
			const id = crypto.randomUUID();
			const toast: Toast = { id, message, type, duration };

			update((all) => [...all, toast]);

			if (duration > 0) {
				setTimeout(() => {
					update((all) => all.filter((t) => t.id !== id));
				}, duration);
			}
		},
		dismiss: (id: string) => {
			update((all) => all.filter((t) => t.id !== id));
		}
	};
}

export const toast = createToastStore();
