import { json, type RequestHandler } from '@sveltejs/kit';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { config } from '$lib/config';

export const POST: RequestHandler = async ({ request }) => {
	// Initialize admin client inside the handler to avoid module-load time issues during build
	const supabaseAdmin = createClient(
		config.public.supabaseUrl,
		process.env.SUPABASE_SERVICE_ROLE_KEY || '',
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		}
	);

	// 1. Verify Webhook Secret
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${env.AI_WEBHOOK_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const payload = await request.json();
		const { table, record, type } = payload;

		// Only handle INSERT and relevant UPDATEs
		if (type !== 'INSERT' && type !== 'UPDATE') {
			return json({ message: 'Ignored event' });
		}

		// Extract text to embed based on table
		let text = '';
		if (table === 'messages') text = record.content;
		else if (table === 'notes') text = `${record.title}\n\n${record.content}`;
		else if (table === 'snippets') text = `${record.title}\n${record.language}\n${record.code}`;

		if (!text) return json({ message: 'Nothing to embed' });

		// 2. Generate Embedding (using text-embedding-3-small)
		const response = await fetch('https://api.openai.com/v1/embeddings', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY || OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				input: text,
				model: 'text-embedding-3-small'
			})
		});

		if (!response.ok) {
			const err = await response.json();
			throw new Error(err.error?.message || 'Embedding failed');
		}

		const { data } = await response.json();
		const embedding = data[0].embedding;

		// 3. Update the original row
		const { error: updateError } = await supabaseAdmin
			.from(table)
			.update({ embedding })
			.eq('id', record.id);

		if (updateError) throw updateError;

		console.log(`[AI:Embed] Successfully updated ${table}:${record.id}`);
		return json({ success: true });
	} catch (err: unknown) {
		console.error('[AI:Embed] Webhook Error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
