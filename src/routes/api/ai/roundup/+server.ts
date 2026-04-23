import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENROUTER_API_KEY } from '$env/static/private';

const openrouter = createOpenRouter({
	apiKey: OPENROUTER_API_KEY
});

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { session } = await safeGetSession();
	if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

	const { workspaceId } = await request.json();
	if (!workspaceId) return json({ error: 'Missing workspace ID' }, { status: 400 });

	// Fetch activities from the last 24 hours
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const { data: activities, error: activityError } = await supabase
		.from('activities')
		.select(
			`
			type,
			payload,
			created_at,
			profiles (
				username
			)
		`
		)
		.eq('workspace_id', workspaceId)
		.gt('created_at', yesterday)
		.order('created_at', { ascending: false });

	if (activityError) {
		console.error('[Roundup API] Activity Error:', activityError);
		return json({ error: activityError.message }, { status: 500 });
	}

	if (!activities || activities.length === 0) {
		console.log('[Roundup API] No activities found in the last 24h');
		return json({
			summary: "It's been a quiet 24 hours. The team is likely in deep focus mode! 🧘‍♂️",
			activityCount: 0
		});
	}

	interface ActivitySummaryItem {
		type: string;
		payload: { title?: string; name?: string };
		profiles: { username: string } | { username: string }[] | null;
	}

	// Format activities for AI
	const activityText = (activities as unknown as ActivitySummaryItem[])
		.map((a) => {
			const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
			const user = profile?.username || 'Someone';
			const type = a.type.replace(/_/g, ' ');
			const title = a.payload?.title || a.payload?.name || 'an item';
			return `${user} ${type}: "${title}"`;
		})
		.join('\n');

	try {
		const { text, usage } = await generateText({
			model: openrouter.chat('google/gemini-2.0-flash-001'),
			system:
				"You are NeuroAI, a high-performance team coordinator. Create a concise, energetic, and developer-friendly 'Daily Roundup' of the workspace activities. Use emojis. Max 280 characters.",
			prompt: `Workspace Activities (Last 24h):\n${activityText}\n\nSummary:`
		});

		interface TokenUsage {
			inputTokens: number;
			outputTokens: number;
			totalTokens: number;
		}

		// Log usage
		try {
			const u = usage as unknown as TokenUsage;
			await supabase.from('ai_requests').insert({
				user_id: session.user.id,
				workspace_id: workspaceId,
				model: 'gemini-2.0-flash-001',
				prompt_tokens: u.inputTokens || 0,
				completion_tokens: u.outputTokens || 0,
				total_tokens: u.totalTokens || 0,
				feature: 'daily-roundup'
			});
		} catch (logErr) {
			console.error('[AI Usage Log] Failed:', logErr);
		}

		return json({
			summary: text.trim(),
			activityCount: activities.length
		});
	} catch (err: unknown) {
		console.error('[Roundup API] AI Error:', err);
		const message = err instanceof Error ? err.message : 'Failed to generate roundup';
		return json({ error: message }, { status: 500 });
	}
};
