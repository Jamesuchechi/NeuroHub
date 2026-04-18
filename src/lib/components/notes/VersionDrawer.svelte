<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { formatDistanceToNow } from 'date-fns';
	import { notesStore, extractTextFromTiptap } from '$lib/stores/notesStore.svelte';
	import type { TiptapNode } from '$lib/stores/notesStore.svelte';
	import type { NoteVersionsTable } from '$lib/types/db';
	import DiffViewer from './DiffViewer.svelte';

	let { noteId, onclose } = $props<{ noteId: string; onclose: () => void }>();

	onMount(() => {
		notesStore.fetchVersions(noteId);
	});

	const currentText = $derived(extractTextFromTiptap(notesStore.currentNote?.content));

	async function restoreVersion(version: NoteVersionsTable['Row']) {
		if (
			confirm(
				'Are you sure you want to restore this version? Your current unsaved changes will be lost.'
			)
		) {
			await notesStore.updateNote(noteId, {
				content: version.content as unknown as TiptapNode
			});
			onclose();
		}
	}
</script>

<div
	onclick={onclose}
	aria-hidden="true"
	transition:fade={{ duration: 300 }}
	class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
></div>

<div
	transition:fly={{ x: 400, duration: 400 }}
	class="fixed top-0 right-0 z-50 h-full w-[400px] border-l border-stroke bg-surface shadow-2xl"
>
	<header class="flex h-16 items-center justify-between border-b border-stroke px-6">
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<div class="flex flex-col">
				<h3 class="text-sm font-bold text-white">Version History</h3>
				<p class="text-[10px] tracking-widest text-content-dim/40 uppercase">Snapshot records</p>
			</div>
		</div>
		<button
			onclick={onclose}
			aria-label="Close version history"
			title="Close version history"
			class="rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-white"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</header>

	<div class="h-[calc(100%-4rem)] overflow-y-auto p-6">
		{#if notesStore.versions.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
				<div class="h-12 w-12 rounded-full border border-stroke bg-surface-dim/40 p-3 opacity-20">
					<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<p class="text-xs leading-relaxed font-medium text-content-dim/40">
					No versions found for this note.<br />Snapshots are saved during key milestones.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each notesStore.versions as version (version.id)}
					<div
						class="group relative flex flex-col gap-3 rounded-2xl border border-stroke bg-surface-dim/30 p-4 transition-all hover:bg-surface-dim/50"
					>
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-brand-orange">
								{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
							</span>
							<button
								onclick={() => restoreVersion(version)}
								class="rounded-lg bg-surface-dim px-3 py-1.5 text-[10px] font-bold tracking-wider text-content-dim uppercase transition-all hover:bg-brand-orange hover:text-white"
							>
								Restore
							</button>
						</div>

						<div class="flex flex-col gap-2">
							<p class="text-[10px] font-bold tracking-widest text-content-dim/20 uppercase">
								Changes from this version
							</p>
							{#if typeof version.content === 'object'}
								<DiffViewer
									oldText={extractTextFromTiptap(version.content)}
									newText={currentText}
								/>
							{:else}
								<p class="font-mono text-[10px] text-content-dim opacity-60">Preview unavailable</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
