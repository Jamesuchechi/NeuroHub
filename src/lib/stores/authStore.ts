import { writable } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
	user: User | null;
	session: Session | null;
	loading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		session: null,
		loading: true
	});

	return {
		subscribe,
		setSession: (session: Session | null) => {
			update((s) => ({
				...s,
				session,
				user: session?.user ?? null,
				loading: false
			}));
		},
		setLoading: (loading: boolean) => {
			update((s) => ({ ...s, loading }));
		},
		signOut: async () => {
			await supabase.auth.signOut();
			set({ user: null, session: null, loading: false });
		}
	};
}

export const authStore = createAuthStore();
