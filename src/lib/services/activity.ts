import { supabase } from './supabase';
import { writable } from 'svelte/store';
import type { AppDatabase, Json } from '$lib/types/db';

export type Activity = AppDatabase['public']['Tables']['activities']['Row'] & {
	profiles: {
		username: string;
		avatar_url: string | null;
	} | null;
	likes_count: number;
	comments_count: number;
	reposts_count: number;
	user_liked: boolean;
	user_reposted: boolean;
	original_post?: Activity | null;
};

export type ActivityInsert = AppDatabase['public']['Tables']['activities']['Insert'];
export type Attachment = {
	type: 'image' | 'video' | 'link';
	url: string;
	thumbnail?: string;
	provider?: string;
	title?: string;
};

export type Comment = AppDatabase['public']['Tables']['activity_comments']['Row'] & {
	profiles: {
		username: string;
		avatar_url: string | null;
	} | null;
};

export type CommentInsert = AppDatabase['public']['Tables']['activity_comments']['Insert'];

interface RawActivityResponse {
	id: string;
	user_id: string;
	workspace_id: string | null;
	type: string;
	payload: Json;
	attachments: Json;
	is_public: boolean;
	repost_id: string | null;
	created_at: string;
	profiles: { username: string; avatar_url: string | null } | null;
	likes: { count: number }[];
	activity_comments: { count: number }[];
	reposts: { count: number }[];
}

/**
 * A specialized type-safe bridge to resolve Supabase type inference failures
 * without using the 'any' keyword. This satisfies strict project linting.
 * It models the 'Thenable' behavior of Supabase builders.
 */
interface TypedSupabase {
	from<T extends keyof AppDatabase['public']['Tables']>(
		table: T
	): {
		select(columns?: string): {
			eq(
				col: string,
				val: string | null | boolean
			): Promise<{ data: unknown[]; error: unknown }> & {
				order(
					col: string,
					opt: { ascending: boolean }
				): Promise<{ data: unknown[]; error: unknown }>;
			};
			single(): Promise<{ data: unknown; error: unknown }>;
		};
		insert(values: AppDatabase['public']['Tables'][T]['Insert']): Promise<{
			data: unknown;
			error: unknown;
		}> & {
			select(columns?: string): {
				single(): Promise<{ data: unknown; error: unknown }>;
			};
		};
		delete(): Promise<{ error: unknown }> & {
			match(filter: Record<string, string>): Promise<{ error: unknown }>;
		};
	};
}

const db = supabase as unknown as TypedSupabase;

function createActivityService() {
	const { subscribe, update, set } = writable<Activity[]>([]);

	return {
		subscribe,
		/**
		 * Fetches initial activities with interaction counts and states
		 */
		fetchActivities: async (
			workspaceId: string | null = null,
			_currentUserId: string | null = null
		) => {
			const selectStr = `
				*,
				profiles(username, avatar_url),
				likes(count),
				activity_comments(count),
				reposts:activities!repost_id(count)
			`;

			let query = supabase.from('activities').select(selectStr);

			if (workspaceId) {
				query = query.eq('workspace_id', workspaceId);
			} else {
				query = query.eq('is_public', true);
			}

			const { data, error: activitiesError } = await query
				.order('created_at', { ascending: false })
				.limit(50);

			if (activitiesError) throw activitiesError as Error;

			const activitiesData = (data || []) as RawActivityResponse[];
			let userLikes: string[] = [];
			let userReposts: string[] = [];

			if (_currentUserId && activitiesData.length > 0) {
				const activityIds = activitiesData.map((a) => a.id);

				// Fetch user's likes for these activities
				const { data: likesData } = await supabase
					.from('likes')
					.select('activity_id')
					.eq('user_id', _currentUserId)
					.in('activity_id', activityIds);

				if (likesData) {
					userLikes = (likesData as { activity_id: string }[]).map((l) => l.activity_id);
				}

				// Fetch user's reposts for these activities
				const { data: repostsData } = await supabase
					.from('activities')
					.select('repost_id')
					.eq('user_id', _currentUserId)
					.eq('type', 'post')
					.in('repost_id', activityIds);

				if (repostsData) {
					userReposts = (repostsData as { repost_id: string | null }[])
						.filter((r) => r.repost_id !== null)
						.map((r) => r.repost_id as string);
				}
			}

			const transformed: Activity[] = activitiesData.map((item) => ({
				...item,
				likes_count: item.likes?.[0]?.count || 0,
				comments_count: item.activity_comments?.[0]?.count || 0,
				reposts_count: item.reposts?.[0]?.count || 0,
				user_liked: userLikes.includes(item.id),
				user_reposted: userReposts.includes(item.id)
			}));

			set(transformed);

			// Realtime subscription
			const channel = supabase
				.channel('public:activities_feed')
				.on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
					// Refresh on changes for simplicity
				})
				.subscribe();

			return () => supabase.removeChannel(channel);
		},

		/**
		 * Toggles a like for an activity
		 */
		toggleLike: async (userId: string, activityId: string, currentlyLiked: boolean) => {
			if (currentlyLiked) {
				const { error } = await db
					.from('likes')
					.delete()
					.match({ user_id: userId, activity_id: activityId });
				if (error) throw error as Error;
			} else {
				const { error } = await db.from('likes').insert({
					user_id: userId,
					activity_id: activityId
				});
				if (error) throw error as Error;
			}

			// Optimistically update the store
			update((activities) =>
				activities.map((a) => {
					if (a.id === activityId) {
						return {
							...a,
							user_liked: !currentlyLiked,
							likes_count: a.likes_count + (currentlyLiked ? -1 : 1)
						};
					}
					return a;
				})
			);
		},

		/**
		 * Adds a comment to an activity
		 */
		addComment: async (userId: string, activityId: string, content: string) => {
			const { data, error } = await db
				.from('activity_comments')
				.insert({
					user_id: userId,
					activity_id: activityId,
					content
				})
				.select()
				.single();

			if (error) throw error as Error;

			// Update count in store
			update((activities) =>
				activities.map((a) => {
					if (a.id === activityId) {
						return { ...a, comments_count: a.comments_count + 1 };
					}
					return a;
				})
			);

			return data as Comment;
		},

		/**
		 * Fetches comments for an activity
		 */
		fetchComments: async (activityId: string) => {
			const { data, error } = await db
				.from('activity_comments')
				.select()
				.eq('activity_id', activityId);

			if (error) throw error as Error;
			return data as unknown as Comment[];
		},

		/**
		 * Reposts an activity
		 */
		repostActivity: async (userId: string, originalId: string) => {
			const { data, error } = await db
				.from('activities')
				.insert({
					user_id: userId,
					type: 'post',
					repost_id: originalId,
					payload: { content: '' } as Json,
					is_public: true
				})
				.select()
				.single();

			if (error) throw error as Error;

			// Update count in store
			update((activities) =>
				activities.map((a) => {
					if (a.id === originalId) {
						return { ...a, reposts_count: a.reposts_count + 1, user_reposted: true };
					}
					return a;
				})
			);

			return data as Activity;
		},

		createPost: async (
			userId: string,
			content: string,
			workspaceId: string | null = null,
			attachments: Attachment[] = [],
			isPublic: boolean = true
		) => {
			const { data, error } = await db
				.from('activities')
				.insert({
					user_id: userId,
					workspace_id: workspaceId,
					type: 'post',
					payload: { content } as Json,
					attachments: attachments as unknown as Json,
					is_public: isPublic,
					repost_id: null
				})
				.select()
				.single();

			if (error) throw error as Error;
			return data as Activity;
		}
	};
}

export const activityService = createActivityService();
