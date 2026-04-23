import { json, type RequestHandler } from '@sveltejs/kit';
import { OPENROUTER_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { text } = await request.json();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	try {
		// OpenRouter proxies OpenAI-compatible embedding models via its own endpoint.
		// Using the OpenRouter key against api.openai.com won't work — it must go to
		// openrouter.ai/api/v1/embeddings.
		const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				input: text,
				model: 'openai/text-embedding-3-small'
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Failed to generate embedding');
		}

		const result = await response.json();

		try {
			await supabase.from('ai_requests').insert({
				user_id: session.user.id,
				model: result.model || 'openai/text-embedding-3-small',
				prompt_tokens: result.usage?.prompt_tokens || 0,
				completion_tokens: result.usage?.completion_tokens || 0,
				total_tokens: result.usage?.total_tokens || 0,
				feature: 'embed'
			});
		} catch (logErr) {
			console.error('[AI Usage Log] Failed:', logErr);
		}

		return json({ embedding: result.data[0].embedding });
	} catch (err) {
		console.error('Embedding API Error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
