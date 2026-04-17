import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
	sidebarWidth: number;
	sidebarCollapsed: boolean;
	contextPanelWidth: number;
	contextPanelCollapsed: boolean;
	theme: Theme;
	commandPaletteOpen: boolean;
	inviteModalOpen: boolean;
	createChannelModalOpen: boolean;
	startChatModalOpen: boolean;
	channelSettingsModalOpen: boolean;
}

const DEFAULT_SIDEBAR_WIDTH = 260;
const DEFAULT_CONTEXT_PANEL_WIDTH = 300;

function createUIStore() {
	// Try to load from localStorage
	const stored = typeof window !== 'undefined' ? localStorage.getItem('neurohub-ui-state') : null;
	const initialState: UIState = stored
		? JSON.parse(stored)
		: {
				sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
				sidebarCollapsed: false,
				contextPanelWidth: DEFAULT_CONTEXT_PANEL_WIDTH,
				contextPanelCollapsed: true, // Collapsed by default as requested/implied
				theme: 'dark',
				commandPaletteOpen: false,
				inviteModalOpen: false,
				createChannelModalOpen: false,
				startChatModalOpen: false,
				channelSettingsModalOpen: false
			};

	const { subscribe, update } = writable<UIState>(initialState);

	return {
		subscribe,
		setSidebarWidth: (width: number) => update((s) => ({ ...s, sidebarWidth: width })),
		setSidebarCollapsed: (collapsed: boolean) =>
			update((s) => ({ ...s, sidebarCollapsed: collapsed })),
		setContextPanelWidth: (width: number) => update((s) => ({ ...s, contextPanelWidth: width })),
		setContextPanelCollapsed: (collapsed: boolean) =>
			update((s) => ({ ...s, contextPanelCollapsed: collapsed })),
		setTheme: (theme: Theme) => update((s) => ({ ...s, theme })),
		setCommandPaletteOpen: (open: boolean) => update((s) => ({ ...s, commandPaletteOpen: open })),
		toggleCommandPalette: () =>
			update((s) => ({ ...s, commandPaletteOpen: !s.commandPaletteOpen })),
		setInviteModalOpen: (open: boolean) => update((s) => ({ ...s, inviteModalOpen: open })),
		toggleInviteModal: () => update((s) => ({ ...s, inviteModalOpen: !s.inviteModalOpen })),
		setCreateChannelModalOpen: (open: boolean) =>
			update((s) => ({ ...s, createChannelModalOpen: open })),
		setStartChatModalOpen: (open: boolean) => update((s) => ({ ...s, startChatModalOpen: open })),
		setChannelSettingsModalOpen: (open: boolean) =>
			update((s) => ({ ...s, channelSettingsModalOpen: open })),

		persist: (state: UIState) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem('neurohub-ui-state', JSON.stringify(state));
			}
		}
	};
}

export const uiStore = createUIStore();

// Auto-persist changes
if (typeof window !== 'undefined') {
	uiStore.subscribe((state) => {
		uiStore.persist(state);

		// Apply theme class to document
		const isDark =
			state.theme === 'dark' ||
			(state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});
}
