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
	poll?: (AppDatabase['public']['Tables']['polls']['Row'] & {
		options: AppDatabase['public']['Tables']['poll_options']['Row'][];
		user_vote?: string | null;
	}) | null;
};

export interface PostPayload {
	content?: string;
}

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
	parent_id: string | null;
	created_at: string;
	profiles: { username: string; avatar_url: string | null } | null;
	likes: { count: number }[];
	activity_comments: { count: number }[];
	replies: { count: number }[];
	reposts: { count: number }[];
	polls: (AppDatabase['public']['Tables']['polls']['Row'] & {
		poll_options: AppDatabase['public']['Tables']['poll_options']['Row'][];
	})[];
}

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
		insert(values: AppDatabase['public']['Tables'][T]['Insert'] | AppDatabase['public']['Tables'][T]['Insert'][]): Promise<{
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

const ACTIVITY_SELECT = `
	*,
	profiles(username, avatar_url),
	likes(count),
	activity_comments(count),
	replies:activities!parent_id(count),
	reposts:activities!repost_id(count),
	polls(
		*,
		poll_options(*)
	)
`;

function transformActivity(item: RawActivityResponse, userLiked: boolean = false, userVote: string | null = null): Activity {
	const rawPoll = item.polls?.[0];
	return {
		...item,
		likes_count: item.likes?.[0]?.count || 0,
		comments_count: (item.activity_comments?.[0]?.count || 0) + (item.replies?.[0]?.count || 0),
		reposts_count: item.reposts?.[0]?.count || 0,
		user_liked: userLiked,
		user_reposted: false,
		poll: rawPoll ? {
			...rawPoll,
			options: rawPoll.poll_options,
			user_vote: userVote || null
		} : null
	} as Activity;
}

function createActivityService() {
	const { subscribe, update, set } = writable<Activity[]>([]);

	return {
		subscribe,
		/**
		 * Fetches initial activities with interaction counts and states
		 */
		fetchReplies: async (parentId: string, userId: string | null = null) => {
			const { data: activitiesDataRaw, error } = await supabase
				.from('activities')
				.select(ACTIVITY_SELECT)
				.eq('parent_id', parentId)
				.order('created_at', { ascending: true });

			if (error) throw error as Error;

			const activitiesData = (activitiesDataRaw || []) as RawActivityResponse[];
			let userLikes: string[] = [];
			const userVotes: Record<string, string> = {};

			if (userId && activitiesData.length > 0) {
				const activityIds = activitiesData.map((a) => a.id);
				const pollIds = activitiesData.flatMap((a) => a.polls?.map((p) => p.id) || []);

				const { data: likesData } = await supabase
					.from('likes')
					.select('activity_id')
					.eq('user_id', userId)
					.in('activity_id', activityIds);

				if (likesData) {
					userLikes = (likesData as { activity_id: string }[]).map((l) => l.activity_id);
				}

				if (pollIds.length > 0) {
					const { data: votesData } = await supabase
						.from('poll_votes')
						.select('poll_id, option_id')
						.eq('user_id', userId)
						.in('poll_id', pollIds);
					if (votesData) {
						(votesData as { poll_id: string; option_id: string }[]).forEach(v => {
							userVotes[v.poll_id] = v.option_id;
						});
					}
				}
			}

			const { data: legacyData } = await supabase
				.from('activity_comments')
				.select('*, profiles(username, avatar_url)')
				.eq('activity_id', parentId)
				.order('created_at', { ascending: true });

			const legacyComments: Activity[] = legacyData ? (legacyData as unknown as Comment[]).map(c => ({
				id: c.id,
				user_id: c.user_id,
				workspace_id: null,
				type: 'comment',
				payload: { content: c.content } as Json,
				attachments: [] as unknown as Json,
				is_public: true,
				repost_id: null,
				parent_id: parentId,
				created_at: c.created_at,
				profiles: c.profiles,
				likes_count: 0,
				comments_count: 0,
				reposts_count: 0,
				user_liked: false,
				user_reposted: false,
				poll: null
			} as Activity)) : [];

			const replies = activitiesData.map((item) => {
				const pollId = item.polls?.[0]?.id;
				return transformActivity(item, userLikes.includes(item.id), pollId ? userVotes[pollId] : null);
			});

			return [...replies, ...legacyComments].sort((a, b) => 
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		},

		fetchActivities: async (
			workspaceId: string | null = null,
			_currentUserId: string | null = null,
			parentId: string | null = null
		) => {
			let query = supabase.from('activities').select(ACTIVITY_SELECT);
			let legacyComments: Activity[] = [];

			if (parentId) {
				query = query.eq('parent_id', parentId);
				
				// Fetch legacy comments in parallel
				const { data: commentsData } = await supabase
					.from('activity_comments')
					.select('*, profiles(username, avatar_url)')
					.eq('activity_id', parentId)
					.order('created_at', { ascending: true });
				
				if (commentsData) {
					legacyComments = (commentsData as unknown as Comment[]).map(c => ({
						id: c.id,
						user_id: c.user_id,
						workspace_id: null,
						type: 'comment',
						payload: { content: c.content } as Json,
						attachments: [] as unknown as Json,
						is_public: true,
						repost_id: null,
						parent_id: parentId,
						created_at: c.created_at,
						profiles: c.profiles,
						likes_count: 0,
						comments_count: 0,
						reposts_count: 0,
						user_liked: false,
						user_reposted: false,
						poll: null
					} as Activity));
				}
			} else if (workspaceId) {
				query = query.eq('workspace_id', workspaceId).is('parent_id', null);
			} else {
				query = query.eq('is_public', true).is('parent_id', null);
			}

			const { data: rawActivities, error: activitiesError } = await query
				.order('created_at', { ascending: false })
				.limit(50);

			if (activitiesError) throw activitiesError as Error;

			const activitiesData = (rawActivities || []) as RawActivityResponse[];
			let userLikes: string[] = [];
			const userVotes: Record<string, string> = {};

			if (_currentUserId && activitiesData.length > 0) {
				const activityIds = activitiesData.map((a) => a.id);
				const pollIds = activitiesData.flatMap((a) => a.polls?.map((p) => p.id) || []);

				const { data: likesData } = await supabase
					.from('likes')
					.select('activity_id')
					.eq('user_id', _currentUserId)
					.in('activity_id', activityIds);

				if (likesData) {
					userLikes = (likesData as { activity_id: string }[]).map((l) => l.activity_id);
				}

				if (pollIds.length > 0) {
					const { data: votesData } = await supabase
						.from('poll_votes')
						.select('poll_id, option_id')
						.eq('user_id', _currentUserId)
						.in('poll_id', pollIds);
					if (votesData) {
						(votesData as { poll_id: string; option_id: string }[]).forEach(v => {
							userVotes[v.poll_id] = v.option_id;
						});
					}
				}
			}

			const transformed: Activity[] = activitiesData.map((item) => {
				const pollId = item.polls?.[0]?.id;
				return transformActivity(item, userLikes.includes(item.id), pollId ? userVotes[pollId] : null);
			});

			// Merge and sort
			const final = [...transformed, ...legacyComments].sort((a, b) => 
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);

			set(final);
		},

		/**
		 * Subscribes to realtime updates for activities.
		 * Returns a cleanup function.
		 */
		subscribeToActivities: (workspaceId: string | null = null, parentId: string | null = null, onUpdate?: () => void) => {
			const channelId = `activities_${workspaceId || 'global'}_${parentId || 'root'}_${Math.random().toString(36).slice(2, 9)}`;
			
			const channel = supabase
				.channel(channelId)
				.on('postgres_changes', { 
					event: '*', 
					schema: 'public', 
					table: 'activities'
				}, async () => {
					if (onUpdate) onUpdate();
				})
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
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
		 * Casts a vote in a poll
		 */
		castVote: async (userId: string, pollId: string, optionId: string) => {
			const { error } = await db.from('poll_votes').insert({
				user_id: userId,
				poll_id: pollId,
				option_id: optionId
			});

			if (error) throw error as Error;

			// Update store optimistically
			update(activities => activities.map(a => {
				if (a.poll?.id === pollId) {
					return {
						...a,
						poll: {
							...a.poll,
							user_vote: optionId,
							options: a.poll.options.map(o => 
								o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o
							)
						}
					};
				}
				return a;
			}));
		},

		/**
		 * Creates a new activity with optional poll or threading
		 */
		createPost: async (
			userId: string,
			content: string,
			options?: {
				workspaceId?: string | null;
				attachments?: Attachment[];
				isPublic?: boolean;
				parentId?: string | null;
				poll?: { question: string; options: string[] };
			}
		) => {
			const { data: act, error: actError } = await db
				.from('activities')
				.insert({
					user_id: userId,
					workspace_id: options?.workspaceId || null,
					type: options?.poll ? 'poll' : 'post',
					payload: { content } as Json,
					attachments: (options?.attachments || []) as unknown as Json,
					is_public: options?.isPublic !== false,
					parent_id: options?.parentId || null,
					repost_id: null
				})
				.select()
				.single();

			if (actError) throw actError as Error;

			const activity = act as Activity;

			// Create Poll if requested
			if (options?.poll) {
				const { data: pollData, error: pollError } = await db.from('polls').insert({
					activity_id: activity.id,
					question: options.poll.question,
					expires_at: new Date(Date.now() + 86400000).toISOString() // 24h default
				} as AppDatabase['public']['Tables']['polls']['Insert']).select().single();

				if (pollError) throw pollError as Error;
				const poll = pollData as AppDatabase['public']['Tables']['polls']['Row'];

				// Create options
				const optionInserts = options.poll.options.map(text => ({
					poll_id: poll.id,
					text
				}));
				const { error: optError } = await db.from('poll_options').insert(optionInserts);
				if (optError) throw optError as Error;
			}

			return activity as Activity;
		},

		/**
		 * Fetches a single activity with full context
		 */
		fetchActivityById: async (activityId: string, userId: string | null = null) => {
			const { data, error } = await supabase
				.from('activities')
				.select(ACTIVITY_SELECT)
				.eq('id', activityId)
				.single();

			if (error) throw error as Error;
			const item = data as RawActivityResponse;

			// Handle user-specific state if logged in
			let userLiked = false;
			let userVote: string | null = null;

			if (userId) {
				const { data: likeData } = await supabase
					.from('likes')
					.select('id')
					.eq('activity_id', activityId)
					.eq('user_id', userId)
					.maybeSingle();
				userLiked = !!likeData;

				if (item.polls?.[0]) {
					const { data: voteData } = await supabase
						.from('poll_votes')
						.select('option_id')
						.eq('poll_id', item.polls[0].id)
						.eq('user_id', userId)
						.maybeSingle();
					userVote = (voteData as { option_id: string } | null)?.option_id || null;
				}
			}

			return transformActivity(item, userLiked, userVote);
		},

		/**
		 * Adds a comment to an activity
		 */
		addComment: async (userId: string, activityId: string, content: string) => {
			const { data: commentData, error } = await db
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
						return { ...a, comments_count: (a.comments_count || 0) + 1 };
					}
					return a;
				})
			);

			return commentData as Comment;
		},

		/**
		 * Fetches comments for an activity
		 */
		fetchComments: async (activityId: string) => {
			const { data, error } = await db
				.from('activity_comments')
				.select('*, profiles(username, avatar_url)')
				.eq('activity_id', activityId)
				.order('created_at', { ascending: true });

			if (error) throw error as Error;
			return data as unknown as Comment[];
		},

		/**
		 * Reposts an activity
		 */
		repostActivity: async (userId: string, originalId: string) => {
			const { data: repostData, error } = await db
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
						return { ...a, reposts_count: (a.reposts_count || 0) + 1, user_reposted: true };
					}
					return a;
				})
			);

			return repostData as Activity;
		}
	};
}

export const activityService = createActivityService();
