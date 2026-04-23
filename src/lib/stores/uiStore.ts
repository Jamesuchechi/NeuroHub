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
	createGroupDMModalOpen: boolean;
	channelSettingsModalOpen: boolean;
	dashboardTeamCollapsed: boolean;
	selectedNoteId: string | null;
	selectedSnippetId: string | null;
	isMobile: boolean;
	mobileSidebarOpen: boolean;
}

const DEFAULT_SIDEBAR_WIDTH = 260;
const DEFAULT_CONTEXT_PANEL_WIDTH = 300;

function createUIStore() {
	// Try to load from localStorage
	const stored = typeof window !== 'undefined' ? localStorage.getItem('neurohub-ui-state') : null;
	const initialState: UIState = {
		...(stored
			? JSON.parse(stored)
			: {
					sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
					sidebarCollapsed: false,
					contextPanelWidth: DEFAULT_CONTEXT_PANEL_WIDTH,
					contextPanelCollapsed: true,
					theme: 'dark',
					commandPaletteOpen: false,
					inviteModalOpen: false,
					createChannelModalOpen: false,
					startChatModalOpen: false,
					createGroupDMModalOpen: false,
					channelSettingsModalOpen: false,
					dashboardTeamCollapsed: false,
					selectedNoteId: null,
					selectedSnippetId: null
				}),
		isMobile: false, // Reset on each load
		mobileSidebarOpen: false
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
		setCreateGroupDMModalOpen: (open: boolean) =>
			update((s) => ({ ...s, createGroupDMModalOpen: open })),
		setChannelSettingsModalOpen: (open: boolean) =>
			update((s) => ({ ...s, channelSettingsModalOpen: open })),
		setDashboardTeamCollapsed: (collapsed: boolean) =>
			update((s) => ({ ...s, dashboardTeamCollapsed: collapsed })),
		setSelectedNoteId: (id: string | null) =>
			update((s) => ({ ...s, selectedNoteId: id, contextPanelCollapsed: !id })),
		setSelectedSnippetId: (id: string | null) => update((s) => ({ ...s, selectedSnippetId: id })),
		setIsMobile: (isMobile: boolean) => update((s) => ({ ...s, isMobile })),
		setMobileSidebarOpen: (open: boolean) => update((s) => ({ ...s, mobileSidebarOpen: open })),

		persist: (state: UIState) => {
			if (typeof window !== 'undefined') {
				const { isMobile, mobileSidebarOpen, ...toPersist } = state;
				localStorage.setItem('neurohub-ui-state', JSON.stringify(toPersist));
			}
		}
	};
}

export const uiStore = createUIStore();

// Runtime listeners
if (typeof window !== 'undefined') {
	const mediaQuery = window.matchMedia('(max-width: 768px)');

	const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
		uiStore.setIsMobile(e.matches);
		if (!e.matches) {
			uiStore.setMobileSidebarOpen(false);
		}
	};

	mediaQuery.addEventListener('change', handleMediaChange);
	handleMediaChange(mediaQuery); // Initial check

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
