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

	const { imageUrl, type = 'alt-text' } = await request.json();
	if (!imageUrl) return json({ error: 'Missing image URL' }, { status: 400 });

	try {
		const prompt =
			type === 'alt-text'
				? 'Describe this image for accessibility (alt text). Focus on the core content. Be concise.'
				: 'Generate a short, engaging caption for this story image.';

		const { text, usage } = await generateText({
			model: openrouter.chat('google/gemini-2.0-flash-001'),
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: prompt },
						{ type: 'image', image: imageUrl }
					]
				}
			]
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
				model: 'gemini-2.0-flash-001',
				prompt_tokens: u.inputTokens || 0,
				completion_tokens: u.outputTokens || 0,
				total_tokens: u.totalTokens || 0,
				feature: 'vision-describe'
			});
		} catch (logErr) {
			console.error('[AI Usage Log] Failed:', logErr);
		}

		return json({ text: text.trim() });
	} catch (err: unknown) {
		console.error('[AI:Vision] Error:', err);
		const message = err instanceof Error ? err.message : 'AI Vision Analysis failed';
		return json({ error: message }, { status: 500 });
	}
};
