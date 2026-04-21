import { supabase } from './supabase';
import type { ActivitiesTable, FollowsTable } from '$lib/types/db';
import type { DeveloperItem } from '$lib/types/discovery';

export type ProfileActivity = ActivitiesTable['Row'];
type Follow = FollowsTable['Row'];

/**
 * Strict, lint-compliant type bridge for social operations.
 */
interface ProfileStore {
	from(table: 'follows'): {
		select(
			q?: string,
			options?: { count: string; head: boolean }
		): {
			eq(
				k: string,
				v: string
			): {
				eq(
					k: string,
					v: string
				): {
					single(): Promise<{ data: Follow | null; error: unknown }>;
				};
				count?: number;
			};
		};
		insert(values: { follower_id: string; following_id: string }): Promise<{ error: unknown }>;
		delete(): {
			eq(
				k: string,
				v: string
			): {
				eq(k: string, v: string): Promise<{ error: unknown }>;
			};
		};
	};
	from(table: 'activities'): {
		select(q: string): {
			eq(
				k: string,
				v: string
			): {
				order(
					k: string,
					options: { ascending: boolean }
				): {
					limit(n: number): Promise<{ data: ProfileActivity[] | null; error: unknown }>;
				};
			};
		};
	};
}

const db = supabase as unknown as ProfileStore;

/**
 * Service to handle profile-specific social operations and stats.
 */
export const profileService = {
	/**
	 * Fetches follower and following counts for a profile.
	 */
	async getProfileStats(userId: string) {
		const [followersRes, followingRes] = await Promise.all([
			supabase
				.from('follows')
				.select('*', { count: 'exact', head: true })
				.eq('following_id', userId),
			supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
		]);

		return {
			followers: followersRes.count || 0,
			following: followingRes.count || 0
		};
	},

	/**
	 * Fetches the activity feed for a specific profile.
	 */
	async getProfileActivities(userId: string) {
		const { data, error } = await db
			.from('activities')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(20);

		if (error) throw error;
		return data;
	},

	/**
	 * Checks if the current user is following a specific profile.
	 */
	async isFollowing(followerId: string, followingId: string) {
		const { data, error } = await db
			.from('follows')
			.select('*')
			.eq('follower_id', followerId)
			.eq('following_id', followingId)
			.single();

		if (error && (error as { code: string }).code !== 'PGRST116') throw error;
		return !!data;
	},

	/**
	 * Follows a profile.
	 */
	async followUser(followerId: string, followingId: string) {
		const { error } = await db
			.from('follows')
			.insert({ follower_id: followerId, following_id: followingId });

		if (error) throw error;
	},

	/**
	 * Unfollows a profile.
	 */
	async unfollowUser(followerId: string, followingId: string) {
		const { error } = await db
			.from('follows')
			.delete()
			.eq('follower_id', followerId)
			.eq('following_id', followingId);

		if (error) throw error;
	},

	/**
	 * Fetches trending/popular profiles.
	 */
	async getPopularProfiles(limit = 5, excludeId?: string) {
		let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

		if (excludeId) {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query.limit(limit);

		if (error) throw error;
		return data as unknown as DeveloperItem[];
	}
};
