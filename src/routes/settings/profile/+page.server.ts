import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	deleteAccount: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const userId = session.user.id;

		// 1. Delete the public profile
		// Our migration ensures this cascades to notes, snippets, messages, etc.
		const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);

		if (profileError) {
			console.error('[DeleteAccount] Profile deletion failed:', profileError);
			return fail(500, { message: 'Failed to delete account data' });
		}

		// 2. Sign out the user
		await supabase.auth.signOut();

		// 3. Redirect to home
		throw redirect(303, '/');
	}
};
