export interface WorkspaceItem {
	id: string;
	name: string;
	logo_url: string | null;
	owner_id: string;
	workspace_members: { count: number }[];
	created_at: string;
	slug: string;
}

export interface DeveloperItem {
	id: string;
	username: string | null;
	full_name: string | null;
	avatar_url: string | null;
	follows: { count: number }[];
	created_at: string;
}
