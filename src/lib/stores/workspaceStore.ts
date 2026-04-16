import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import type { AppDatabase } from '$lib/types/db';

type Workspace = AppDatabase['public']['Tables']['workspaces']['Row'];
type WorkspaceUpdate = AppDatabase['public']['Tables']['workspaces']['Update'];
type Member = AppDatabase['public']['Tables']['workspace_members']['Row'] & {
	profile: AppDatabase['public']['Tables']['profiles']['Row'];
};
type MemberUpdate = AppDatabase['public']['Tables']['workspace_members']['Update'];

/**
 * Strict type bridge to resolve Supabase inference issues in the workspace store.
 */
interface WorkspaceStoreInternal {
	from(table: 'workspaces'): {
		select(columns: string): {
			eq(
				column: string,
				value: string
			): {
				single(): Promise<{ data: Workspace | null; error: unknown }>;
			};
		};
		update(values: WorkspaceUpdate): {
			eq(column: string, value: string): Promise<{ error: unknown }>;
		};
		delete(): {
			eq(column: string, value: string): Promise<{ error: unknown }>;
		};
	};
	from(table: 'workspace_members'): {
		select(columns: string): {
			eq(
				column: string,
				value: string
			): {
				returns<T>(): Promise<{ data: T | null; error: unknown }>;
			};
		};
		update(values: MemberUpdate): {
			match(filters: Record<string, string>): Promise<{ error: unknown }>;
		};
		delete(): {
			match(filters: Record<string, string>): Promise<{ error: unknown }>;
		};
	};
}

interface WorkspaceState {
	currentWorkspace: Workspace | null;
	members: Member[];
	userRole: 'owner' | 'member' | 'guest' | null;
	loading: boolean;
	error: string | null;
}

const db = supabase as unknown as WorkspaceStoreInternal;

function createWorkspaceStore() {
	const store = writable<WorkspaceState>({
		currentWorkspace: null,
		members: [],
		userRole: null,
		loading: false,
		error: null
	});

	const { subscribe, set, update } = store;

	return {
		subscribe,
		setWorkspace: async (slug: string, userId: string) => {
			console.log(
				`[workspaceStore] DEBUG: Attempting to set workspace slug="${slug}" for user="${userId}"`
			);
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const response = await db.from('workspaces').select('*').eq('slug', slug).single();

				if (response.error) {
					console.error('[workspaceStore] DEBUG: Workspace fetch error:', response.error);
					throw response.error;
				}

				const workspace = response.data;
				if (!workspace) {
					throw new Error('Workspace not found');
				}

				const { data: members, error: memError } = await db
					.from('workspace_members')
					.select('*, profile:profiles(*)')
					.eq('workspace_id', workspace.id)
					.returns<Member[]>();

				if (memError) {
					console.error('[workspaceStore] DEBUG: Members fetch error:', memError);
					throw memError;
				}

				const memberList = members || [];
				const userMember = memberList.find((m) => m.user_id === userId);

				set({
					currentWorkspace: workspace,
					members: memberList,
					userRole: userMember?.role ?? null,
					loading: false,
					error: null
				});
			} catch (err: unknown) {
				console.error('[workspaceStore] DEBUG: Caught error in setWorkspace:', err);

				let message = 'An unknown error occurred';

				// Standard Supabase error check
				const supabaseError = err as { code?: string; message?: string };

				if (supabaseError.code === 'PGRST116') {
					message = 'Access Denied: You do not have permission to view this workspace.';
				} else if (err instanceof Error) {
					message = err.message;
				}

				update((s) => ({ ...s, loading: false, error: message }));
			}
		},
		updateWorkspace: async (updates: Partial<Workspace>) => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db.from('workspaces').update(updates).eq('id', current.id);

			if (error) throw error;

			update((s) => ({
				...s,
				currentWorkspace: s.currentWorkspace ? { ...s.currentWorkspace, ...updates } : null
			}));
		},
		updateMemberRole: async (userId: string, role: 'owner' | 'member' | 'guest') => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db
				.from('workspace_members')
				.update({ role })
				.match({ workspace_id: current.id, user_id: userId });

			if (error) throw error;

			update((s) => ({
				...s,
				members: s.members.map((m) => (m.user_id === userId ? { ...m, role } : m))
			}));
		},
		removeMember: async (userId: string) => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db
				.from('workspace_members')
				.delete()
				.match({ workspace_id: current.id, user_id: userId });

			if (error) throw error;

			update((s) => ({
				...s,
				members: s.members.filter((m) => m.user_id !== userId)
			}));
		},
		deleteWorkspace: async () => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db.from('workspaces').delete().eq('id', current.id);

			if (error) throw error;
			workspaceStore.reset();
		},
		reset: () =>
			set({
				currentWorkspace: null,
				members: [],
				userRole: null,
				loading: false,
				error: null
			})
	};
}

export const workspaceStore = createWorkspaceStore();
