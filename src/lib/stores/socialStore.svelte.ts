import { supabase } from '$lib/services/supabase';

export interface RecommendedDeveloper {
	id: string;
	username: string;
	avatar_url: string;
	title: string;
	skills: string[];
	influence_score: number;
	overlap_count: number;
}

export interface TrendingSnippet {
	id: string;
	title: string;
	language: string;
	star_count: number;
	fork_count: number;
	author_username: string;
}

class SocialStore {
	recommendedDevelopers = $state<RecommendedDeveloper[]>([]);
	trendingSnippets = $state<TrendingSnippet[]>([]);
	isLoading = $state(false);
	isTrendingLoading = $state(false);
	error = $state<string | null>(null);

	async fetchRecommendedDevelopers(userId: string) {
		if (!userId) return;

		this.isLoading = true;
		this.error = null;

		try {
			const { data, error } = await supabase.rpc('get_recommended_developers', {
				p_user_id: userId,
				p_limit: 5
			});

			if (error) throw error;
			this.recommendedDevelopers = data || [];
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'An unknown error occurred';
			console.error('[SocialStore] Error fetching recommendations:', err);
			this.error = message;
		} finally {
			this.isLoading = false;
		}
	}

	async fetchTrendingSnippets(workspaceId: string | null = null) {
		this.isTrendingLoading = true;
		try {
			const { data, error } = await supabase.rpc('get_trending_snippets', {
				p_workspace_id: workspaceId,
				p_limit: 5
			});

			if (error) throw error;
			this.trendingSnippets = data || [];
		} catch (err: unknown) {
			console.error('[SocialStore] Error fetching trending snippets:', err);
		} finally {
			this.isTrendingLoading = false;
		}
	}
}

export const socialStore = new SocialStore();
