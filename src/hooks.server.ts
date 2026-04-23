import net from 'net';
import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { config } from '$lib/config';

if (
	typeof (net as { setDefaultAutoSelectFamily?: (v: boolean) => void })
		.setDefaultAutoSelectFamily === 'function'
) {
	(net as { setDefaultAutoSelectFamily: (v: boolean) => void }).setDefaultAutoSelectFamily(false);
}
// ──────────────────────────────────────────────────────────────────────────────

const authHandle: Handle = async ({ event, resolve }) => {
	/**
	 * Creates a Supabase client for the server.
	 * This client is scoped to the current request and handles cookies automatically.
	 */
	event.locals.supabase = createServerClient(
		config.public.supabaseUrl,
		config.public.supabaseAnonKey,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				/**
				 * SvelteKit's cookies.set requires options to be passed.
				 * Supabase's set expects them in a single object.
				 */
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						try {
							event.cookies.set(name, value, { ...options, path: '/' });
						} catch (e) {
							// Avoid crashing if headers are already sent
							console.error(`[hooks:cookies] Error setting cookie ${name}:`, e);
						}
					});
				}
			}
		}
	);

	/**
	 * A helper function to safely get the session.
	 * It verifies the session is valid and not tampered with.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			// JWT validation has failed
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Proactively resolve session to ensure cookies are set before response generation
	await event.locals.safeGetSession();

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase needs to leverage the core-js content-range header.
			 */
			return name === 'content-range';
		}
	});

	// --- Content Security Policy ---
	const supabaseHost = new URL(config.public.supabaseUrl).host;
	const cloudinaryHost = `res.cloudinary.com`;

	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' data: blob: " + supabaseHost + ' ' + cloudinaryHost,
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' " +
			config.public.supabaseUrl +
			' ' +
			config.public.supabaseUrl.replace('https', 'wss') +
			' https://api.cloudinary.com',
		"media-src 'self' https://assets.mixkit.co https://res.cloudinary.com " + supabaseHost,
		"worker-src 'self' blob:",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"base-uri 'self'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	// Add other security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	);

	return response;
};

export const handle: Handle = sequence(authHandle);
