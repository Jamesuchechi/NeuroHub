<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import Topbar from './Topbar.svelte';
	import ContextPanel from './ContextPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import InviteMemberModal from './InviteMemberModal.svelte';
	import CreateChannelModal from '../chat/CreateChannelModal.svelte';
	import StartChatModal from '../chat/StartChatModal.svelte';
	import ChannelSettingsModal from '../chat/ChannelSettingsModal.svelte';
	import SplitPane from '../ui/SplitPane.svelte';
	import MobileNav from './MobileNav.svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fly, fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	let { children } = $props();

	const {
		sidebarWidth,
		sidebarCollapsed,
		contextPanelWidth,
		contextPanelCollapsed,
		isMobile,
		mobileSidebarOpen
	} = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);

	let isOnline = $state(true);

	onMount(() => {
		isOnline = navigator.onLine;
		const handleOnline = () => (isOnline = true);
		const handleOffline = () => (isOnline = false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-surface selection:bg-orange-500/30">
	{#if !isOnline}
		<div
			class="z-100 flex items-center justify-center bg-red-600 px-4 py-1.5 text-[10px] font-bold text-white shadow-lg md:text-xs"
			transition:slide
		>
			<svg class="mr-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
			YOU ARE OFFLINE — CONNECTION LOST
		</div>
	{/if}

	<div class="flex w-full flex-1 overflow-hidden">
		{#if isMobile}
			<!-- Mobile Layout: No SplitPane, Overlay Sidebar -->
			{#if mobileSidebarOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
					transition:fade={{ duration: 200 }}
					onclick={() => uiStore.setMobileSidebarOpen(false)}
				></div>
				<div
					class="fixed inset-y-0 left-0 z-50 w-[280px] bg-surface shadow-2xl"
					transition:fly={{ x: -280, duration: 300, easing: cubicOut }}
				>
					<Sidebar />
				</div>
			{/if}

			<!-- Mobile Context Panel Drawer -->
			{#if !contextPanelCollapsed}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
					transition:fade={{ duration: 200 }}
					onclick={() => uiStore.setContextPanelCollapsed(true)}
				></div>
				<div
					class="fixed inset-y-0 right-0 z-50 w-full max-w-[320px] bg-surface shadow-2xl"
					transition:fly={{ x: 320, duration: 300, easing: cubicOut }}
				>
					<ContextPanel />
				</div>
			{/if}

			<div class="flex h-full flex-1 flex-col overflow-hidden">
				<Topbar />
				<main class="min-h-0 flex-1 overflow-y-auto pb-16">
					{@render children()}
				</main>
				<MobileNav />
			</div>
		{:else}
			<!-- Desktop Layout: SplitPane -->
			<SplitPane
				type="horizontal"
				initialSize={sidebarCollapsed ? 80 : sidebarWidth}
				minSize={sidebarCollapsed ? 80 : 200}
				maxSize={sidebarCollapsed ? 80 : 400}
				disabled={sidebarCollapsed}
				onResize={(w) => !sidebarCollapsed && uiStore.setSidebarWidth(w)}
			>
				{#snippet left()}
					<div class="no-print h-full w-full">
						<Sidebar />
					</div>
				{/snippet}
				{#snippet right()}
					<div class="flex h-full flex-1 flex-col overflow-hidden">
						<SplitPane
							type="horizontal"
							initialSize={contextPanelCollapsed ? 0 : contextPanelWidth}
							minSize={0}
							maxSize={500}
							fixedSide="right"
							onResize={(w) => !contextPanelCollapsed && uiStore.setContextPanelWidth(w)}
						>
							{#snippet left()}
								<div class="flex h-full flex-1 flex-col overflow-hidden">
									<div
										class="no-print"
										in:fly={{ y: -64, duration: 800, easing: cubicOut, delay: 100 }}
									>
										<Topbar />
									</div>
									<main class="min-h-0 flex-1 overflow-y-auto">
										{@render children()}
									</main>
								</div>
							{/snippet}
							{#snippet right()}
								{#if !contextPanelCollapsed}
									<div class="no-print h-full w-full">
										<ContextPanel />
									</div>
								{/if}
							{/snippet}
						</SplitPane>
					</div>
				{/snippet}
			</SplitPane>
		{/if}

		<CommandPalette />

		{#if currentWorkspace}
			<InviteMemberModal workspaceId={currentWorkspace.id} />
			<CreateChannelModal />
			<StartChatModal />
			<ChannelSettingsModal />
		{/if}
	</div>
</div>
