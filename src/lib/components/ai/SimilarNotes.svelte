<script lang="ts">
	import { notesStore, type SimilarNote } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { fade, slide } from 'svelte/transition';

	const noteId = $derived(page.params.noteId);
	const workspace = $derived($workspaceStore.currentWorkspace);

	// Trigger lookup when note content or ID changes
	$effect(() => {
		if (noteId && workspace && notesStore.currentNote?.content) {
			const text = JSON.stringify(notesStore.currentNote.content);
			// Debounce to avoid excessive API calls
			const timer = setTimeout(() => {
				notesStore.findSimilarNotes(noteId, text, workspace.id);
			}, 2000);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<p class="text-[10px] font-bold tracking-wider text-content-dim uppercase">Similar Knowledge</p>
		<span
			class="rounded bg-brand-orange/10 px-1.5 py-0.5 text-[8px] font-bold text-brand-orange uppercase"
		>
			Semantic
		</span>
	</div>

	{#if notesStore.similarNotes.length > 0}
		<div class="space-y-2" in:fade>
			{#each notesStore.similarNotes as SimilarNote[] as note (note.id)}
				<a
					href={resolve(`/workspace/${workspace?.slug}/notes/${note.id}` as unknown as '/')}
					class="group block rounded-lg border border-stroke bg-surface/30 p-3 transition-all hover:border-brand-orange/30 hover:bg-surface"
					in:slide={{ duration: 300 }}
				>
					<div class="mb-1 flex items-center justify-between">
						<h4
							class="truncate text-xs font-bold text-content transition-colors group-hover:text-brand-orange"
						>
							{note.title}
						</h4>
						<span class="text-[9px] font-medium text-content-dim">
							{Math.round(note.similarity * 100)}%
						</span>
					</div>
					{#if note.content_text}
						<p class="line-clamp-2 text-[10px] leading-relaxed text-content-dim">
							{note.content_text}
						</p>
					{/if}
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-stroke p-4 text-center">
			<p class="text-[10px] text-content-dim italic">
				No similar notes found yet. AI is still learning your project context.
			</p>
		</div>
	{/if}
</div>
