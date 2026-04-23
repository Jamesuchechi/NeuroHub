export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type NotesTable = {
	Row: {
		id: string;
		workspace_id: string;
		author_id: string;
		title: string;
		status: 'draft' | 'published';
		content: Json;
		tags: string[];
		is_public: boolean;
		created_at: string;
		updated_at: string;
		embedding: string | null;
		is_pinned: boolean; // Added in local migration
		share_token: string | null; // Added in local migration
	};
	Insert: {
		id?: string;
		workspace_id: string;
		author_id: string;
		title: string;
		status?: 'draft' | 'published';
		content?: Json;
		tags?: string[];
		is_public?: boolean;
		created_at?: string;
		updated_at?: string;
		is_pinned?: boolean;
		share_token?: string | null;
	};
	Update: {
		id?: string;
		workspace_id?: string;
		author_id?: string;
		title?: string;
		status?: 'draft' | 'published';
		content?: Json;
		tags?: string[];
		is_public?: boolean;
		created_at?: string;
		updated_at?: string;
		is_pinned?: boolean;
		share_token?: string | null;
	};
};

export type NoteVersionsTable = {
	Row: {
		id: string;
		note_id: string;
		author_id: string;
		content: Json;
		created_at: string;
	};
	Insert: {
		id?: string;
		note_id: string;
		author_id: string;
		content: Json;
		created_at?: string;
	};
	Update: {
		id?: string;
		note_id?: string;
		author_id?: string;
		content?: Json;
		created_at?: string;
	};
};

export type SnippetsTable = {
	Row: {
		id: string;
		workspace_id: string;
		author_id: string;
		title: string;
		description: string | null;
		code: string;
		language: string;
		tags: string[];
		visibility: 'private' | 'workspace' | 'public';
		parent_id: string | null;
		fork_count: number;
		star_count: number;
		created_at: string;
		updated_at: string;
		toolbox_id: string | null;
		fts: unknown;
	};
	Insert: {
		id?: string;
		workspace_id: string;
		author_id: string;
		title: string;
		description?: string | null;
		code: string;
		language?: string;
		tags?: string[];
		visibility?: 'private' | 'workspace' | 'public';
		parent_id?: string | null;
		fork_count?: number;
		star_count?: number;
		created_at?: string;
		toolbox_id?: string | null;
		updated_at?: string;
		fts?: unknown;
	};
	Update: {
		id?: string;
		workspace_id?: string;
		author_id?: string;
		title?: string;
		description?: string | null;
		code?: string;
		language?: string;
		tags?: string[];
		visibility?: 'private' | 'workspace' | 'public';
		parent_id?: string | null;
		fork_count?: number;
		star_count?: number;
		toolbox_id?: string | null;
		created_at?: string;
		updated_at?: string;
		fts?: unknown;
	};
};

export type SnippetStarsTable = {
	Row: {
		snippet_id: string;
		user_id: string;
		created_at: string;
	};
	Insert: {
		snippet_id: string;
		user_id: string;
		created_at?: string;
	};
	Update: {
		snippet_id?: string;
		user_id?: string;
		created_at?: string;
	};
};

export type ApiTestsTable = {
	Row: {
		id: string;
		workspace_id: string;
		author_id: string;
		name: string;
		method: string;
		url: string;
		headers: Json | null;
		body: string | null;
		last_response: Json | null;
		toolbox_id: string | null;
		last_run_at: string | null;
		created_at: string;
		updated_at: string;
	};
	Insert: {
		id?: string;
		workspace_id: string;
		author_id: string;
		name: string;
		method?: string;
		url: string;
		headers?: Json | null;
		body?: string | null;
		toolbox_id?: string | null;
		last_response?: Json | null;
		last_run_at?: string | null;
		created_at?: string;
		updated_at?: string;
	};
	Update: {
		id?: string;
		workspace_id?: string;
		author_id?: string;
		name?: string;
		method?: string;
		url?: string;
		headers?: Json | null;
		toolbox_id?: string | null;
		body?: string | null;
		last_response?: Json | null;
		last_run_at?: string | null;
		created_at?: string;
		updated_at?: string;
	};
};

export type ApiEnvironmentsTable = {
	Row: {
		id: string;
		workspace_id: string;
		name: string;
		variables: Json;
		created_at: string;
		updated_at: string;
	};
	Insert: {
		id?: string;
		workspace_id: string;
		name: string;
		variables?: Json;
		created_at?: string;
		updated_at?: string;
	};
	Update: {
		id?: string;
		workspace_id?: string;
		name?: string;
		variables?: Json;
		created_at?: string;
		updated_at?: string;
	};
};

export type NotificationPreferencesTable = {
	Row: {
		user_id: string;
		workspace_id: string;
		mentions_enabled: boolean;
		replies_enabled: boolean;
		invites_enabled: boolean;
		ai_completions_enabled: boolean;
	};
	Insert: {
		user_id: string;
		workspace_id: string;
		mentions_enabled?: boolean;
		replies_enabled?: boolean;
		invites_enabled?: boolean;
		ai_completions_enabled?: boolean;
	};
	Update: {
		user_id?: string;
		workspace_id?: string;
		mentions_enabled?: boolean;
		replies_enabled?: boolean;
		invites_enabled?: boolean;
		ai_completions_enabled?: boolean;
	};
};

export type NotificationsTable = {
	Row: {
		id: string;
		user_id: string;
		workspace_id: string | null;
		type: string;
		actor_id: string | null;
		payload: Json;
		read_at: string | null;
		created_at: string;
	};
	Insert: {
		id?: string;
		user_id: string;
		workspace_id?: string | null;
		type: string;
		actor_id?: string | null;
		payload?: Json;
		read_at?: string | null;
		created_at?: string;
	};
	Update: {
		id?: string;
		user_id?: string;
		workspace_id?: string | null;
		type?: string;
		actor_id?: string | null;
		payload?: Json;
		read_at?: string | null;
		created_at?: string;
	};
};

export type ChannelMembersTable = {
	Row: {
		channel_id: string;
		user_id: string;
		joined_at: string;
	};
	Insert: {
		channel_id: string;
		user_id: string;
		joined_at?: string;
	};
	Update: {
		channel_id?: string;
		user_id?: string;
		joined_at?: string;
	};
};

export type Database = {
	public: {
		Tables: {
			notes: {
				Row: {
					id: string;
					workspace_id: string;
					author_id: string;
					title: string;
					status: 'draft' | 'published';
					content: Json;
					tags: string[];
					is_public: boolean;
					created_at: string;
					updated_at: string;
					embedding: string | null;
					is_pinned: boolean;
					share_token: string | null;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					author_id: string;
					title: string;
					status?: 'draft' | 'published';
					content?: Json;
					tags?: string[];
					is_public?: boolean;
					created_at?: string;
					updated_at?: string;
					embedding?: string | null;
					is_pinned?: boolean;
					share_token?: string | null;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					author_id?: string;
					title?: string;
					status?: 'draft' | 'published';
					content?: Json;
					tags?: string[];
					is_public?: boolean;
					created_at?: string;
					updated_at?: string;
					embedding?: string | null;
					is_pinned?: boolean;
					share_token?: string | null;
				};
				Relationships: [];
			};
			note_versions: {
				Row: {
					id: string;
					note_id: string;
					author_id: string;
					content: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					note_id: string;
					author_id: string;
					content: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					note_id?: string;
					author_id?: string;
					content?: Json;
					created_at?: string;
				};
				Relationships: [];
			};
			message_reactions: {
				Row: {
					message_id: string;
					user_id: string;
					emoji: string;
					created_at: string;
				};
				Insert: {
					message_id: string;
					user_id: string;
					emoji: string;
					created_at?: string;
				};
				Update: {
					message_id?: string;
					user_id?: string;
					emoji?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			message_reads: {
				Row: {
					user_id: string;
					channel_id: string;
					last_read_message_id: string | null;
					updated_at: string;
				};
				Insert: {
					user_id: string;
					channel_id: string;
					last_read_message_id?: string | null;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					channel_id?: string;
					last_read_message_id?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
			typing_indicators: {
				Row: {
					channel_id: string;
					user_id: string;
					updated_at: string;
				};
				Insert: {
					channel_id: string;
					user_id: string;
					updated_at?: string;
				};
				Update: {
					channel_id?: string;
					user_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			channels: {
				Row: {
					id: string;
					workspace_id: string;
					name: string;
					description: string | null;
					type: 'text' | 'announcement' | 'private' | 'group_dm';
					created_by: string | null;
					created_at: string;
					custom_name: string | null;
					icon_url: string | null;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					name: string;
					description?: string | null;
					type?: 'text' | 'announcement' | 'private' | 'group_dm';
					created_by?: string | null;
					created_at?: string;
					custom_name?: string | null;
					icon_url?: string | null;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					name?: string;
					description?: string | null;
					type?: 'text' | 'announcement' | 'private' | 'group_dm';
					created_by?: string | null;
					created_at?: string;
					custom_name?: string | null;
					icon_url?: string | null;
				};
				Relationships: [];
			};
			channel_members: {
				Row: {
					channel_id: string;
					user_id: string;
					joined_at: string;
				};
				Insert: {
					channel_id: string;
					user_id: string;
					joined_at?: string;
				};
				Update: {
					channel_id?: string;
					user_id?: string;
					joined_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'channel_members_channel_id_fkey';
						columns: ['channel_id'];
						isOneToOne: false;
						referencedRelation: 'channels';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'channel_members_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			messages: {
				Row: {
					id: string;
					channel_id: string;
					user_id: string;
					content: string;
					attachments: Json;
					parent_id: string | null;
					metadata: Json;
					edited_at: string | null;
					deleted_at: string | null;
					embedding: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					channel_id: string;
					user_id: string;
					content: string;
					attachments?: Json;
					parent_id?: string | null;
					metadata?: Json;
					edited_at?: string | null;
					deleted_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					channel_id?: string;
					user_id?: string;
					content?: string;
					attachments?: Json;
					parent_id?: string | null;
					metadata?: Json;
					edited_at?: string | null;
					deleted_at?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			stories: {
				Row: {
					id: string;
					user_id: string;
					workspace_id: string | null;
					media_url: string | null;
					media_type: string | null;
					content: string | null;
					background_gradient: string | null;
					font_family: string | null;
					expires_at: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					workspace_id?: string | null;
					media_url?: string | null;
					media_type?: string | null;
					content?: string | null;
					background_gradient?: string | null;
					font_family?: string | null;
					expires_at?: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					workspace_id?: string | null;
					media_url?: string | null;
					media_type?: string | null;
					content?: string | null;
					background_gradient?: string | null;
					font_family?: string | null;
					expires_at?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			follows: {
				Row: {
					follower_id: string;
					following_id: string;
					created_at: string;
				};
				Insert: {
					follower_id: string;
					following_id: string;
					created_at?: string;
				};
				Update: {
					follower_id?: string;
					following_id?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			activities: {
				Row: {
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
				};
				Insert: {
					id?: string;
					user_id: string;
					workspace_id?: string | null;
					type: string;
					payload?: Json;
					attachments?: Json;
					is_public?: boolean;
					repost_id?: string | null;
					parent_id?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					workspace_id?: string | null;
					type?: string;
					payload?: Json;
					attachments?: Json;
					is_public?: boolean;
					repost_id?: string | null;
					parent_id?: string | null;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'activities_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'activities_parent_id_fkey';
						columns: ['parent_id'];
						isOneToOne: false;
						referencedRelation: 'activities';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'activities_repost_id_fkey';
						columns: ['repost_id'];
						isOneToOne: false;
						referencedRelation: 'activities';
						referencedColumns: ['id'];
					}
				];
			};
			likes: {
				Row: {
					id: string;
					user_id: string;
					activity_id: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					activity_id: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					activity_id?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			activity_comments: {
				Row: {
					id: string;
					user_id: string;
					activity_id: string;
					content: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					activity_id: string;
					content: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					activity_id?: string;
					content?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					id: string;
					username: string | null;
					full_name: string | null;
					avatar_url: string | null;
					header_url: string | null;
					bio: string | null;
					website: string | null;
					location: string | null;
					social_links: Json;
					birthday: string | null;
					title: string | null;
					skills: string[];
					influence_score: number | null;
					mfa_recovery_codes: string[] | null;
					created_at: string;
				};
				Insert: {
					id: string;
					username?: string | null;
					full_name?: string | null;
					avatar_url?: string | null;
					header_url?: string | null;
					bio?: string | null;
					website?: string | null;
					location?: string | null;
					social_links?: Json;
					birthday?: string | null;
					title?: string | null;
					skills?: string[];
					mfa_recovery_codes?: string[] | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					username?: string | null;
					full_name?: string | null;
					avatar_url?: string | null;
					header_url?: string | null;
					bio?: string | null;
					website?: string | null;
					location?: string | null;
					social_links?: Json;
					birthday?: string | null;
					title?: string | null;
					skills?: string[];
					mfa_recovery_codes?: string[] | null;
					created_at?: string;
				};
				Relationships: [];
			};
			workspaces: {
				Row: {
					id: string;
					name: string;
					slug: string;
					description: string | null;
					owner_id: string | null;
					logo_url: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					slug: string;
					description?: string | null;
					owner_id?: string | null;
					logo_url?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					slug?: string;
					description?: string | null;
					owner_id?: string | null;
					logo_url?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			workspace_members: {
				Row: {
					workspace_id: string;
					user_id: string;
					role: 'owner' | 'member' | 'guest';
					joined_at: string;
				};
				Insert: {
					workspace_id: string;
					user_id: string;
					role?: 'owner' | 'member' | 'guest';
					joined_at?: string;
				};
				Update: {
					workspace_id?: string;
					user_id?: string;
					role?: 'owner' | 'member' | 'guest';
					joined_at?: string;
				};
				Relationships: [];
			};
			workspace_invites: {
				Row: {
					id: string;
					workspace_id: string;
					email: string;
					token: string;
					role: 'owner' | 'member' | 'guest';
					expires_at: string;
					used_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					email: string;
					token: string;
					role?: 'owner' | 'member' | 'guest';
					expires_at: string;
					used_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					email?: string;
					token?: string;
					role?: 'owner' | 'member' | 'guest';
					expires_at?: string;
					used_at?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			polls: {
				Row: {
					id: string;
					activity_id: string;
					question: string;
					expires_at: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					activity_id: string;
					question: string;
					expires_at: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					activity_id?: string;
					question?: string;
					expires_at?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			poll_options: {
				Row: {
					id: string;
					poll_id: string;
					text: string;
					votes_count: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					poll_id: string;
					text: string;
					votes_count?: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					poll_id?: string;
					text?: string;
					votes_count?: number;
					created_at?: string;
				};
				Relationships: [];
			};
			poll_votes: {
				Row: {
					id: string;
					poll_id: string;
					option_id: string;
					user_id: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					poll_id: string;
					option_id: string;
					user_id: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					poll_id?: string;
					option_id?: string;
					user_id?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			snippets: {
				Row: {
					id: string;
					workspace_id: string;
					author_id: string;
					title: string;
					description: string | null;
					code: string;
					language: string;
					tags: string[];
					visibility: 'private' | 'workspace' | 'public';
					parent_id: string | null;
					fork_count: number;
					star_count: number;
					embedding: string | null;
					created_at: string;
					updated_at: string;
					toolbox_id: string | null;
					fts: unknown;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					author_id: string;
					title: string;
					description?: string | null;
					code: string;
					language?: string;
					tags?: string[];
					visibility?: 'private' | 'workspace' | 'public';
					parent_id?: string | null;
					fork_count?: number;
					star_count?: number;
					created_at?: string;
					updated_at?: string;
					toolbox_id?: string | null;
					fts?: unknown;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					author_id?: string;
					title?: string;
					description?: string | null;
					code?: string;
					language?: string;
					tags?: string[];
					visibility?: 'private' | 'workspace' | 'public';
					parent_id?: string | null;
					fork_count?: number;
					star_count?: number;
					created_at?: string;
					updated_at?: string;
					toolbox_id?: string | null;
					fts?: unknown;
				};
				Relationships: [
					{
						foreignKeyName: 'snippets_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'snippets_workspace_id_fkey';
						columns: ['workspace_id'];
						isOneToOne: false;
						referencedRelation: 'workspaces';
						referencedColumns: ['id'];
					}
				];
			};
			snippet_stars: {
				Row: {
					snippet_id: string;
					user_id: string;
					created_at: string;
				};
				Insert: {
					snippet_id: string;
					user_id: string;
					created_at?: string;
				};
				Update: {
					snippet_id?: string;
					user_id?: string;
					created_at?: string;
				};
				Relationships: [];
			};
			api_tests: {
				Row: {
					id: string;
					workspace_id: string;
					author_id: string;
					name: string;
					method: string;
					url: string;
					headers: Json | null;
					body: string | null;
					last_response: Json | null;
					last_run_at: string | null;
					created_at: string;
					updated_at: string;
					toolbox_id: string | null;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					author_id: string;
					name: string;
					method?: string;
					url: string;
					headers?: Json | null;
					body?: string | null;
					last_response?: Json | null;
					last_run_at?: string | null;
					created_at?: string;
					updated_at?: string;
					toolbox_id?: string | null;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					author_id?: string;
					name?: string;
					method?: string;
					url?: string;
					headers?: Json | null;
					body?: string | null;
					last_response?: Json | null;
					last_run_at?: string | null;
					created_at?: string;
					updated_at?: string;
					toolbox_id?: string | null;
				};
				Relationships: [];
			};
			api_environments: {
				Row: {
					id: string;
					workspace_id: string;
					name: string;
					variables: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					name: string;
					variables?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					name?: string;
					variables?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			notification_preferences: {
				Row: {
					user_id: string;
					workspace_id: string;
					mentions_enabled: boolean;
					replies_enabled: boolean;
					invites_enabled: boolean;
					ai_completions_enabled: boolean;
				};
				Insert: {
					user_id: string;
					workspace_id: string;
					mentions_enabled?: boolean;
					replies_enabled?: boolean;
					invites_enabled?: boolean;
					ai_completions_enabled?: boolean;
				};
				Update: {
					user_id?: string;
					workspace_id?: string;
					mentions_enabled?: boolean;
					replies_enabled?: boolean;
					invites_enabled?: boolean;
					ai_completions_enabled?: boolean;
				};
				Relationships: [];
			};
			notifications: {
				Row: {
					id: string;
					user_id: string;
					workspace_id: string | null;
					type: string;
					actor_id: string | null;
					payload: Json;
					read_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					workspace_id?: string | null;
					type: string;
					actor_id?: string | null;
					payload?: Json;
					read_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					workspace_id?: string | null;
					type?: string;
					actor_id?: string | null;
					payload?: Json;
					read_at?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			check_slug_unique: {
				Args: {
					target_slug: string;
				};
				Returns: boolean;
			};
			duplicate_note: {
				Args: {
					note_id: string;
					new_author_id: string;
				};
				Returns: string;
			};
			match_messages: {
				Args: {
					query_embedding: string;
					match_threshold: number;
					match_count: number;
					p_workspace_id: string;
				};
				Returns: {
					id: string;
					content: string;
					channel_id: string;
					user_id: string;
					similarity: number;
				}[];
			};
			match_notes: {
				Args: {
					query_embedding: string;
					match_threshold: number;
					match_count: number;
					p_workspace_id: string;
				};
				Returns: {
					id: string;
					title: string;
					content_text: string;
					similarity: number;
				}[];
			};
			match_snippets: {
				Args: {
					query_embedding: string;
					match_threshold: number;
					match_count: number;
					p_workspace_id: string;
				};
				Returns: {
					id: string;
					title: string;
					code: string;
					language: string;
					similarity: number;
				}[];
			};
			check_ai_rate_limit: {
				Args: {
					p_user_id: string;
					p_window_minutes?: number;
					p_max_requests?: number;
				};
				Returns: boolean;
			};
			create_notification: {
				Args: {
					p_user_id: string;
					p_workspace_id: string | null;
					p_type: string;
					p_actor_id: string | null;
					p_payload: Json;
				};
				Returns: string;
			};
			accept_workspace_invite: {
				Args: {
					p_token: string;
					p_user_id: string;
				};
				Returns: Json;
			};
			get_invite_details: {
				Args: {
					p_token: string;
				};
				Returns: Json;
			};
			get_recommended_developers: {
				Args: {
					p_user_id: string;
					p_limit?: number;
				};
				Returns: {
					id: string;
					username: string;
					avatar_url: string;
					title: string;
					skills: string[];
					influence_score: number;
					overlap_count: number;
				}[];
			};
			get_trending_snippets: {
				Args: {
					p_workspace_id: string | null;
					p_limit?: number;
				};
				Returns: {
					id: string;
					title: string;
					language: string;
					star_count: number;
					fork_count: number;
					author_username: string;
				}[];
			};
		};
		Enums: {
			user_role: 'owner' | 'member' | 'guest';
		};
	};
};

export type StoriesTable = Database['public']['Tables']['stories'];
export type FollowsTable = Database['public']['Tables']['follows'];
export type ActivitiesTable = Database['public']['Tables']['activities'];
export type ProfilesTable = Database['public']['Tables']['profiles'];
export type WorkspacesTable = Database['public']['Tables']['workspaces'];
export type MessagesTable = Database['public']['Tables']['messages'];
export type ChannelsTable = Database['public']['Tables']['channels'];
export type MessageReactionsTable = Database['public']['Tables']['message_reactions'];
export type MessageReadsTable = Database['public']['Tables']['message_reads'];
export type TypingIndicatorsTable = Database['public']['Tables']['typing_indicators'];
