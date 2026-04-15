import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import type { Database } from '$lib/types/db';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type Member = Database['public']['Tables']['workspace_members']['Row'] & {
	profile: Database['public']['Tables']['profiles']['Row'];
};

interface WorkspaceState {
	currentWorkspace: Workspace | null;
	members: Member[];
	userRole: 'owner' | 'member' | 'guest' | null;
	loading: boolean;
	error: string | null;
}

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
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const { data: workspace, error: wsError } = await supabase
					.from('workspaces')
					.select('*')
					.eq('slug', slug)
					.single();

				if (wsError) throw wsError;

				const { data: members, error: memError } = await supabase
					.from('workspace_members')
					.select('*, profile:profiles(*)')
					.eq('workspace_id', workspace.id);

				if (memError) throw memError;

				const memberList = members as unknown as Member[];
				const userMember = memberList.find((m) => m.user_id === userId);

				set({
					currentWorkspace: workspace,
					members: memberList,
					userRole: userMember?.role ?? null,
					loading: false,
					error: null
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : 'An unknown error occurred';
				update((s) => ({ ...s, loading: false, error: message }));
			}
		},
		updateWorkspace: async (updates: Partial<Workspace>) => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await supabase.from('workspaces').update(updates).eq('id', current.id);

			if (error) throw error;

			update((s) => ({
				...s,
				currentWorkspace: s.currentWorkspace ? { ...s.currentWorkspace, ...updates } : null
			}));
		},
		updateMemberRole: async (userId: string, role: 'owner' | 'member' | 'guest') => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await supabase
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

			const { error } = await supabase
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

			const { error } = await supabase.from('workspaces').delete().eq('id', current.id);

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
