import { writable } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import { toast } from '$lib/stores/toastStore';
import type { ProfilesTable } from '$lib/types/db';

type Profile = ProfilesTable['Row'];

interface ProfileState {
	profile: Profile | null;
	loading: boolean;
	error: string | null;
}

/**
 * Strict type bridge to resolve Supabase inference issues.
 */
interface ProfileStoreInternal {
	from(table: 'profiles'): {
		select(columns?: string): {
			eq(
				column: string,
				value: string
			): {
				maybeSingle(): Promise<{ data: Profile | null; error: unknown }>;
			};
		};
		update(values: Partial<Profile>): {
			eq(
				column: string,
				value: string
			): {
				select(): {
					maybeSingle(): Promise<{ data: Profile | null; error: unknown }>;
				};
			};
		};
	};
}

const db = supabase as unknown as ProfileStoreInternal;

function createProfileStore() {
	const { subscribe, set, update } = writable<ProfileState>({
		profile: null,
		loading: false,
		error: null
	});

	return {
		subscribe,
		fetchProfile: async (userId: string) => {
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const { data, error: err } = await db
					.from('profiles')
					.select('*')
					.eq('id', userId)
					.maybeSingle();

				if (err) throw err;
				set({ profile: data, loading: false, error: null });
				toast.show('Profile loaded successfully.', 'info', 2000);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'An unknown error occurred';
				update((s) => ({ ...s, loading: false, error: message }));
			}
		},
		updateProfile: async (userId: string, updates: Partial<Profile>) => {
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const { id, created_at, ...payload } = updates;

				const { data, error: err } = await db
					.from('profiles')
					.update(payload)
					.eq('id', userId)
					.select()
					.maybeSingle();

				if (err) throw err;

				if (!data) {
					throw new Error('Update failed: Profile not found or permission denied.');
				}

				set({ profile: data, loading: false, error: null });
				toast.show('Profile updated successfully!', 'success');
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'An unknown error occurred';
				update((s) => ({ ...s, loading: false, error: message }));
				toast.show(message, 'error');
			}
		},
		updateMfaRecoveryCodes: async (userId: string, codes: string[]) => {
			try {
				const { error } = await db
					.from('profiles')
					.update({ mfa_recovery_codes: codes } as Partial<Profile>)
					.eq('id', userId)
					.select()
					.maybeSingle();

				if (error) throw error;
			} catch (err: unknown) {
				console.error('[profileStore] MFA recovery code storage failed:', err);
				throw err;
			}
		},
		reset: () => set({ profile: null, loading: false, error: null })
	};
}

export const profileStore = createProfileStore();
