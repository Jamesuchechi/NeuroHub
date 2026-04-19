<script lang="ts">
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { fade, scale } from 'svelte/transition';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { toast } from '$lib/stores/toastStore';

	let { noteId } = $props<{ noteId: string }>();

	let inputVal = $state('');

	const tags = $derived(notesStore.currentNote?.tags || []);

	function addTag() {
		const tag = inputVal.trim().toLowerCase();
		if (tag && !tags.includes(tag)) {
			const newTags = [...tags, tag];
			notesStore.updateNote(noteId, { tags: newTags });
		}
		inputVal = '';
	}

	function removeTag(tagToRemove: string) {
		const newTags = tags.filter((t: string) => t !== tagToRemove);
		notesStore.updateNote(noteId, { tags: newTags });
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
			removeTag(tags[tags.length - 1]);
		}
	}

	async function suggestTags() {
		if (aiStore.isGenerating) return;
		const note = notesStore.currentNote;
		if (!note) return;

		const content = typeof note.content === 'string' ? note.content : JSON.stringify(note.content);
		const prompt = `Suggest 5 concise, relevant tags for this note. Return ONLY a comma-separated list of tags, no preamble.\nTitle: ${note.title}\nContent: ${content.slice(0, 1000)}`;

		const result = await aiStore.generateCustom(
			prompt,
			'You are a professional librarian assistant.'
		);
		if (result) {
			const suggested = result
				.split(',')
				.map((t) => t.trim().toLowerCase())
				.filter((t) => t && !tags.includes(t));
			if (suggested.length > 0) {
				const newTags = [...tags, ...suggested];
				notesStore.updateNote(noteId, { tags: newTags });
				toast.show(`Added ${suggested.length} suggested tags`, 'success');
			}
		}
	}
</script>

<div class="flex flex-wrap items-center gap-1.5 p-1">
	{#each tags as tag (tag)}
		<div
			in:scale={{ duration: 200, start: 0.8 }}
			out:fade={{ duration: 150 }}
			class="group flex items-center gap-1 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-2.5 py-1 text-[10px] font-bold text-brand-orange transition-all hover:border-brand-orange/40 hover:bg-brand-orange/10"
		>
			<span class="tracking-wider uppercase">{tag}</span>
			<button
				onclick={() => removeTag(tag)}
				class="inline-flex h-3 w-3 items-center justify-center rounded-full opacity-40 transition-all hover:bg-brand-orange hover:text-white hover:opacity-100"
				aria-label="Remove tag"
			>
				<svg class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="3"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	{/each}

	<div class="relative flex items-center">
		<input
			type="text"
			bind:value={inputVal}
			onkeydown={handleKeyDown}
			placeholder={tags.length === 0 ? 'Add tags...' : ''}
			class="h-7 min-w-[100px] border-none bg-transparent px-2 text-[10px] font-bold tracking-wider text-content uppercase outline-none placeholder:text-content-dim/20"
		/>
	</div>

	<button
		onclick={suggestTags}
		disabled={aiStore.isGenerating}
		class="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-orange/10 px-2 py-1 text-[9px] font-black tracking-widest text-brand-orange transition-all hover:bg-brand-orange/20 active:scale-95 disabled:opacity-50"
		title="Suggest tags with NeuroAI"
	>
		<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2.5"
				d="M13 10V3L4 14h7v7l9-11h-7z"
			/>
		</svg>
		{#if aiStore.isGenerating}
			SCANNING...
		{:else}
			SUGGEST TAGS
		{/if}
	</button>
</div>
