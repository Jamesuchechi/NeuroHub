<script lang="ts">
	import type { PageData } from './$types';
	import { activeTab } from '$lib/stores/devToolsStore';
	import DevToolsSidebar from '$lib/components/devtools/DevToolsSidebar.svelte';
	import JsonWorkbench from '$lib/components/devtools/JsonWorkbench.svelte';
	import SnippetBrowser from '$lib/components/devtools/SnippetBrowser.svelte';
	import CodeSandbox from '$lib/components/devtools/CodeSandbox.svelte';
	import ApiTester from '$lib/components/devtools/ApiTester.svelte';

	let { data } = $props<{ data: PageData }>();

	let { apiTests, environments, workspace } = $derived(data);

	const toolTitles: Record<string, string> = {
		snippets: 'Snippets Library',
		sandbox: 'Code Sandbox',
		api: 'API Workbench',
		json: 'JSON Utility'
	};
</script>

<svelte:head>
	<title>{toolTitles[$activeTab] || 'DevHub'} | {workspace?.name ?? 'NeuroHub'}</title>
</svelte:head>

<div class="bg-background flex h-full w-full overflow-hidden">
	<!-- Sidebar Navigation -->
	<DevToolsSidebar />

	<!-- Main Content Hub -->
	<div class="flex h-full min-w-0 flex-1 flex-col">
		<!-- Hub Header -->
		<header
			class="border-border bg-card/50 z-10 flex h-16 shrink-0 items-center justify-between border-b px-6 backdrop-blur-md"
		>
			<div class="flex items-center gap-4">
				<h1 class="text-xl font-bold tracking-tight">{toolTitles[$activeTab] || 'DevHub'}</h1>
				<div class="bg-border h-4 w-px"></div>
				<span class="text-muted-foreground text-sm font-medium">{workspace?.name}</span>
			</div>

			<div class="flex items-center gap-6">
				<!-- Peer Presence Mockup -->
				<div class="flex items-center -space-x-2">
					<div
						class="border-background ring-border flex h-8 w-8 items-center justify-center rounded-full border-2 bg-blue-500 text-[10px] font-bold text-white ring-1"
						title="James (You)"
					>
						JU
					</div>
					<div
						class="border-background ring-border flex h-8 w-8 items-center justify-center rounded-full border-2 bg-green-500 text-[10px] font-bold text-white ring-1"
						title="Alex"
					>
						AR
					</div>
					<div
						class="border-background bg-muted text-muted-foreground ring-border flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold ring-1"
					>
						+2
					</div>
				</div>

				<button
					class="text-primary bg-primary/10 rounded-lg px-3 py-1.5 text-sm font-semibold transition-transform hover:underline active:scale-95"
				>
					Invite Peer
				</button>
			</div>
		</header>

		<!-- Active Tool Container -->
		<main class="relative flex-1 overflow-hidden">
			{#if $activeTab === 'snippets'}
				<SnippetBrowser workspaceId={workspace.id} />
			{:else if $activeTab === 'sandbox'}
				<CodeSandbox workspaceId={workspace.id} />
			{:else if $activeTab === 'api'}
				<ApiTester
					workspaceId={workspace.id}
					initialHistory={apiTests}
					initialEnvironments={environments}
				/>
			{:else if $activeTab === 'json'}
				<JsonWorkbench />
			{/if}
		</main>
	</div>
</div>
