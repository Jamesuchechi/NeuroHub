<script lang="ts">
	import { activeTab, type DevTab, devSidebarCollapsed } from '$lib/stores/devToolsStore';
	import { fade } from 'svelte/transition';
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';

	// Sub-components (we will refactor these or create them)
	import SnippetSidebarList from './SnippetSidebarList.svelte';
	import ApiSidebarHistory from './ApiSidebarHistory.svelte';
	import SandboxSidebarControls from './SandboxSidebarControls.svelte';
	import JsonSidebarHistory from './JsonSidebarHistory.svelte';

	const menuItems: { id: DevTab; label: string; icon: string }[] = [
		{
			id: 'snippets',
			label: 'Snippets',
			icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		},
		{ id: 'api', label: 'API Tester', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
		{
			id: 'sandbox',
			label: 'Sandbox',
			icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{ id: 'json', label: 'JSON Utility', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
		{
			id: 'toolkit',
			label: 'Dev Toolkit',
			icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z'
		}
	];

	function selectTab(id: DevTab) {
		activeTab.set(id);
		if ($devSidebarCollapsed) {
			devSidebarCollapsed.set(false);
		}
	}

	function toggleCollapse() {
		devSidebarCollapsed.update((c) => !c);
	}
</script>

<div class="flex h-full w-full overflow-hidden">
	<!-- Activity Bar (Narrow strip) -->
	<div
		class="activity-bar no-print flex w-16 flex-col items-center gap-2 border-r border-stroke bg-surface-dim py-4"
	>
		{#each menuItems as item (item.id)}
			<button
				class="group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all
					{$activeTab === item.id
					? 'bg-orange-500/10 font-bold text-orange-500'
					: 'text-content-dim hover:bg-surface hover:text-content'}"
				onclick={() => selectTab(item.id)}
				title={item.label}
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
				</svg>

				{#if $activeTab === item.id}
					<div class="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-orange-500"></div>
				{/if}

				<!-- Sidebar Tooltip -->
				<div
					class="pointer-events-none absolute left-16 z-50 rounded-md border border-stroke bg-surface-dim px-2 py-1 text-xs whitespace-nowrap text-content opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
				>
					{item.label}
				</div>
			</button>
		{/each}

		<div class="mt-auto flex flex-col items-center gap-4">
			<button
				class="text-content-dim transition-colors hover:text-orange-500"
				onclick={() => uiStore.toggleCommandPalette()}
				title="Command Palette (Cmd+K)"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</button>

			<button
				class="text-content-dim transition-colors hover:text-content"
				onclick={toggleCollapse}
				title={$devSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
			>
				<svg
					class="h-6 w-6 {$devSidebarCollapsed ? 'rotate-180' : ''} transition-transform"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Side Bar Content -->
	{#if !$devSidebarCollapsed}
		<div class="flex h-full flex-1 flex-col overflow-hidden bg-surface" in:fade={{ duration: 150 }}>
			<div class="flex h-12 items-center border-b border-stroke px-4">
				<span class="text-xs font-bold tracking-widest text-content-dim uppercase">
					{#if $activeTab === 'snippets'}
						Snippets Library
					{:else if $activeTab === 'api'}
						API Workbench
					{:else if $activeTab === 'sandbox'}
						Code Sandbox
					{:else if $activeTab === 'json'}
						JSON Utility
					{:else if $activeTab === 'toolkit'}
						Developer Toolkit
					{/if}
				</span>
			</div>

			<div class="flex-1 overflow-y-auto bg-surface">
				{#if $activeTab === 'snippets'}
					<SnippetSidebarList workspaceId={$workspaceStore.currentWorkspace?.id || ''} />
				{:else if $activeTab === 'api'}
					<ApiSidebarHistory workspaceId={$workspaceStore.currentWorkspace?.id || ''} />
				{:else if $activeTab === 'sandbox'}
					<SandboxSidebarControls />
				{:else if $activeTab === 'json'}
					<JsonSidebarHistory
						onSelect={(data) => {
							const event = new CustomEvent('load-json', { detail: data });
							window.dispatchEvent(event);
						}}
					/>
				{:else if $activeTab === 'toolkit'}
					<div class="p-4 text-xs text-content-dim italic">
						Utility tools for RegEx, Cron, and common conversions.
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.activity-bar {
		user-select: none;
	}
</style>
