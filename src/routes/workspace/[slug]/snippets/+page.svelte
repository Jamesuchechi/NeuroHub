<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import SnippetBrowser from '$lib/components/devtools/SnippetBrowser.svelte';

	let workspaceId = $derived($workspaceStore.currentWorkspace?.id);
</script>

<div class="h-full">
	{#if workspaceId}
		<SnippetBrowser {workspaceId} />
	{:else}
		<div class="flex h-full items-center justify-center">
			<div class="text-muted-foreground animate-pulse">Loading workspace data...</div>
		</div>
	{/if}
</div>
