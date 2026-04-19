import { SvelteSet } from 'svelte/reactivity';
import { supabase } from '$lib/services/supabase';
import { toast } from '$lib/stores/toastStore';
import type { NotesTable, NoteVersionsTable, Json } from '$lib/types/db';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

type NoteRow = NotesTable['Row'];
export type Note = NoteRow & {
	is_pinned: boolean;
	share_token: string | null;
};
type NoteUpdate = NotesTable['Update'] & {
	is_pinned?: boolean;
	share_token?: string | null;
};

export type SimilarNote = Note & {
	similarity: number;
	content_text: string;
};

interface NotesDB {
	from(table: 'notes'): {
		select(columns?: string): {
			eq(
				k: string,
				v: string
			): {
				order(k: string, o: { ascending: boolean }): Promise<PostgrestResponse<Note>>;
				single(): Promise<PostgrestSingleResponse<Note>>;
			};
			single(): Promise<PostgrestSingleResponse<Note>>;
		};
		insert(values: NotesTable['Insert']): {
			select(): {
				single(): Promise<PostgrestSingleResponse<Note>>;
			};
		};
		update(values: NotesTable['Update']): {
			eq(
				k: string,
				v: string
			): {
				select(): {
					single(): Promise<PostgrestSingleResponse<Note>>;
				};
			};
		};
		delete(): {
			eq(k: string, v: string): Promise<{ error: Error | null }>;
		};
	};
	from(table: 'note_versions'): {
		select(columns?: string): {
			eq(
				k: string,
				v: string
			): {
				order(
					k: string,
					o: { ascending: boolean }
				): Promise<PostgrestResponse<NoteVersionsTable['Row']>>;
			};
		};
		insert(values: NoteVersionsTable['Insert']): {
			select(): {
				single(): Promise<PostgrestSingleResponse<NoteVersionsTable['Row']>>;
			};
		};
	};
	from(table: 'note_links'): {
		insert(
			values: Array<{ from_note_id: string; to_note_id: string }>
		): Promise<{ error: Error | null }>;
		delete(): {
			eq(k: string, v: string): Promise<{ error: Error | null }>;
		};
		select(columns?: string): {
			eq(
				k: string,
				v: string
			): Promise<PostgrestResponse<{ from_note_id: string; notes: Note | null }>>;
		};
	};
	rpc(
		fn: 'duplicate_note',
		args: { note_id: string; new_author_id: string }
	): Promise<{ data: string | null; error: unknown }>;
	from(table: string): {
		select(columns?: string): unknown;
		insert(values: unknown): unknown;
		update(values: unknown): unknown;
		delete(): unknown;
	};
}

const db = supabase as unknown as NotesDB;

export interface TiptapNode {
	type: string;
	content?: TiptapNode[];
	attrs?: Record<string, Json | undefined>;
	text?: string;
	[key: string]: Json | undefined;
}

function extractWikilinkIds(content: TiptapNode | unknown): string[] {
	if (!content || typeof content !== 'object') return [];
	const ids = new SvelteSet<string>();

	const traverse = (node: TiptapNode) => {
		if (node.type === 'wikilink' && node.attrs?.id) {
			ids.add(node.attrs.id as string);
		}
		if (node.content) {
			node.content.forEach(traverse);
		}
	};

	traverse(content as TiptapNode);
	return Array.from(ids);
}

export function extractTextFromTiptap(content: TiptapNode | unknown): string {
	if (!content || typeof content !== 'object') return '';
	let result = '';

	const traverse = (node: TiptapNode) => {
		if (node.type === 'text' && node.text) {
			result += node.text;
		} else if (node.type === 'hardBreak') {
			result += '\n';
		} else if (node.type === 'paragraph' || node.type === 'heading') {
			result += '\n';
		}

		if (node.content) {
			node.content.forEach(traverse);
		}
	};

	traverse(content as TiptapNode);
	return result.trim();
}

class NotesStore {
	#notes = $state<Note[]>([]);
	#currentNote = $state<Note | null>(null);
	#backlinks = $state<Note[]>([]);
	#versions = $state<NoteVersionsTable['Row'][]>([]);
	#similarNotes = $state<SimilarNote[]>([]);
	#isLoading = $state(false);
	#isSaving = $state(false);
	#isOffline = $state(false);
	#error = $state<string | null>(null);

	// Getters
	get notes() {
		return this.#notes;
	}
	get currentNote() {
		return this.#currentNote;
	}
	get backlinks() {
		return this.#backlinks;
	}
	get versions() {
		return this.#versions;
	}
	get isLoading() {
		return this.#isLoading;
	}
	get isSaving() {
		return this.#isSaving;
	}
	get isOffline() {
		return this.#isOffline;
	}
	get error() {
		return this.#error;
	}
	get similarNotes(): SimilarNote[] {
		return this.#similarNotes;
	}

	#lastSnapshotText = '';
	#snapshotTimeout: ReturnType<typeof setTimeout> | null = null;

	get pinnedNotes() {
		return this.#notes.filter((n) => n.is_pinned);
	}

	get unpinnedNotes() {
		return this.#notes.filter((n) => !n.is_pinned);
	}

	async fetchNotes(workspaceId: string) {
		this.#isLoading = true;
		this.#error = null;

		try {
			const { data, error } = await db
				.from('notes')
				.select('*')
				.eq('workspace_id', workspaceId)
				.order('updated_at', { ascending: false });

			if (error) throw error;
			this.#notes = data || [];
		} catch (err: unknown) {
			this.#error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[NotesStore] fetchNotes error:', err);
		} finally {
			this.#isLoading = false;
		}
	}

	async fetchNote(noteId: string) {
		this.#isLoading = true;
		this.#error = null;

		try {
			const { data, error } = await db.from('notes').select('*').eq('id', noteId).single();

			if (error) throw error;
			this.#currentNote = data;
			return data;
		} catch (err: unknown) {
			this.#error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[NotesStore] fetchNote error:', err);
			return null;
		} finally {
			this.#isLoading = false;
		}
	}

	async createNote(workspaceId: string, authorId: string, title = 'Untitled Note') {
		this.#isLoading = true;
		try {
			const { data, error } = await db
				.from('notes')
				.insert({
					workspace_id: workspaceId,
					author_id: authorId,
					title,
					content: { type: 'doc', content: [] } as TiptapNode,
					status: 'draft'
				})
				.select()
				.single();

			if (error) throw error;
			this.#notes = [data, ...this.#notes];
			this.#currentNote = data;
			return data;
		} catch (err: unknown) {
			this.#error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[NotesStore] createNote error:', err);
			return null;
		} finally {
			this.#isLoading = false;
		}
	}

	async updateNote(noteId: string, updates: NoteUpdate) {
		// 1. Optimistic Update
		const previousNotes = [...this.#notes];
		const previousCurrentNote = this.#currentNote ? { ...this.#currentNote } : null;

		this.#notes = this.#notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n));
		if (this.#currentNote?.id === noteId) {
			Object.assign(this.#currentNote, updates);
		}

		this.#isSaving = true;
		try {
			const { data, error } = await db
				.from('notes')
				.update(updates)
				.eq('id', noteId)
				.select()
				.single();

			if (error) throw error;

			this.#isOffline = false;

			// Update with actual server data to be safe
			this.#notes = this.#notes.map((n) => (n.id === noteId ? data : n));
			if (this.#currentNote?.id === noteId) {
				this.#currentNote = data;
			}

			// 3. Auto-Snapshot Heartbeat
			const authorId = updates.author_id || this.#currentNote?.author_id;
			if (updates.content && authorId) {
				this.scheduleAutoSnapshot(noteId, authorId, updates.content);
			}

			// Sync links if content was updated
			if (updates.content) {
				const linkIds = extractWikilinkIds(updates.content);
				await this.syncLinks(noteId, linkIds);
			}

			return data;
		} catch (err: unknown) {
			console.error('[NotesStore] updateNote error:', err);
			this.#isOffline = true;
			const isNetworkError =
				err instanceof Error &&
				(err.message.includes('fetch') || err.message.includes('EAI_AGAIN'));

			if (isNetworkError) {
				toast.show('Connection lost. Saving locally...', 'error');
			} else {
				// Rolling back only on non-network errors to keep local progress during offline sessions
				this.#notes = previousNotes;
				this.#currentNote = previousCurrentNote as Note | null;
				toast.show('Failed to save changes', 'error');
			}
			return null;
		} finally {
			this.#isSaving = false;
		}
	}

	async createSnapshot(noteId: string, authorId: string, content: TiptapNode | unknown) {
		this.#isSaving = true;
		try {
			const { data, error } = await db
				.from('note_versions')
				.insert({
					note_id: noteId,
					author_id: authorId,
					content: content as NoteVersionsTable['Insert']['content']
				})
				.select()
				.single();

			if (error) throw error;
			this.#isOffline = false;
			this.#versions = [data, ...this.#versions];
			toast.show('Snapshot saved', 'success');
			return data;
		} catch (err: unknown) {
			console.error('[NotesStore] createSnapshot error:', err);
			this.#isOffline = true;
			toast.show('Failed to save snapshot. Check connection.', 'error');
			return null;
		} finally {
			this.#isSaving = false;
		}
	}

	async fetchVersions(noteId: string) {
		try {
			const { data, error } = await db
				.from('note_versions')
				.select('*')
				.eq('note_id', noteId)
				.order('created_at', { ascending: false });

			if (error) throw error;
			this.#versions = data || [];
		} catch (err) {
			console.error('[NotesStore] fetchVersions error:', err);
		}
	}

	async syncLinks(noteId: string, targetIds: string[]) {
		try {
			// 1. Delete old links
			await db.from('note_links').delete().eq('from_note_id', noteId);

			// 2. Insert new ones
			if (targetIds.length > 0) {
				const links = targetIds.map((tid) => ({
					from_note_id: noteId,
					to_note_id: tid
				}));
				await db.from('note_links').insert(links);
			}
		} catch (err) {
			console.error('[NotesStore] syncLinks error:', err);
		}
	}

	async fetchBacklinks(noteId: string) {
		try {
			const { data, error } = await db
				.from('note_links')
				.select('from_note_id, notes!note_links_from_note_id_fkey(*)')
				.eq('to_note_id', noteId);

			if (error) throw error;
			// Extract notes from the join
			this.#backlinks = (data || []).map((d) => d.notes).filter((n): n is Note => n !== null);
		} catch (err) {
			console.error('[NotesStore] fetchBacklinks error:', err);
		}
	}

	async deleteNote(noteId: string) {
		try {
			const { error } = await db.from('notes').delete().eq('id', noteId);

			if (error) throw error;
			this.#notes = this.#notes.filter((n) => n.id !== noteId);
			if (this.#currentNote?.id === noteId) {
				this.#currentNote = null;
			}
			return true;
		} catch (err: unknown) {
			console.error('[NotesStore] deleteNote error:', err);
			return false;
		}
	}

	async togglePin(noteId: string) {
		const note = this.#notes.find((n) => n.id === noteId);
		if (!note) return;

		const newValue = !note.is_pinned;
		return this.updateNote(noteId, { is_pinned: newValue });
	}

	async duplicateNote(noteId: string, userId: string) {
		this.#isLoading = true;
		try {
			const { data, error } = await db.rpc('duplicate_note', {
				note_id: noteId,
				new_author_id: userId
			});

			if (error) throw error;

			// Refresh list to get the new note
			const workspaceId = this.#notes.find((n) => n.id === noteId)?.workspace_id;
			if (workspaceId) {
				await this.fetchNotes(workspaceId);
			}

			toast.show('Note duplicated', 'success');
			return data;
		} catch (err) {
			console.error('[NotesStore] duplicateNote error:', err);
			toast.show('Failed to duplicate note', 'error');
			return null;
		} finally {
			this.#isLoading = false;
		}
	}

	async searchNotes(workspaceId: string, query: string) {
		if (!query) return this.fetchNotes(workspaceId);

		this.#isLoading = true;
		try {
			const { data, error } = await supabase
				.from('notes')
				.select('*')
				.eq('workspace_id', workspaceId)
				.textSearch('fts', query)
				.order('updated_at', { ascending: false });

			if (error) throw error;
			this.#notes = data || [];
		} catch (err) {
			console.error('[NotesStore] searchNotes error:', err);
		} finally {
			this.#isLoading = false;
		}
	}

	async findSimilarNotes(noteId: string, text: string, workspaceId: string) {
		if (!text.trim()) return;

		try {
			// 1. Get embedding for the text
			const embedRes = await fetch('/api/ai/embed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.slice(0, 5000) })
			});

			if (!embedRes.ok) throw new Error('Failed to get embedding');
			const { embedding } = await embedRes.json();

			// 2. Search for similar notes
			const { data, error } = await supabase.rpc('match_notes', {
				query_embedding: embedding,
				match_threshold: 0.5,
				match_count: 5,
				p_workspace_id: workspaceId
			});

			if (error) throw error;

			// 3. Filter out the current note and update state
			this.#similarNotes = (
				(data as Array<Note & { similarity: number; content_text: string }>) || []
			)
				.filter((n) => n.id !== noteId)
				.map(
					(n) =>
						({
							...n,
							similarity: n.similarity,
							content_text: n.content_text || ''
						}) as SimilarNote
				);
		} catch (err) {
			console.error('[NotesStore] findSimilarNotes error:', err);
		}
	}

	setCurrentNote(note: Note | null) {
		this.#currentNote = note;
	}

	private scheduleAutoSnapshot(noteId: string, authorId: string, content: TiptapNode | unknown) {
		if (this.#snapshotTimeout) return;

		this.#snapshotTimeout = setTimeout(async () => {
			const currentText = extractTextFromTiptap(content);

			if (currentText !== this.#lastSnapshotText && currentText.length > 0) {
				await this.createSnapshot(noteId, authorId, content);
				this.#lastSnapshotText = currentText;
				await this.cleanupVersions(noteId);
			}

			this.#snapshotTimeout = null;
		}, 30000);
	}

	private async cleanupVersions(noteId: string) {
		try {
			const { data }: { data: { id: string }[] | null } = await supabase
				.from('note_versions')
				.select('id')
				.eq('note_id', noteId)
				.order('created_at', { ascending: false });

			if (data && data.length > 50) {
				const idsToDelete = data.slice(50).map((v) => v.id);
				await supabase.from('note_versions').delete().in('id', idsToDelete);
			}
		} catch (err) {
			console.error('[NotesStore] cleanupVersions error:', err);
		}
	}
}

export const notesStore = new NotesStore();
