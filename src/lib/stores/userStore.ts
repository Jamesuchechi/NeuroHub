import { writable } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import type { Database } from '$lib/types/db';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserState {
	profile: Profile | null;
	loading: boolean;
	error: string | null;
}

function createUserStore() {
	const { subscribe, set, update } = writable<UserState>({
		profile: null,
		loading: false,
		error: null
	});

	return {
		subscribe,
		fetchProfile: async (userId: string) => {
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const { data, error } = await supabase
					.from('profiles')
					.select('*')
					.eq('id', userId)
					.single();

				if (error) throw error;
				set({ profile: data, loading: false, error: null });
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'An unknown error occurred';
				update((s) => ({ ...s, loading: false, error: message }));
			}
		},
		updateProfile: async (userId: string, updates: Partial<Profile>) => {
			update((s) => ({ ...s, loading: true }));
			try {
				const { data, error } = await supabase
					.from('profiles')
					.update(updates)
					.eq('id', userId)
					.select()
					.single();

				if (error) throw error;
				set({ profile: data, loading: false, error: null });
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'An unknown error occurred';
				update((s) => ({ ...s, loading: false, error: message }));
			}
		},
		reset: () => set({ profile: null, loading: false, error: null })
	};
}

export const userStore = createUserStore();
