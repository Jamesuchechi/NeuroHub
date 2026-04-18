<script lang="ts">
	import { page } from '$app/state';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';
	import NoteView from '$lib/components/notes/NoteView.svelte';
	import BacklinksPanel from '$lib/components/notes/BacklinksPanel.svelte';
	import { fade } from 'svelte/transition';

	const noteId = $derived(page.params.noteId as string);
	let viewMode = $state<'edit' | 'preview'>('edit');

	const isAuthor = $derived(notesStore.currentNote?.author_id === $authStore.user?.id);
	const isPublished = $derived(notesStore.currentNote?.status === 'published');

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
			{#if isAuthor}
				<div class="no-print absolute top-[13px] right-[200px] z-30">
					<button
						onclick={() => (viewMode = viewMode === 'edit' ? 'preview' : 'edit')}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-surface/80 text-white backdrop-blur-md transition-all hover:border-brand-orange hover:bg-brand-orange/10"
						title={viewMode === 'edit' ? 'Preview Note' : 'Resume Editing'}
					>
						<svg
							class="h-4 w-4 text-brand-orange"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							{#if viewMode === 'edit'}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							{:else}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							{/if}
						</svg>
					</button>
				</div>
			{/if}

			<div class="h-full w-full overflow-y-auto">
				{#if viewMode === 'edit' && isAuthor}
					<NoteEditor {noteId} />
				{:else}
					<NoteView note={notesStore.currentNote} />
				{/if}
			</div>
		</div>
		<div class="hidden w-72 shrink-0 border-l border-stroke xl:block print:hidden">
			<BacklinksPanel {noteId} />
		</div>
	</div>
{/if}
