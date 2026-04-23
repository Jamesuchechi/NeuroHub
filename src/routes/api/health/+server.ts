import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Verify Supabase connection by checking the database time or a simple table
		const { error } = await locals.supabase.from('profiles').select('id').limit(1);

		if (error) {
			throw new Error(`Database connection failed: ${error.message}`);
		}

		return json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			env: process.env.NODE_ENV,
			services: {
				database: 'connected'
			}
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'An unknown error occurred';
		console.error('[HealthCheck] Error:', err);
		return json(
			{
				status: 'error',
				message: message,
				timestamp: new Date().toISOString()
			},
			{ status: 503 }
		);
	}
};
