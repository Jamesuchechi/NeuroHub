export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppDatabase = {
	public: {
		Tables: {
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
					mfa_recovery_codes?: string[] | null;
					created_at?: string;
				};
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
		};
		Enums: {
			user_role: 'owner' | 'member' | 'guest';
		};
	};
};

export type StoriesTable = AppDatabase['public']['Tables']['stories'];
export type FollowsTable = AppDatabase['public']['Tables']['follows'];
export type ActivitiesTable = AppDatabase['public']['Tables']['activities'];
export type ProfilesTable = AppDatabase['public']['Tables']['profiles'];
export type WorkspacesTable = AppDatabase['public']['Tables']['workspaces'];
