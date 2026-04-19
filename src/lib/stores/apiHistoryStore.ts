import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { HttpMethod } from '$lib/types/devtools';

export interface ApiHistoryItem {
	id: string;
	method: HttpMethod;
	url: string;
	timestamp: number;
	status?: number;
	statusText?: string;
	workspaceId: string;
}

const STORAGE_KEY = 'neurohub_api_history';

function createApiHistoryStore() {
	const initialHistory: ApiHistoryItem[] = browser
		? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
		: [];

	const { subscribe, update, set } = writable<ApiHistoryItem[]>(initialHistory);

	return {
		subscribe,
		add: (item: Omit<ApiHistoryItem, 'id' | 'timestamp'>) => {
			update((history) => {
				const newItem: ApiHistoryItem = {
					...item,
					id: crypto.randomUUID(),
					timestamp: Date.now()
				};

				// Limit history to 50 items and unique based on method/url/workspace
				const filtered = history.filter(
					(h) =>
						!(h.method === item.method && h.url === item.url && h.workspaceId === item.workspaceId)
				);

				const newHistory = [newItem, ...filtered].slice(0, 50);

				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				}

				return newHistory;
			});
		},
		remove: (id: string) => {
			update((history) => {
				const newHistory = history.filter((h) => h.id !== id);
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				}
				return newHistory;
			});
		},
		clear: () => {
			set([]);
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

export const apiHistoryStore = createApiHistoryStore();
