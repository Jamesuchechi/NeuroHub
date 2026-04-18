<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import type { Json } from '$lib/types/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '../ui/Button.svelte';

	let { onclose } = $props<{ onclose: () => void }>();

	let prompt = $state('');

	async function generate() {
		if (!prompt.trim() || aiStore.isGenerating) return;

		const result = await aiStore.generateNoteDraft(prompt);
		if (result) {
			const workspaceId = $workspaceStore.currentWorkspace?.id;
			const userId = $authStore.user?.id;
			if (workspaceId && userId) {
				const note = await notesStore.createNote(workspaceId, userId, prompt);
				if (note) {
					// Inject the generated HTML into the note
					await notesStore.updateNote(note.id, { content: result as Json });
					onclose();
					await goto(
						resolve(
							`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${note.id}` as unknown as '/'
						)
					);
				}
			}
		}
	}
</script>

<div
	onclick={onclose}
	aria-hidden="true"
	transition:fade={{ duration: 200 }}
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
>
	<div
		onclick={(e) => e.stopPropagation()}
		aria-hidden="true"
		transition:scale={{ duration: 400, start: 0.95, opacity: 0 }}
		class="relative w-full max-w-lg overflow-hidden rounded-3xl border border-stroke bg-surface shadow-2xl"
	>
		<!-- Gradient Background Glow -->
		<div
			class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-orange/10 blur-[100px]"
		></div>

		<div class="relative p-8">
			<div class="mb-8 flex items-center gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-bold text-content">Magic Note Generator</h2>
					<p class="text-xs text-content-dim">What knowledge entry should the AI draft today?</p>
				</div>
			</div>

			<textarea
				bind:value={prompt}
				placeholder="e.g. Deep dive into React Server Components, Summary of Atomic Habits, or Technical guide for Postgres partitioning..."
				class="mb-6 h-32 w-full resize-none rounded-2xl border border-stroke bg-surface-dim/30 p-4 text-sm text-content transition-all placeholder:text-content-dim/30 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none disabled:opacity-50"
				disabled={aiStore.isGenerating}
			></textarea>

			{#if aiStore.error}
				<p class="mb-4 text-xs font-medium text-red-500">{aiStore.error}</p>
			{/if}

			<div class="flex justify-end gap-3">
				<button
					onclick={onclose}
					class="px-6 py-2.5 text-xs font-bold text-content-dim transition-colors hover:text-white"
				>
					Cancel
				</button>
				<Button
					onclick={generate}
					disabled={!prompt.trim() || aiStore.isGenerating}
					class="min-w-[140px]"
				>
					{#if aiStore.isGenerating}
						<div class="flex items-center gap-2">
							<div
								class="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white"
							></div>
							Drafting...
						</div>
					{:else}
						Generate Note ✨
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
