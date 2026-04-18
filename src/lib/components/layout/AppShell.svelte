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
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { children } = $props();

	const { sidebarWidth, contextPanelWidth, contextPanelCollapsed } = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);
</script>

<div class="flex h-screen w-full overflow-hidden bg-surface selection:bg-orange-500/30">
	<SplitPane
		type="horizontal"
		initialSize={sidebarWidth}
		minSize={200}
		maxSize={400}
		onResize={(w) => uiStore.setSidebarWidth(w)}
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
							<!-- Main Top Header -->
							<div
								class="no-print"
								in:fly={{ y: -64, duration: 800, easing: cubicOut, delay: 100 }}
							>
								<Topbar />
							</div>

							<!-- Scrollable Content Viewport -->
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

	<CommandPalette />

	{#if currentWorkspace}
		<InviteMemberModal workspaceId={currentWorkspace.id} />
		<CreateChannelModal />
		<StartChatModal />
		<ChannelSettingsModal />
	{/if}
</div>
