import { supabase } from './supabase';
import type { StoriesTable } from '$lib/types/db';

export type Story = StoriesTable['Row'];
export type StoryInsert = StoriesTable['Insert'];

export interface StoryWithProfile extends Story {
	profiles: {
		username: string;
		avatar_url: string | null;
	} | null;
}

/**
 * Strict, lint-compliant type bridge to resolve 'never' errors
 * without using unsafe 'any' casts.
 */
interface StoryStore {
	from(table: 'stories'): {
		insert(values: StoryInsert): {
			select(): {
				single(): Promise<{ data: Story | null; error: unknown }>;
			};
		};
		select(columns?: string): {
			eq(
				column: string,
				value: string
			): {
				gt(
					column: string,
					value: string
				): {
					order(
						column: string,
						options: { ascending: boolean }
					): Promise<{ data: StoryWithProfile[] | null; error: unknown }>;
				};
			};
			gt(
				column: string,
				value: string
			): {
				eq(
					column: string,
					value: string
				): {
					order(
						column: string,
						options: { ascending: boolean }
					): Promise<{ data: StoryWithProfile[] | null; error: unknown }>;
				};
				is(
					column: string,
					value: null
				): {
					order(
						column: string,
						options: { ascending: boolean }
					): Promise<{ data: StoryWithProfile[] | null; error: unknown }>;
				};
				order(
					column: string,
					options: { ascending: boolean }
				): Promise<{ data: StoryWithProfile[] | null; error: unknown }>;
			};
		};
	};
}

const db = supabase as unknown as StoryStore;

/**
 * Service to handle story-related database operations.
 */
export const storyService = {
	/**
	 * Creates a new story in the database.
	 */
	async createStory(story: StoryInsert) {
		const { data, error } = await db.from('stories').insert(story).select().single();

		if (error) throw error as Error;
		return data;
	},

	/**
	 * Fetches active stories for a specific project context, or Hub-wide.
	 */
	async getStories(workspaceId: string | null = null) {
		const query = db
			.from('stories')
			.select(
				`
				*,
				profiles (
					username,
					avatar_url
				)
			`
			)
			.gt('expires_at', new Date().toISOString());

		if (workspaceId) {
			// Specific workspace stories OR global stories
			// Using filter() on raw data instead of complex Supabase .or() for better type safety with our bridge
			const { data, error } = await query.order('created_at', { ascending: false });
			if (error) throw error as Error;

			return (data || []).filter((s) => s.workspace_id === workspaceId || !s.workspace_id);
		} else {
			// Hub stories (global only)
			const { data, error } = await query
				.is('workspace_id', null)
				.order('created_at', { ascending: false });
			if (error) throw error as Error;
			return data || [];
		}
	},

	/**
	 * Fetches stories for a specific user.
	 */
	async getUserStories(userId: string) {
		const { data, error } = await db
			.from('stories')
			.select(
				`
				*,
				profiles (
					username,
					avatar_url
				)
			`
			)
			.eq('user_id', userId)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (error) throw error as Error;
		return data;
	}
};
