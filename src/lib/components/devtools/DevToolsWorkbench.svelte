<script lang="ts">
	import { activeTab, devSidebarWidth, devSidebarCollapsed } from '$lib/stores/devToolsStore';
	import DevToolsSidebar from './DevToolsSidebar.svelte';
	import SnippetBrowser from './SnippetBrowser.svelte';
	import ApiTester from './ApiTester.svelte';
	import CodeSandbox from './CodeSandbox.svelte';
	import JsonWorkbench from './JsonWorkbench.svelte';
	import ToolkitSuite from './ToolkitSuite.svelte';
	import SplitPane from '../ui/SplitPane.svelte';
	import { fade } from 'svelte/transition';

	let { workspaceId } = $props<{ workspaceId: string }>();

	function handleResize(width: number) {
		devSidebarWidth.set(width);
	}
</script>

<div class="flex h-full w-full overflow-hidden bg-surface">
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
</div>

<style>
	:global(.split-pane-divider) {
		z-index: 20;
	}
</style>
