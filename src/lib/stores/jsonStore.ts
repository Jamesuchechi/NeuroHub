import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface JsonHistoryItem {
	id: string;
	name: string;
	data: string;
	timestamp: number;
}

const STORAGE_KEY = 'neurohub_json_history';

function createJsonStore() {
	const initialHistory: JsonHistoryItem[] = browser
		? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
		: [];

	const { subscribe, update, set } = writable<JsonHistoryItem[]>(initialHistory);

	return {
		subscribe,
		add: (data: string, name?: string) => {
			if (!data.trim()) return;

			update((history) => {
				// Don't add duplicate data if it was the last thing added
				if (history.length > 0 && history[0].data === data) {
					return history;
				}

				// Try to auto-detect a name if not provided
				if (!name) {
					try {
						const obj = JSON.parse(data);
						name = obj.name || obj.title || obj.id || `JSON-${new Date().toLocaleTimeString()}`;
					} catch (_) {
						name = `JSON-${new Date().toLocaleTimeString()}`;
					}
				}

				const newItem: JsonHistoryItem = {
					id: crypto.randomUUID(),
					name: name || 'Untitled JSON',
					data,
					timestamp: Date.now()
				};

				const newHistory = [newItem, ...history].slice(0, 50); // Limit to 50 items

				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				}

				return newHistory;
			});
		},
		remove: (id: string) => {
			update((history) => {
				const newHistory = history.filter((v) => v.id !== id);
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

export const jsonStore = createJsonStore();
