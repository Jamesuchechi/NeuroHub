<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Highlight from '@tiptap/extension-highlight';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import Image from '@tiptap/extension-image';
	import Mention from '@tiptap/extension-mention';
	import { Wikilink } from './extensions/Wikilink';
	import { Mermaid } from './extensions/Mermaid';
	import { type Note, type TiptapNode } from '$lib/stores/notesStore.svelte';

	let { note, onToggleView, isAuthor } = $props<{
		note: Note;
		onToggleView: () => void;
		isAuthor: boolean;
	}>();

	let editor = $state<Editor | null>(null);

	function createEditor(node: HTMLElement) {
		editor = new Editor({
			element: node,
			editable: false,
			extensions: [
				StarterKit,
				Highlight,
				TaskList,
				TaskItem.configure({ nested: true }),
				Image,
				Wikilink,
				Mention,
				Mermaid
			],
			content: note.content as unknown as TiptapNode,
			editorProps: {
				attributes: {
					class: 'prose prose-invert prose-orange max-w-none prose-p:text-content-dim'
				}
			}
		});

		return {
			destroy() {
				editor?.destroy();
			}
		};
	}

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<div class="note-view-container h-full overflow-y-auto bg-surface/10">
	{#if isAuthor}
		<header
			class="no-print flex shrink-0 items-center justify-end border-b border-stroke bg-surface/50 p-2"
		>
			<button
				onclick={onToggleView}
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-surface/80 text-brand-orange transition-all hover:border-brand-orange hover:bg-brand-orange/10"
				title="Resume Editing"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>
		</header>
	{/if}

	<div class="mx-auto max-w-4xl px-6 py-12 print:px-0 print:py-0">
		<header class="mb-12 space-y-4 print:mb-8">
			<div class="flex flex-wrap gap-2">
				{#each note.tags || [] as tag (tag)}
					<span
						class="rounded-full bg-brand-orange/10 px-3 py-1 text-[10px] font-bold tracking-widest text-brand-orange uppercase"
					>
						{tag}
					</span>
				{/each}
			</div>
			<h1 class="text-5xl font-extrabold tracking-tight text-white">
				{note.title}
			</h1>
			<div class="flex items-center gap-4 text-xs text-content-dim/40">
				<span class="flex items-center gap-1.5">
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					{new Date(note.updated_at).toLocaleDateString()}
				</span>
				<span class="h-1 w-1 rounded-full bg-stroke"></span>
				<span>{note.is_public ? 'Public Access' : 'Workspace Only'}</span>
			</div>
		</header>

		<article use:createEditor></article>

		<footer
			class="mt-24 border-t border-stroke pt-12 text-center text-[10px] font-bold tracking-widest text-content-dim/20 uppercase print:hidden"
		>
			End of Entry — NeuroHub Knowledge Engine
		</footer>
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
		}
		:global(.prose) {
			--tw-prose-body: black;
			--tw-prose-headings: black;
			--tw-prose-links: #f59e0b;
		}
		.note-view-container {
			max-width: 100% !important;
		}
	}
</style>
