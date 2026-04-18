<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import NoteCard from './NoteCard.svelte';
	import Input from '../ui/Input.svelte';

	import AINoteModal from './AINoteModal.svelte';

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let showAIModal = $state(false);

	$effect(() => {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (workspaceId) {
			if (searchTimeout) clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				notesStore.searchNotes(workspaceId, searchQuery);
			}, 300);
		}
	});

	const pinnedNotes = $derived(notesStore.pinnedNotes);
	const unpinnedNotes = $derived(notesStore.unpinnedNotes);

	async function createNewNote() {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		const userId = $authStore.user?.id;
		if (!workspaceId || !userId) return;

		const note = await notesStore.createNote(workspaceId, userId, 'New Knowledge Entry');
		if (note) {
			await goto(
				resolve(
					`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${note.id}` as unknown as '/'
				)
			);
		}
	}
</script>

<div class="flex h-full flex-col bg-surface-dim/30">
	<div class="flex flex-col gap-4 p-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold text-content">Knowledge Base</h2>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (showAIModal = true)}
					class="flex h-8 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-brand-orange to-orange-400 px-3 text-white shadow-lg shadow-brand-orange/20 transition-all hover:scale-105 active:scale-95"
					title="Create with AI"
				>
					<svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
						<path
							d="M12 2L9.19 8.63 2 10.24l5.46 4.73L5.82 22 12 18.25 18.18 22l-1.64-7.03L22 10.24l-7.19-1.61L12 2z"
						/>
					</svg>
					<span class="text-[10px] font-bold tracking-wider uppercase">AI Note</span>
				</button>
				<button
					onclick={createNewNote}
					class="group flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim text-content-dim transition-all hover:bg-surface-dim hover:text-white"
					title="New Note"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>
		</div>

		<div class="relative">
			<Input bind:value={searchQuery} placeholder="Search notes or tags..." class="h-9 text-xs" />
		</div>
	</div>

	<div class="flex-1 overflow-y-auto px-2 pb-4">
		{#if notesStore.isLoading && notesStore.notes.length === 0}
			<div class="flex flex-col gap-2 p-2">
				{#each Array(5) as _, i (i)}
					<div class="h-20 w-full animate-pulse rounded-xl bg-surface-dim/50"></div>
				{/each}
			</div>
		{:else if pinnedNotes.length === 0 && unpinnedNotes.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 p-8 text-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-dim/50 text-content-dim/20"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				</div>
				<p class="text-xs font-medium text-content-dim/40">No entries found</p>
			</div>
		{:else}
			<div class="flex flex-col gap-6">
				{#if pinnedNotes.length > 0}
					<section>
						<header class="mb-2 px-2">
							<span class="text-[10px] font-bold tracking-widest text-brand-orange uppercase"
								>Pinned</span
							>
						</header>
						<div class="flex flex-col gap-1">
							{#each pinnedNotes as note (note.id)}
								<NoteCard
									{note}
									active={page.params.noteId === note.id}
									href={`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${note.id}`}
								/>
							{/each}
						</div>
					</section>
				{/if}

				<section>
					{#if pinnedNotes.length > 0}
						<header class="mb-2 px-2">
							<span class="text-[10px] font-bold tracking-widest text-content-dim/40 uppercase"
								>All Notes</span
							>
						</header>
					{/if}
					<div class="flex flex-col gap-1">
						{#each unpinnedNotes as note (note.id)}
							<NoteCard
								{note}
								active={page.params.noteId === note.id}
								href={`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${note.id}`}
							/>
						{/each}
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>

{#if showAIModal}
	<AINoteModal onclose={() => (showAIModal = false)} />
{/if}
