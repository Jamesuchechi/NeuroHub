<script lang="ts">
	import { notesStore, extractTextFromTiptap } from '$lib/stores/notesStore.svelte';
	import { fade } from 'svelte/transition';
	import Avatar from '../ui/Avatar.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	let { noteId, onClose } = $props<{ noteId: string; onClose: () => void }>();

	let isLoading = $state(true);

	$effect(() => {
		if (noteId) {
			isLoading = true;
			notesStore.fetchNote(noteId).then(() => {
				isLoading = false;
			});
		}
	});

	// Use official robust Tiptap extractor
	const processedContent = $derived(
		notesStore.currentNote ? extractTextFromTiptap(notesStore.currentNote.content) : ''
	);
</script>

<div class="flex h-full flex-col bg-surface" in:fade>
	<div
		class="flex items-center justify-between border-b border-stroke/50 bg-surface-dim/30 px-4 py-3"
	>
		<button
			onclick={onClose}
			class="flex items-center gap-2 text-[10px] font-black tracking-widest text-content-dim uppercase transition-colors hover:text-brand-orange"
		>
			<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Context
		</button>
		<div class="flex items-center gap-2">
			<button
				class="text-content-dim transition-colors hover:text-content"
				aria-label="Open in Full Editor"
				title="Open in Full Editor"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
			</button>
		</div>
	</div>

	<div class="scrollbar-hide flex-1 overflow-y-auto p-6">
		{#if isLoading}
			<div class="space-y-4">
				<Skeleton width="80%" height="24px" />
				<Skeleton width="100%" height="100px" />
				<Skeleton width="90%" height="100px" />
			</div>
		{:else if notesStore.currentNote}
			<h1 class="mb-4 text-xl leading-tight font-black text-content">
				{notesStore.currentNote.title}
			</h1>

			<div class="mb-6 flex items-center gap-3">
				<Avatar name="Author" size="xs" />
				<div class="flex flex-col">
					<span class="text-[10px] leading-none font-bold text-content">Knowledge Entry</span>
					<span class="text-[9px] tracking-tighter text-content-dim uppercase"
						>Updated recently</span
					>
				</div>
				<div
					class="ml-auto rounded-md bg-brand-orange/10 px-2 py-0.5 text-[9px] font-black text-brand-orange uppercase"
				>
					{notesStore.currentNote.status}
				</div>
			</div>

			<div class="prose prose-sm max-w-none whitespace-pre-wrap text-content/90 prose-invert">
				{processedContent}
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center text-center opacity-50">
				<p class="text-xs">Resource not found</p>
			</div>
		{/if}
	</div>
</div>
