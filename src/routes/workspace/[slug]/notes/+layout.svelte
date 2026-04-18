<script lang="ts">
	import { page } from '$app/state';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import NoteSidebar from '$lib/components/notes/NoteSidebar.svelte';
	import SplitPane from '$lib/components/ui/SplitPane.svelte';

	let { children } = $props();

	// Load notes for the current workspace
	$effect(() => {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (workspaceId) {
			notesStore.fetchNotes(workspaceId);
		}
	});

	// Handle initial note loading if a noteId exists in URL
	$effect(() => {
		const noteId = page.params.noteId;
		if (noteId && notesStore.currentNote?.id !== noteId) {
			notesStore.fetchNote(noteId);
		}
	});
</script>

<div class="flex h-full w-full overflow-hidden">
	<SplitPane type="horizontal" initialSize={300} minSize={250} maxSize={450}>
		{#snippet left()}
			<div class="no-print h-full w-full">
				<NoteSidebar />
			</div>
		{/snippet}

		{#snippet right()}
			<div class="h-full flex-1">
				{@render children()}
			</div>
		{/snippet}
	</SplitPane>
</div>
