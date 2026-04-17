import { supabase } from './supabase';
import type { Database } from '$lib/types/db';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
type MemberInsert = Database['public']['Tables']['workspace_members']['Insert'];
type InviteInsert = Database['public']['Tables']['workspace_invites']['Insert'];
type InviteUpdate = Database['public']['Tables']['workspace_invites']['Update'];

type Invite = Database['public']['Tables']['workspace_invites']['Row'];

/**
 * Strict type bridge to resolve Supabase inference issues in the workspace service.
 * This pattern provide a rock-solid flight-path for the compiler.
 */
interface WorkspaceServiceInternal {
	from(table: 'workspaces'): {
		insert(values: WorkspaceInsert): {
			select(): {
				single(): Promise<{ data: Workspace; error: unknown }>;
			};
		};
	};
	from(table: 'workspace_members'): {
		select(columns: string): {
			eq(
				column: string,
				value: string
			): Promise<{ data: { workspace: Workspace }[] | null; error: unknown }>;
		};
		insert(values: MemberInsert): Promise<{ error: unknown }>;
	};
	from(table: 'workspace_invites'): {
		insert(values: InviteInsert): {
			select(): {
				single(): Promise<{ data: Invite; error: unknown }>;
			};
		};
		select(columns: string): {
			eq(
				column: string,
				value: string
			): {
				single(): Promise<{ data: Invite & { workspace: Workspace }; error: unknown }>;
			};
		};
		update(values: InviteUpdate): {
			eq(column: string, value: string): Promise<{ error: unknown }>;
		};
	};
	rpc(
		fn: 'check_slug_unique',
		args: { target_slug: string }
	): Promise<{ data: boolean; error: unknown }>;
	storage: {
		from(bucket: 'images'): {
			upload(path: string, file: File): Promise<{ error: unknown }>;
			getPublicUrl(path: string): { data: { publicUrl: string } };
		};
	};
}

const db = supabase as unknown as WorkspaceServiceInternal;

export const workspacesService = {
	async getUserWorkspaces(userId: string) {
		const { data, error } = await db
			.from('workspace_members')
			.select('*, workspace:workspaces(*)')
			.eq('user_id', userId);

		if (error) throw error;
		return ((data as { workspace: Workspace }[]) || [])
			.map((d) => d.workspace)
			.filter((w): w is Workspace => w !== null);
	},

	async createWorkspace(userId: string, workspace: WorkspaceInsert) {
		// 1. Create workspace
		const { data: ws, error: wsError } = await db
			.from('workspaces')
			.insert(workspace)
			.select()
			.single();

		if (wsError) throw wsError;

		const workspaceData = ws as { id: string };

		// 2. Add creator as owner
		const { error: memError } = await db.from('workspace_members').insert({
			workspace_id: workspaceData.id,
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

		const { error: uploadError } = await db.storage.from('images').upload(filePath, file);

		if (uploadError) throw uploadError;

		const {
			data: { publicUrl }
		} = db.storage.from('images').getPublicUrl(filePath);
		return publicUrl;
	},

	async checkSlugUnique(slug: string): Promise<{ unique: boolean; error?: string }> {
		try {
			const { data, error } = await db.rpc('check_slug_unique', {
				target_slug: slug
			});

			if (error) {
				console.error('[workspacesService] Slug check error:', error);
				const message =
					typeof error === 'object' && error !== null && 'message' in error
						? (error as { message: string }).message
						: 'Validation failed';
				return { unique: false, error: message };
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

		const { data, error } = await db
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
		const { data, error } = await db
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
		const { error: memError } = await db.from('workspace_members').insert({
			workspace_id: invite.workspace_id,
			user_id: userId,
			role: invite.role
		});

		if (memError) throw memError;

		// 3. Mark invite as used
		const { error: updateError } = await db
			.from('workspace_invites')
			.update({ used_at: new Date().toISOString() })
			.eq('id', invite.id);

		if (updateError) throw updateError;

		return invite.workspace;
	}
};
