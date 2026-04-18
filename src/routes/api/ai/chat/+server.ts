import { json } from '@sveltejs/kit';
import https from 'https';
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
			model: 'llama-3.3-70b-versatile',
			getHeaders: () => ({})
		}
	};

	const selectedConfig = configs[profile as keyof typeof configs] || configs.fast;
	const { endpoint, key, model } = selectedConfig;

	const body = {
		model,
		messages: [{ role: 'user', content: prompt }]
	};

	return new Promise((resolveResult) => {
		const url = new URL(endpoint);
		const postData = JSON.stringify(body);

		const req = https.request(
			url,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${key}`,
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData),
					...(profile === 'intelligent' ? selectedConfig.getHeaders() : {})
				},
				timeout: 10000 // Handled cleanly by native https module
			},
			(res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 400) {
						let errMessage = 'AI provider rejected the request';
						try {
							const parsed = JSON.parse(data);
							errMessage = parsed.error?.message || errMessage;
						} catch (_e) {
							// Non-JSON response from API, use default error message
						}
						console.error(`AI Provider Error (${res.statusCode}):`, errMessage);
						resolveResult(json({ error: errMessage }, { status: res.statusCode || 500 }));
					} else {
						try {
							const parsed = JSON.parse(data);
							resolveResult(
								json({
									content: parsed.choices[0].message.content,
									model
								})
							);
						} catch (e) {
							console.error('AI JSON Parse Error:', e);
							resolveResult(json({ error: 'Invalid JSON response' }, { status: 500 }));
						}
					}
				});
			}
		);

		req.on('error', (err) => {
			console.error('AI API HTTPS Error:', err.message);
			resolveResult(json({ error: 'Failed to query AI provider' }, { status: 500 }));
		});

		req.on('timeout', () => {
			req.destroy();
			console.error('AI API Timeout');
			resolveResult(json({ error: 'AI provider timed out' }, { status: 500 }));
		});

		req.write(postData);
		req.end();
	});
};
