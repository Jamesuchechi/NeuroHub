import { writable } from 'svelte/store';
import type { Language, SnippetView, SnippetSort } from '$lib/types/devtools';

// Active tab
export type DevTab = 'snippets' | 'sandbox' | 'api' | 'json' | 'toolkit';
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

// Tab Management
export const openSnippetTabs = writable<string[]>([]);
export const activeSnippetId = writable<string | null>(null);

// Sidebar Layout
export const devSidebarWidth = writable<number>(250);
export const devSidebarCollapsed = writable<boolean>(false);
export const sandboxPanelWidth = writable<number>(50);

export function openInTab(id: string) {
	openSnippetTabs.update((tabs) => {
		if (!tabs.includes(id)) {
			return [...tabs, id];
		}
		return tabs;
	});
	activeSnippetId.set(id);
	activeTab.set('snippets');
}

export function closeTab(id: string) {
	openSnippetTabs.update((tabs) => {
		const next = tabs.filter((t) => t !== id);
		activeSnippetId.update((current) => {
			if (current === id) {
				return next[next.length - 1] || null;
			}
			return current;
		});
		return next;
	});
}

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
	activeSnippetId.set('new'); // Also set as active tab if using tabbed view
}
