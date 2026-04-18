<script lang="ts">
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';

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

<div class="flex h-full w-full items-center justify-center bg-surface-dim/20 p-8 text-center">
	<div class="max-w-md space-y-6">
		<div
			class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-orange/10 bg-brand-orange/5 text-brand-orange shadow-2xl shadow-brand-orange/5"
		>
			<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
				/>
			</svg>
		</div>

		<div class="space-y-2">
			<h2 class="text-2xl font-bold text-white">Your Workspace Knowledge</h2>
			<p class="text-sm leading-relaxed text-content-dim/60">
				Capture insights, document processes, and connect ideas. <br />
				Start by creating your first knowledge note.
			</p>
		</div>

		<Button variant="primary" size="lg" width="auto" onclick={createNewNote} class="group mx-auto">
			<svg
				class="mr-2 h-4 w-4 transition-transform group-hover:rotate-90"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.5"
					d="M12 4v16m8-8H4"
				/>
			</svg>
			Create New Note
		</Button>
	</div>
</div>
