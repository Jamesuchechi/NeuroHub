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
			model: openrouter.chat('meta-llama/llama-3.2-11b-vision-instruct:free'),
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

		// Log usage
		try {
			await supabase.from('ai_requests').insert({
				user_id: session.user.id,
				model: 'llama-3.2-11b-vision',
				prompt_tokens: usage.inputTokens,
				completion_tokens: usage.outputTokens,
				total_tokens: usage.totalTokens,
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
