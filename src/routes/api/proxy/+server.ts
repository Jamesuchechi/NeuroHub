import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authenticate the user
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// 2. Parse the request payload
		const { method, url, headers, body } = await request.json();

		if (!url) {
			throw error(400, 'URL is required');
		}

		// 3. Perform the proxy request
		const start = performance.now();

		const response = await fetch(url, {
			method,
			headers,
			body: ['GET', 'HEAD'].includes(method) ? undefined : body
		});

		const resText = await response.text();
		const duration = Math.round(performance.now() - start);

		// Extract headers
		const resHeaders: Record<string, string> = {};
		response.headers.forEach((v, k) => {
			resHeaders[k] = v;
		});

		// 4. Return the result in the format expected by the frontend
		return json({
			status: response.status,
			statusText: response.statusText,
			headers: resHeaders,
			body: resText,
			duration_ms: duration,
			size_bytes: Buffer.byteLength(resText)
		});
	} catch (err: unknown) {
		const error = err as Error;
		console.error('[Proxy Error]:', error);
		return json(
			{
				error: error.message || 'An unexpected error occurred during the proxy request',
				status: 500,
				statusText: 'Internal Server Error',
				headers: {},
				body: '',
				duration_ms: 0,
				size_bytes: 0
			},
			{ status: 500 }
		);
	}
};
