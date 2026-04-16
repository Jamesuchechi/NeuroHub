import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { config } from '$lib/config';

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

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase needs to leverage the core-js content-range header.
			 */
			return name === 'content-range';
		}
	});
};

export const handle: Handle = sequence(authHandle);
