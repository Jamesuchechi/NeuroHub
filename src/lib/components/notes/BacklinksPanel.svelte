<script lang="ts">
	import { notesStore, type TiptapNode } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';

	let { noteId } = $props<{ noteId: string }>();

	$effect(() => {
		if (noteId) {
			notesStore.fetchBacklinks(noteId);
		}
	});
</script>

<div class="flex h-full flex-col border-l border-stroke bg-surface/30">
	<header class="flex h-14 items-center gap-2 border-b border-stroke px-4">
		<svg class="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
			/>
		</svg>
		<h3 class="text-xs font-bold tracking-widest text-content-dim uppercase">Backlinks</h3>
	</header>

	<div class="flex-1 overflow-x-hidden overflow-y-auto p-4">
		{#if notesStore.backlinks.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 py-10 text-center opacity-40">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-surface-dim"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
						/>
					</svg>
				</div>
				<p class="text-[10px] leading-relaxed font-medium">
					No notes currently link<br />to this entry.
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each notesStore.backlinks as link (link.id)}
					<a
						href={resolve(
							`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${link.id}` as unknown as '/'
						)}
						class="group flex w-full flex-col gap-1.5 rounded-xl border border-transparent bg-surface-dim/40 p-3 text-left transition-all hover:border-brand-orange/20 hover:bg-surface-dim"
						in:fade={{ duration: 300 }}
					>
						<span
							class="truncate text-xs font-semibold text-content transition-colors group-hover:text-brand-orange"
						>
							{link.title}
						</span>
						<span class="line-clamp-2 text-[10px] leading-relaxed text-content-dim/40">
							{link.content && typeof link.content === 'object'
								? (link.content as unknown as TiptapNode).content?.[0]?.content?.[0]?.text ||
									'View content...'
								: ''}
						</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
