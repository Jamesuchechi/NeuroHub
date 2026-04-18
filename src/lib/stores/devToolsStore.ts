import { writable } from 'svelte/store';
import type { Language, SnippetView, SnippetSort } from '$lib/types/devtools';

// Active tab
export type DevTab = 'snippets' | 'sandbox' | 'api' | 'json';
export const activeTab = writable<DevTab>('snippets');

// Snippets browser state
export const snippetFilters = writable<{
	language: Language | null;
	tags: string[];
	authorId: string | null;
	search: string;
	sort: SnippetSort;
	view: SnippetView;
}>({
	language: null,
	tags: [],
	authorId: null,
	search: '',
	sort: 'recent',
	view: 'grid'
});

// Currently open snippet
export const openSnippetId = writable<string | null>(null);

// Star state (local optimistic)
export const starredIds = writable<Set<string>>(new Set());

export function toggleStarLocal(id: string) {
	starredIds.update((set) => {
		const next = new Set(set);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		return next;
	});
}

// API Tester state
export const activeApiTestId = writable<string | null>(null);
export const activeEnvironmentId = writable<string | null>(null);

// Hub Integration: Cross-tool data transfer
export const sandboxPreload = writable<{ code: string; language: Language } | null>(null);
export const pendingSnippet = writable<{
	code: string;
	language: Language;
	title?: string;
	description?: string;
} | null>(null);

// Helper to open sandbox with code
export function openInSandbox(code: string, language: Language = 'javascript') {
	sandboxPreload.set({ code, language });
	activeTab.set('sandbox');
}

// Helper to open snippet creation with data
export function openCreateSnippet(data: {
	code: string;
	language: Language;
	title?: string;
	description?: string;
}) {
	pendingSnippet.set(data);
	activeTab.set('snippets');
	openSnippetId.set('new'); // Trigger modal opening in create mode
}
