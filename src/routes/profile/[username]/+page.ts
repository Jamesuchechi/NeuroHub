import { error, type Load } from '@sveltejs/kit';
import { supabase } from '$lib/services/supabase';
import { profileService } from '$lib/services/profileService';
import type { Database, ProfilesTable } from '$lib/types/db';

export const load: Load = async ({ params }) => {
	const username = params.username;

	if (!username) {
		throw error(400, 'Username is required');
	}

	// Use a strictly-typed bridge to resolve the 'never' issue without using 'any'
	const { data: profile, error: profileError } = await (
		supabase.from('profiles' as keyof Database['public']['Tables']) as unknown as {
			select(q: string): {
				eq(
					k: string,
					v: string
				): {
					single(): Promise<{ data: ProfilesTable['Row'] | null; error: Error | null }>;
				};
			};
		}
	)
		.select('*')
		.eq('username', username)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profile not found');
	}

	// Fetch social data in parallel for performance
	const [stats, activities] = await Promise.all([
		profileService.getProfileStats(profile.id),
		profileService.getProfileActivities(profile.id)
	]);

	return {
		profile,
		stats,
		activities
	};
};
