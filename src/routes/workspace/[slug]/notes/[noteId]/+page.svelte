<script lang="ts">
	import { page } from '$app/state';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';
	import NoteView from '$lib/components/notes/NoteView.svelte';
	import BacklinksPanel from '$lib/components/notes/BacklinksPanel.svelte';
	import { fade } from 'svelte/transition';
	import { useActivityStatus } from '$lib/stores/userActivity.svelte';

	const noteId = $derived(page.params.noteId as string);
	let viewMode = $state<'edit' | 'preview'>('edit');

	const isAuthor = $derived(notesStore.currentNote?.author_id === $authStore.user?.id);
	const isPublished = $derived(notesStore.currentNote?.status === 'published');

	// --- Activity Tracking ---
	$effect(() => {
		const title = notesStore.currentNote?.title || 'a note';
		useActivityStatus(`📝 Editing ${title}`);
	});

	function toggleViewMode() {
		viewMode = viewMode === 'edit' ? 'preview' : 'edit';
	}

	// Reset view mode when note changes
	$effect(() => {
		if (noteId) {
			if (!isAuthor && isPublished) {
				viewMode = 'preview';
			} else {
				viewMode = 'edit';
			}
		}
	});
</script>

{#if notesStore.isLoading && !notesStore.currentNote}
	<div class="flex h-full w-full items-center justify-center bg-surface-dim/20">
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
			></div>
			<p class="animate-pulse text-xs font-medium text-content-dim/40">Opening Knowledge Note...</p>
		</div>
	</div>
{:else if notesStore.error}
	<div class="flex h-full w-full items-center justify-center bg-surface-dim/20 p-8 text-center">
		<div class="max-w-sm space-y-4">
			<div
				class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<h2 class="text-xl font-bold text-white">Entry Not Found</h2>
			<p class="text-xs text-content-dim">{notesStore.error}</p>
		</div>
	</div>
{:else if notesStore.currentNote}
	<div in:fade={{ duration: 400 }} class="flex h-full w-full overflow-hidden">
		<div class="relative flex-1 overflow-hidden bg-surface/10">
			<div class="h-full w-full overflow-hidden">
				{#if viewMode === 'edit' && isAuthor}
					<NoteEditor {noteId} onToggleView={toggleViewMode} />
				{:else}
					<NoteView note={notesStore.currentNote} {isAuthor} onToggleView={toggleViewMode} />
				{/if}
			</div>
		</div>
		<div class="hidden w-72 shrink-0 border-l border-stroke xl:block print:hidden">
			<BacklinksPanel {noteId} />
		</div>
	</div>
{/if}
