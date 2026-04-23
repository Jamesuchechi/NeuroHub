import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;

	// Gather all user data in parallel
	const [profile, workspaceMemberships, notes, snippets, messages, notifications, starredSnippets] =
		await Promise.all([
			supabase.from('profiles').select('*').eq('id', userId).single(),
			supabase.from('workspace_members').select('*, workspaces(*)').eq('user_id', userId),
			supabase.from('notes').select('*').eq('author_id', userId),
			supabase.from('snippets').select('*').eq('author_id', userId),
			supabase.from('messages').select('*').eq('user_id', userId).limit(500),
			supabase.from('notifications').select('*').eq('user_id', userId),
			supabase.from('snippet_stars').select('*, snippets(*)').eq('user_id', userId)
		]);

	const exportData = {
		exported_at: new Date().toISOString(),
		user_id: userId,
		profile: profile.data,
		workspaces: workspaceMemberships.data,
		notes: notes.data,
		snippets: snippets.data,
		starred_snippets: starredSnippets.data,
		recent_messages: messages.data,
		notifications: notifications.data,
		disclaimer: 'This export contains your personal data stored in NeuroHub as of the export date.'
	};

	// Return as a downloadable file
	const filename = `neurohub_data_export_${new Date().toISOString().split('T')[0]}.json`;

	return new Response(JSON.stringify(exportData, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
