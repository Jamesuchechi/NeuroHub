<script lang="ts">
	import {
		activeTab,
		devSidebarWidth,
		devSidebarCollapsed,
		activeSnippetId,
		activeApiTestId
	} from '$lib/stores/devToolsStore';
	import DevToolsSidebar from './DevToolsSidebar.svelte';
	import SnippetBrowser from './SnippetBrowser.svelte';
	import ApiTester from './ApiTester.svelte';
	import CodeSandbox from './CodeSandbox.svelte';
	import JsonWorkbench from './JsonWorkbench.svelte';
	import ToolkitSuite from './ToolkitSuite.svelte';
	import SplitPane from '../ui/SplitPane.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { workspaceId } = $props<{ workspaceId: string }>();
	let isMobile = $state(false);

	// Mobile-only toggle to switch between sidebar/history and main tool content
	let mobileView = $state<'sidebar' | 'content'>('sidebar');

	function handleResize(width: number) {
		devSidebarWidth.set(width);
	}

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		// Handle cross-tool load events for mobile view switching
		const handleLoad = () => {
			if (isMobile) mobileView = 'content';
		};

		window.addEventListener('load-api-request', handleLoad);
		window.addEventListener('load-json', handleLoad);

		return () => {
			window.removeEventListener('resize', checkMobile);
			window.removeEventListener('load-api-request', handleLoad);
			window.removeEventListener('load-json', handleLoad);
		};
	});

	// Auto-switch to content view when an item is selected
	$effect(() => {
		if (isMobile && ($activeSnippetId || $activeApiTestId)) {
			mobileView = 'content';
		}
	});

	// For tabs that don't have a specific "item ID" (like JSON or Toolkit),
	// we might need a manual toggle or just show the content.
	function goBack() {
		mobileView = 'sidebar';
		activeSnippetId.set(null);
		activeApiTestId.set(null);
	}
</script>

<div class="flex h-full w-full overflow-hidden bg-surface">
	{#if isMobile}
		{#if mobileView === 'sidebar'}
			<div class="flex h-full w-full flex-col">
				<div class="flex-1 overflow-hidden">
					<DevToolsSidebar />
				</div>
				<!-- Mobile Toggle for tool-only tabs -->
				{#if ['json', 'sandbox', 'toolkit'].includes($activeTab)}
					<div class="border-t border-stroke bg-surface-dim p-4">
						<button
							onclick={() => (mobileView = 'content')}
							class="w-full rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg transition-transform active:scale-95"
						>
							Open {$activeTab.toUpperCase()}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<main class="relative flex h-full flex-1 flex-col overflow-hidden">
				<!-- Mobile Back Button -->
				<button
					onclick={goBack}
					class="absolute top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim/80 text-white shadow-lg backdrop-blur-md transition-all hover:bg-surface-dim active:scale-95"
					aria-label="Back to library"
					title="Back to library"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>

				{#if $activeTab === 'snippets'}
					<div in:fade={{ duration: 200 }} class="h-full">
						<SnippetBrowser {workspaceId} />
					</div>
				{:else if $activeTab === 'api'}
					<div in:fade={{ duration: 200 }} class="h-full">
						<ApiTester {workspaceId} />
					</div>
				{:else if $activeTab === 'sandbox'}
					<div in:fade={{ duration: 200 }} class="h-full">
						<CodeSandbox {workspaceId} />
					</div>
				{:else if $activeTab === 'json'}
					<div in:fade={{ duration: 200 }} class="h-full">
						<JsonWorkbench />
					</div>
				{:else if $activeTab === 'toolkit'}
					<div in:fade={{ duration: 200 }} class="h-full">
						<ToolkitSuite />
					</div>
				{/if}
			</main>
		{/if}
	{:else}
		<SplitPane
			type="horizontal"
			initialSize={$devSidebarCollapsed ? 64 : $devSidebarWidth}
			minSize={$devSidebarCollapsed ? 64 : 200}
			maxSize={$devSidebarCollapsed ? 64 : 450}
			disabled={$devSidebarCollapsed}
			onResize={handleResize}
		>
			{#snippet left()}
				<div class="h-full w-full">
					<DevToolsSidebar />
				</div>
			{/snippet}

			{#snippet right()}
				<main class="relative flex h-full flex-1 flex-col overflow-hidden">
					{#if $activeTab === 'snippets'}
						<div in:fade={{ duration: 200 }} class="h-full">
							<SnippetBrowser {workspaceId} />
						</div>
					{:else if $activeTab === 'api'}
						<div in:fade={{ duration: 200 }} class="h-full">
							<ApiTester {workspaceId} />
						</div>
					{:else if $activeTab === 'sandbox'}
						<div in:fade={{ duration: 200 }} class="h-full">
							<CodeSandbox {workspaceId} />
						</div>
					{:else if $activeTab === 'json'}
						<div in:fade={{ duration: 200 }} class="h-full">
							<JsonWorkbench />
						</div>
					{:else if $activeTab === 'toolkit'}
						<div in:fade={{ duration: 200 }} class="h-full">
							<ToolkitSuite />
						</div>
					{/if}
				</main>
			{/snippet}
		</SplitPane>
	{/if}
</div>

<style>
	:global(.split-pane-divider) {
		z-index: 20;
	}
</style>
