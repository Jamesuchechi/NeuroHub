import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENROUTER_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { prompt, profile = 'fast' } = await request.json();

	const configs = {
		intelligent: {
			endpoint: 'https://openrouter.ai/api/v1/chat/completions',
			key: OPENROUTER_API_KEY,
			model: 'anthropic/claude-3-haiku',
			getHeaders: () => ({
				'HTTP-Referer': 'https://neurohub.io',
				'X-Title': 'NeuroHub'
			})
		},
		stable: {
			endpoint: 'https://api.mistral.ai/v1/chat/completions',
			key: MISTRAL_API_KEY,
			model: 'mistral-small-latest',
			getHeaders: () => ({})
		},
		fast: {
			endpoint: 'https://api.groq.com/openai/v1/chat/completions',
			key: GROQ_API_KEY,
			model: 'llama3-70b-8192',
			getHeaders: () => ({})
		}
	};

	const selectedConfig = configs[profile as keyof typeof configs] || configs.fast;
	const { endpoint, key, model } = selectedConfig;

	const body = {
		model,
		messages: [{ role: 'user', content: prompt }],
		...(profile === 'intelligent' ? { headers: selectedConfig.getHeaders() } : {})
	};

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const data = await response.json();
		return json({
			content: data.choices[0].message.content,
			model
		});
	} catch (err) {
		console.error('AI API Error:', err);
		return json({ error: 'Failed to query AI provider' }, { status: 500 });
	}
};
