import { json, type RequestHandler } from '@sveltejs/kit';
import { OPENROUTER_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { text } = await request.json();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	try {
		// We use OpenRouter or direct OpenAI for embeddings
		// OpenRouter often proxies OpenAI embedding models
		const response = await fetch('https://api.openai.com/v1/embeddings', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				input: text,
				model: 'text-embedding-3-small'
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Failed to generate embedding');
		}

		const result = await response.json();
		return json({ embedding: result.data[0].embedding });
	} catch (err) {
		console.error('Embedding API Error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
