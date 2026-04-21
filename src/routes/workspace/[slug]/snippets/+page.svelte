<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import DevToolsWorkbench from '$lib/components/devtools/DevToolsWorkbench.svelte';
	import { useActivityStatus } from '$lib/stores/userActivity.svelte';

	let workspaceId = $derived($workspaceStore.currentWorkspace?.id);

	// --- Activity Tracking ---
	$effect(() => {
		useActivityStatus('👨‍💻 Managing Snippets & Tools');
	});
</script>

<svelte:head>
	<title>DevHub - Snippets & Tools</title>
</svelte:head>

<div class="h-full bg-surface">
	{#if workspaceId}
		<DevToolsWorkbench {workspaceId} />
	{:else}
		<div class="flex h-full items-center justify-center">
			<div class="flex flex-col items-center gap-4">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
				></div>
				<p class="animate-pulse text-sm font-medium text-zinc-500">Initializing DevHub...</p>
			</div>
		</div>
	{/if}
</div>
