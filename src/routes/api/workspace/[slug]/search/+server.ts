import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({
	params,
	url,
	locals: { supabase, safeGetSession }
}) => {
	const { slug } = params;
	const q = url.searchParams.get('q');
	const type = url.searchParams.get('type') || 'all';
	const authorId = url.searchParams.get('authorId');
	const channelId = url.searchParams.get('channelId');
	const limit = parseInt(url.searchParams.get('limit') || '20');

	// 1. Session check
	const { session } = await safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	if (!q || q.trim() === '') {
		return json({ results: [] });
	}

	// 2. Get workspace ID from slug
	const { data: workspace, error: wsError } = await supabase
		.from('workspaces')
		.select('id')
		.eq('slug', slug)
		.single();

	if (wsError || !workspace) {
		throw error(404, 'Workspace not found');
	}

	// 3. Call search RPC
	// search_workspace(p_workspace_id, p_query, p_type, p_author_id, p_channel_id, p_limit)
	const { data: results, error: searchError } = await supabase.rpc('search_workspace', {
		p_workspace_id: workspace.id,
		p_query: q,
		p_type: type,
		p_author_id: authorId || null,
		p_channel_id: channelId || null,
		p_limit: limit
	});

	if (searchError) {
		console.error('[Search API] RPC failed:', searchError);
		throw error(500, 'Search failed');
	}

	return json({ results: results || [] });
};
