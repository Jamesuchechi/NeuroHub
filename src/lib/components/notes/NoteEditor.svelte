<script lang="ts">
	import { onDestroy, untrack, tick } from 'svelte';
	import { supabase } from '$lib/services/supabase';
	import { fade } from 'svelte/transition';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Highlight from '@tiptap/extension-highlight';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import Image from '@tiptap/extension-image';
	import Mention from '@tiptap/extension-mention';
	import { Wikilink } from './extensions/Wikilink';
	import suggestion from './extensions/suggestion';
	import mentionSuggestion from './extensions/mentionSuggestion';
	import { Mermaid } from './extensions/Mermaid';
	import { notesStore, type TiptapNode } from '$lib/stores/notesStore.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import VersionDrawer from './VersionDrawer.svelte';
	import TagEditor from './TagEditor.svelte';
	import Button from '../ui/Button.svelte';
	import { toast } from '$lib/stores/toastStore';

	let { noteId } = $props<{ noteId: string }>();

	let editor = $state<Editor | null>(null);
	let showHistory = $state(false);
	let saveTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let lastLoadedId = $state<string | null>(null);

	const isPublished = $derived(notesStore.currentNote?.status === 'published');

	function saveContentImmediate() {
		if (editor && noteId) {
			const json = editor.getJSON();
			notesStore.updateNote(noteId, { content: json as unknown as TiptapNode });
		}
	}

	onDestroy(() => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveContentImmediate();
		}
	});

	// Watch for note changes and update editor content
	$effect(() => {
		// Dependencies: Access editor, currentNote reference, and noteId
		if (editor && notesStore.currentNote) {
			const activeId = noteId;
			const noteRef = notesStore.currentNote;

			untrack(() => {
				if (noteRef.id !== activeId) return;

				const currentContent = editor!.getJSON();
				const newContent = noteRef.content;

				const isNavigation = lastLoadedId !== activeId;
				const isRemoteUpdate =
					!editor!.isFocused && JSON.stringify(currentContent) !== JSON.stringify(newContent);

				if (isNavigation || isRemoteUpdate) {
					// TipTap Fix: Wrap in setTimeout to avoid mid-transaction plugin view updates (getState error)
					setTimeout(async () => {
						if (editor && !editor.isDestroyed && notesStore.currentNote?.id === activeId) {
							try {
								editor.commands.setContent(newContent as unknown as TiptapNode, {
									emitUpdate: false
								});
								lastLoadedId = activeId;
								await tick();
							} catch (e) {
								console.error('[NoteEditor] Content sync error:', e);
							}
						}
					}, 0);
				}
			});
		}
	});

	async function duplicateNote() {
		const userId = $authStore.user?.id;
		if (userId && noteId) {
			const newNote = await notesStore.duplicateNote(noteId, userId);
			if (newNote) {
				goto(
					resolve(
						`/workspace/${$workspaceStore.currentWorkspace?.slug}/notes/${newNote}` as unknown as '/'
					)
				);
			}
		}
	}

	import TurndownService from 'turndown';
	import { aiStore } from '$lib/stores/aiStore.svelte';

	async function aiDraft() {
		const title = notesStore.currentNote?.title;
		if (!title || title === 'New Knowledge Entry' || aiStore.isGenerating) {
			toast.show('Please enter a specific title first', 'error');
			return;
		}

		if (
			confirm(
				'✨ AI Draft: NeuroAI will populate the editor based on your title. This will replace current content. Continue?'
			)
		) {
			const result = await aiStore.generateNoteDraft(title);
			if (result && editor) {
				editor.commands.setContent(result);
				toast.show('Note drafted successfully', 'success');
			}
		}
	}

	async function aiExpand() {
		if (!editor || aiStore.isGenerating) return;

		const selection = editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			' '
		);
		const context = selection || editor.getText();

		if (!context.trim()) {
			toast.show('Please write something first or select text to expand', 'error');
			return;
		}

		const result = await aiStore.expandContent(context);
		if (result) {
			editor.commands.insertContentAt(editor.state.selection.to, result);
			toast.show('Content expanded ✨', 'success');
		}
	}

	async function aiImprove() {
		if (!editor || aiStore.isGenerating) return;

		const selection = editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			' '
		);
		const content = selection || editor.getText();

		if (!content.trim()) {
			toast.show('Please select text or write something first to improve', 'error');
			return;
		}

		const result = await aiStore.improveContent(content);
		if (result) {
			if (selection) {
				editor.commands.insertContentAt(
					{ from: editor.state.selection.from, to: editor.state.selection.to },
					result
				);
			} else {
				editor.commands.setContent(result);
			}
			toast.show('Content improved ✨', 'success');
		}
	}

	function exportMarkdown() {
		if (!editor) return;
		const title = notesStore.currentNote?.title || 'note';

		const turndownService = new TurndownService({
			headingStyle: 'atx',
			hr: '---',
			bulletListMarker: '-',
			codeBlockStyle: 'fenced'
		});

		const html = editor.getHTML();
		const markdown = turndownService.turndown(html);

		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
		a.click();
		URL.revokeObjectURL(url);
		toast.show('Markdown exported', 'success');
	}

	function exportPdf() {
		window.print();
	}

	async function uploadImage(file: File) {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (!workspaceId) return null;

		const fileExt = file.name.split('.').pop();
		const fileName = `${workspaceId}/${crypto.randomUUID()}.${fileExt}`;
		const filePath = `${fileName}`;

		const { error } = await supabase.storage.from('note-attachments').upload(filePath, file);

		if (error) {
			console.error('[NoteEditor] Image upload error:', error);
			toast.show('Failed to upload image', 'error');
			return null;
		}

		const {
			data: { publicUrl }
		} = supabase.storage.from('note-attachments').getPublicUrl(filePath);

		return publicUrl;
	}

	function createEditor(node: HTMLElement) {
		editor = new Editor({
			element: node,
			extensions: [
				StarterKit.configure({
					link: {
						openOnClick: false,
						HTMLAttributes: {
							class: 'text-brand-orange hover:underline cursor-pointer'
						}
					}
				}),
				Placeholder.configure({
					placeholder: 'Start writing or type [[ for bi-directional links...'
				}),
				Highlight,
				TaskList,
				TaskItem.configure({
					nested: true
				}),
				Image.configure({
					inline: true,
					allowBase64: true,
					HTMLAttributes: {
						class: 'rounded-lg border border-stroke max-w-full'
					}
				}),
				Wikilink.configure({
					suggestion
				}),
				Mention.configure({
					HTMLAttributes: {
						class:
							'mention bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded px-1 py-0.5 font-bold'
					},
					suggestion: mentionSuggestion
				}),
				Mermaid
			],
			content: notesStore.currentNote?.content as unknown as TiptapNode,
			onUpdate: ({ editor: newEditor }) => {
				if (saveTimeout) clearTimeout(saveTimeout);
				saveTimeout = setTimeout(() => {
					const json = newEditor.getJSON();
					notesStore.updateNote(noteId, { content: json as unknown as TiptapNode });
					saveTimeout = null;
				}, 500);
			},
			editorProps: {
				handleDrop: (view, event, slice, moved) => {
					if (
						!moved &&
						event.dataTransfer &&
						event.dataTransfer.files &&
						event.dataTransfer.files[0]
					) {
						const file = event.dataTransfer.files[0];
						if (file.type.startsWith('image/')) {
							uploadImage(file).then((url) => {
								if (url && editor) {
									editor.chain().focus().setImage({ src: url }).run();
								}
							});
							return true;
						}
					}
					return false;
				},
				handlePaste: (view, event) => {
					if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
						const file = event.clipboardData.files[0];
						if (file.type.startsWith('image/')) {
							uploadImage(file).then((url) => {
								if (url && editor) {
									editor.chain().focus().setImage({ src: url }).run();
								}
							});
							return true;
						}
					}
					return false;
				},
				handleClick: (view, pos, event) => {
					const target = event.target as HTMLElement;
					const wikilink = target.closest('[data-wikilink]');
					if (wikilink) {
						const id = wikilink.getAttribute('data-id');
						if (id && $workspaceStore.currentWorkspace) {
							goto(
								resolve(
									`/workspace/${$workspaceStore.currentWorkspace.slug}/notes/${id}` as unknown as '/'
								)
							).catch(console.error);
							return true;
						}
					}
					return false;
				},
				attributes: {
					class:
						'prose dark:prose-invert prose-orange max-w-none focus:outline-none min-h-[500px] py-8 px-4'
				}
			}
		});

		return {
			destroy() {
				editor?.destroy();
			}
		};
	}
</script>

<div class="note-editor-container flex h-full flex-col bg-surface-dim/20">
	<!-- Toolbar Section -->
	<header
		class="no-print flex shrink-0 items-center justify-between border-b border-stroke bg-surface/50 p-2"
	>
		<div class="flex items-center gap-1">
			{#if editor}
				<button
					onclick={() => editor?.chain().focus().toggleBold().run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('bold')
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="Bold"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
						<path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
					</svg>
				</button>

				<button
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('italic')
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="Italic"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="19" y1="4" x2="10" y2="4" />
						<line x1="14" y1="20" x2="5" y2="20" />
						<line x1="15" y1="4" x2="9" y2="20" />
					</svg>
				</button>

				<div class="mx-1 h-4 w-px bg-stroke"></div>

				<button
					onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('heading', {
						level: 1
					})
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="H1"
				>
					H1
				</button>

				<button
					onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('heading', {
						level: 2
					})
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="H2"
				>
					H2
				</button>

				<div class="mx-1 h-4 w-px bg-stroke"></div>

				<button
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('bulletList')
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="Bullet List"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="8" y1="6" x2="21" y2="6" />
						<line x1="8" y1="12" x2="21" y2="12" />
						<line x1="8" y1="18" x2="21" y2="18" />
						<line x1="3" y1="6" x2="3.01" y2="6" />
						<line x1="3" y1="12" x2="3.01" y2="12" />
						<line x1="3" y1="18" x2="3.01" y2="18" />
					</svg>
				</button>

				<button
					onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {editor.isActive('codeBlock')
						? 'bg-surface-dim text-brand-orange'
						: 'text-content-dim'}"
					title="Code Block"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<polyline points="16 18 22 12 16 6" />
						<polyline points="8 6 2 12 8 18" />
					</svg>
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<span class="text-[10px] font-medium tracking-wider text-content-dim/40 uppercase">
				{notesStore.isSaving ? 'Saving...' : 'Auto-saved'}
			</span>

			<div class="mx-2 h-4 w-px bg-stroke"></div>

			<!-- Actions Dropdown Simulation -->
			<div class="flex items-center gap-1">
				<button
					onclick={() => notesStore.togglePin(noteId)}
					class="rounded p-1.5 transition-colors hover:bg-surface-dim {notesStore.currentNote
						?.is_pinned
						? 'text-brand-orange'
						: 'overlay-hover:text-white text-content-dim'}"
					title={notesStore.currentNote?.is_pinned ? 'Unpin Note' : 'Pin Note'}
				>
					<svg
						class="h-4 w-4"
						fill={notesStore.currentNote?.is_pinned ? 'currentColor' : 'none'}
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
					onclick={duplicateNote}
					class="rounded p-1.5 text-content-dim transition-colors hover:bg-surface-dim hover:text-white"
					title="Duplicate Note"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
						/>
					</svg>
				</button>

				<button
					onclick={exportMarkdown}
					class="rounded p-1.5 text-content-dim transition-colors hover:bg-surface-dim hover:text-white"
					title="Export as Markdown"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				</button>

				<button
					onclick={exportPdf}
					class="rounded p-1.5 text-content-dim transition-colors hover:bg-surface-dim hover:text-white"
					title="Print/PDF"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
						/>
					</svg>
				</button>
			</div>

			<div class="mx-2 h-4 w-px bg-stroke"></div>

			<div class="mx-2 h-4 w-px bg-stroke"></div>

			<!-- AI Magic Actions -->
			<div class="flex items-center gap-1.5 px-2">
				<button
					onclick={aiDraft}
					disabled={aiStore.isGenerating}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim text-brand-orange shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
					title="✨ AI Draft (from Title)"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</button>
				<button
					onclick={aiExpand}
					disabled={aiStore.isGenerating}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim text-brand-orange shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
					title="🪄 AI Expand/Continue"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						/>
					</svg>
				</button>
				<button
					onclick={aiImprove}
					disabled={aiStore.isGenerating}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim text-brand-orange shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
					title="🛡️ AI Refine/Improve"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
				</button>
			</div>

			<div class="mx-2 h-4 w-px bg-stroke"></div>

			<button
				onclick={() => {
					const userId = $authStore.user?.id;
					if (userId && editor) {
						notesStore.createSnapshot(noteId, userId, editor.getJSON());
					}
				}}
				class="rounded p-1.5 text-content-dim transition-colors hover:bg-surface-dim hover:text-white"
				title="Save Snapshot"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
					/>
				</svg>
			</button>

			<button
				onclick={() => (showHistory = !showHistory)}
				class="rounded p-1.5 text-content-dim transition-colors hover:bg-surface-dim hover:text-white {showHistory
					? 'bg-surface-dim text-brand-orange'
					: ''}"
				title="Version History"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</button>

			<Button
				variant={isPublished ? 'secondary' : 'primary'}
				size="sm"
				width="auto"
				onclick={() =>
					notesStore.updateNote(noteId, {
						status: isPublished ? 'draft' : 'published'
					})}
				class="h-8 px-3 text-[10px] font-bold tracking-wider uppercase"
			>
				{isPublished ? 'Unpublish' : 'Publish'}
			</Button>
		</div>
	</header>

	<!-- Tag Editor Section -->
	<div class="no-print border-b border-stroke bg-surface/30 px-4 py-1.5">
		<TagEditor {noteId} />
	</div>

	<!-- Version History Drawer Overlay -->
	{#if showHistory}
		<VersionDrawer {noteId} onclose={() => (showHistory = false)} />
	{/if}

	<!-- Editor Surface -->
	<div class="flex-1 overflow-x-hidden overflow-y-auto">
		{#if notesStore.isOffline}
			<div
				class="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 transition-all"
				in:fade
			>
				<svg
					class="h-3.5 w-3.5 text-amber-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2.5"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<span class="text-[10px] font-bold tracking-widest text-amber-500 uppercase"
					>Working Offline — Saving Locally</span
				>
			</div>
		{/if}

		<div class="mx-auto max-w-4xl px-4 py-8">
			<input
				type="text"
				value={notesStore.currentNote!.title}
				oninput={(e) => {
					const target = e.currentTarget;
					const newTitle = target.value;
					if (notesStore.currentNote) notesStore.currentNote.title = newTitle;

					if (saveTimeout) clearTimeout(saveTimeout);
					saveTimeout = setTimeout(() => {
						notesStore.updateNote(noteId, { title: newTitle });
						saveTimeout = null;
					}, 500);
				}}
				placeholder="Note Title"
				class="mb-6 w-full bg-transparent text-4xl font-bold text-content outline-none placeholder:text-content-dim/20"
			/>
			<div use:createEditor></div>
		</div>
	</div>
</div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #52525b;
		pointer-events: none;
		height: 0;
	}

	:global(.prose) {
		--tw-prose-body: var(--color-content, #3f3f46);
		--tw-prose-headings: var(--color-content, #18181b);
		--tw-prose-links: #f59e0b;
		--tw-prose-bold: inherit;
		--tw-prose-code: inherit;
		--tw-prose-pre-code: inherit;
		--tw-prose-pre-bg: #18181b;
	}

	:global(.dark .prose) {
		--tw-prose-body: #d4d4d8;
		--tw-prose-headings: #f4f4f5;
		--tw-prose-links: #f59e0b;
		--tw-prose-bold: #f4f4f5;
		--tw-prose-code: #f4f4f5;
		--tw-prose-pre-code: #f4f4f5;
		--tw-prose-pre-bg: #18181b;
	}
</style>
