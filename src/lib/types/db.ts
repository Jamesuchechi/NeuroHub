export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					username: string | null;
					avatar_url: string | null;
					bio: string | null;
					created_at: string;
				};
				Insert: {
					id: string;
					username?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					username?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
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
		};
		Enums: {
			user_role: 'owner' | 'member' | 'guest';
		};
	};
}
