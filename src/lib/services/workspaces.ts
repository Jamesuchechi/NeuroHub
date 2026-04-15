import { supabase } from './supabase';
import type { Database } from '$lib/types/db';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];

export const workspacesService = {
	async getUserWorkspaces(userId: string) {
		const { data, error } = await supabase
			.from('workspace_members')
			.select('*, workspace:workspaces(*)')
			.eq('user_id', userId);

		if (error) throw error;
		return data.map((d) => d.workspace).filter((w): w is Workspace => w !== null);
	},

	async createWorkspace(userId: string, workspace: WorkspaceInsert) {
		// 1. Create workspace
		const { data: ws, error: wsError } = await supabase
			.from('workspaces')
			.insert(workspace)
			.select()
			.single();

		if (wsError) throw wsError;

		// 2. Add creator as owner
		const { error: memError } = await supabase.from('workspace_members').insert({
			workspace_id: ws.id,
			user_id: userId,
			role: 'owner'
		});

		if (memError) throw memError;

		return ws;
	},

	async uploadLogo(workspaceId: string, file: File) {
		const fileExt = file.name.split('.').pop();
		const fileName = `${workspaceId}-${Math.random()}.${fileExt}`;
		const filePath = `logos/${fileName}`;

		const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

		if (uploadError) throw uploadError;

		const {
			data: { publicUrl }
		} = supabase.storage.from('images').getPublicUrl(filePath);
		return publicUrl;
	},

	async checkSlugUnique(slug: string): Promise<{ unique: boolean; error?: string }> {
		try {
			const { data, error } = await supabase.rpc('check_slug_unique', {
				target_slug: slug
			});

			if (error) {
				console.error('[workspacesService] Slug check error:', error);
				return { unique: false, error: error.message };
			}

			// The RPC returns a boolean (true if unique, false if taken)
			return { unique: !!data };
		} catch (err) {
			console.error('[workspacesService] Unexpected slug check error:', err);
			return { unique: false, error: 'Unexpected error occurred during validation' };
		}
	},

	async createInvite(
		workspaceId: string,
		email: string,
		role: 'owner' | 'member' | 'guest' = 'member'
	) {
		const token = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

		const { data, error } = await supabase
			.from('workspace_invites')
			.insert({
				workspace_id: workspaceId,
				email,
				role,
				token,
				expires_at: expiresAt.toISOString()
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	},

	async getInvite(token: string) {
		const { data, error } = await supabase
			.from('workspace_invites')
			.select('*, workspace:workspaces(*)')
			.eq('token', token)
			.single();

		if (error) throw error;
		return data as Database['public']['Tables']['workspace_invites']['Row'] & {
			workspace: Workspace;
		};
	},

	async acceptInvite(token: string, userId: string): Promise<Workspace> {
		// 1. Get invite details
		const invite = await this.getInvite(token);

		if (new Date(invite.expires_at) < new Date()) {
			throw new Error('Invitation has expired');
		}

		// 2. Add member
		const { error: memError } = await supabase.from('workspace_members').insert({
			workspace_id: invite.workspace_id,
			user_id: userId,
			role: invite.role
		});

		if (memError) throw memError;

		// 3. Mark invite as used
		await supabase
			.from('workspace_invites')
			.update({ used_at: new Date().toISOString() })
			.eq('id', invite.id);

		return invite.workspace;
	}
};
