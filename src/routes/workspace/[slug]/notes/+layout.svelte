<script lang="ts">
	import { page } from '$app/state';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import NoteSidebar from '$lib/components/notes/NoteSidebar.svelte';
	import SplitPane from '$lib/components/ui/SplitPane.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isMobile = $state(false);

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

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	const hasNoteId = $derived(!!page.params.noteId);
</script>

<div class="flex h-full w-full overflow-hidden">
	{#if isMobile}
		{#if !hasNoteId}
			<div class="h-full w-full">
				<NoteSidebar />
			</div>
		{:else}
			<div class="h-full w-full bg-surface">
				{@render children()}
			</div>
		{/if}
	{:else}
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
	{/if}
</div>
