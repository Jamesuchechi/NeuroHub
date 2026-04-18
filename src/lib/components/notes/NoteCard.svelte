<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';
	import { notesStore, type Note, type TiptapNode } from '$lib/stores/notesStore.svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { workspaceStore } from '$lib/stores/workspaceStore';

	let {
		note,
		active = false,
		href
	} = $props<{
		note: Note;
		active?: boolean;
		href: string;
	}>();

	// Simple plain-text excerpt from Tiptap JSON
	const excerpt = $derived.by(() => {
		if (!note.content || typeof note.content !== 'object') return '';
		const doc = note.content as TiptapNode;
		if (doc.type === 'doc' && doc.content) {
			// Find first paragraph or text node
			const firstText = doc.content.find((c) => c.type === 'paragraph')?.content?.[0]?.text;
			return firstText || 'No additional content';
		}
		return '';
	});
</script>

<div class="group relative">
	<a
		href={resolve(href as unknown as '/')}
		class="flex flex-col gap-2 rounded-xl border p-3 transition-all hover:scale-[1.02] active:scale-[0.98] {active
			? 'border-brand-orange bg-brand-orange/10 shadow-lg shadow-brand-orange/5'
			: 'hover:border-stroke-focus border-stroke bg-surface-dim/20 hover:bg-surface-dim/40'}"
	>
		<div class="flex items-start justify-between gap-2">
			<h3 class="line-clamp-1 text-xs font-bold {active ? 'text-white' : 'text-content'}">
				{note.title || 'Untitled Note'}
			</h3>
			{#if note.is_pinned}
				<svg class="h-3 w-3 shrink-0 text-brand-orange" viewBox="0 0 20 20" fill="currentColor">
					<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
				</svg>
			{/if}
		</div>

		<p class="line-clamp-2 text-[10px] leading-relaxed text-content-dim/60">
			{excerpt}
		</p>

		<div class="flex items-center justify-between">
			<div class="flex gap-1 overflow-hidden">
				{#each (note.tags || []).slice(0, 2) as tag (tag)}
					<span
						class="rounded-full bg-surface-dim/50 px-1.5 py-0.5 text-[8px] font-bold text-content-dim/40 uppercase"
					>
						{tag}
					</span>
				{/each}
			</div>
			<span class="text-[8px] font-medium text-content-dim/30">
				{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
			</span>
		</div>
	</a>

	<button
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			notesStore.togglePin(note.id);
		}}
		class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-surface opacity-0 shadow-xl shadow-black/20 transition-all group-hover:opacity-100 {note.is_pinned
			? 'text-brand-orange'
			: 'text-content-dim'}"
		title={note.is_pinned ? 'Unpin' : 'Pin'}
	>
		<svg
			class="h-3.5 w-3.5"
			fill={note.is_pinned ? 'currentColor' : 'none'}
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
			/>
		</svg>
	</button>

	<button
		onclick={async (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (confirm('Permanently delete this knowledge entry?')) {
				const success = await notesStore.deleteNote(note.id);
				if (success && active) {
					const slug = $workspaceStore.currentWorkspace?.slug;
					if (slug) {
						await goto(resolve(`/workspace/${slug}/notes` as unknown as '/'));
					}
				}
			}
		}}
		class="absolute top-10 right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-surface text-content-dim opacity-0 shadow-xl shadow-black/20 transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
		title="Delete Note"
	>
		<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
			/>
		</svg>
	</button>
</div>

{#if active}
	<div class="absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full bg-brand-orange"></div>
{/if}
