import { supabase } from './supabase';
import type { Language } from '$lib/types/devtools';
import type { SnippetsTable } from '$lib/types/db';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

export const snippetService = {
	async list(
		workspaceId: string,
		opts?: {
			language?: Language;
			tags?: string[];
			authorId?: string;
			search?: string;
			sort?: 'recent' | 'stars' | 'forks';
			limit?: number;
			cursor?: string;
			toolboxId?: string | null;
		}
	) {
		console.log('--- Snippets Fetching (Safe Mode) ---');
		let query = supabase
			.from('snippets')
			.select(
				'id, workspace_id, author_id, toolbox_id, title, description, code, language, tags, visibility, parent_id, fork_count, star_count, created_at, updated_at'
			)
			.eq('workspace_id', workspaceId)
			.order(
				opts?.sort === 'stars'
					? 'star_count'
					: opts?.sort === 'forks'
						? 'fork_count'
						: 'created_at',
				{ ascending: false }
			)
			.limit(opts?.limit ?? 20);

		if (opts?.language) query = query.eq('language', opts.language);
		if (opts?.authorId) query = query.eq('author_id', opts.authorId);
		if (opts?.tags?.length) query = query.overlaps('tags', opts.tags);
		if (opts?.search) query = query.textSearch('fts', opts.search);
		if (opts?.cursor) query = query.lt('created_at', opts.cursor);
		if (opts?.toolboxId !== undefined) {
			if (opts.toolboxId === null) {
				query = query.is('toolbox_id', null);
			} else {
				query = query.eq('toolbox_id', opts.toolboxId);
			}
		}

		return query;
	},

	async getById(id: string) {
		return supabase
			.from('snippets')
			.select(
				'id, workspace_id, author_id, toolbox_id, title, description, code, language, tags, visibility, parent_id, fork_count, star_count, created_at, updated_at'
			)
			.eq('id', id)
			.single();
	},

	async create(
		data: SnippetsTable['Insert']
	): Promise<PostgrestSingleResponse<SnippetsTable['Row']>> {
		return supabase.from('snippets').insert(data).select('id').single();
	},

	async update(
		id: string,
		data: SnippetsTable['Update']
	): Promise<PostgrestSingleResponse<SnippetsTable['Row']>> {
		return supabase.from('snippets').update(data).eq('id', id).select('id').single();
	},

	async delete(id: string) {
		return supabase.from('snippets').delete().eq('id', id);
	},

	async fork(
		snippetId: string,
		authorId: string,
		workspaceId: string
	): Promise<PostgrestSingleResponse<SnippetsTable['Row']>> {
		const { data: original } = await supabase
			.from('snippets')
			.select('id, title, code, language, description, tags')
			.eq('id', snippetId)
			.single();
		if (!original) throw new Error('Snippet not found');

		return supabase
			.from('snippets')
			.insert({
				workspace_id: workspaceId,
				author_id: authorId,
				title: `${original.title} (fork)`,
				code: original.code,
				language: original.language,
				description: original.description,
				tags: original.tags,
				visibility: 'workspace',
				parent_id: snippetId
			})
			.select('id')
			.single();
	},

	async toggleStar(snippetId: string, userId: string) {
		const { data: existing } = await supabase
			.from('snippet_stars')
			.select('snippet_id')
			.eq('snippet_id', snippetId)
			.eq('user_id', userId)
			.maybeSingle();

		if (existing) {
			return supabase
				.from('snippet_stars')
				.delete()
				.eq('snippet_id', snippetId)
				.eq('user_id', userId);
		} else {
			return supabase.from('snippet_stars').insert({ snippet_id: snippetId, user_id: userId });
		}
	},

	async getStarredIds(userId: string, workspaceId: string): Promise<string[]> {
		const { data } = await supabase
			.from('snippet_stars')
			.select('snippet_id, snippets!inner(workspace_id)')
			.eq('user_id', userId)
			.eq('snippets.workspace_id', workspaceId);

		// Explicitly cast the returned data to a known shape instead of using unknown
		const results = data as { snippet_id: string }[] | null;
		return results?.map((r) => r.snippet_id) ?? [];
	}
};
