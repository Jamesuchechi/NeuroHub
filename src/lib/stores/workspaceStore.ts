import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import type { Database } from '$lib/types/db';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update'];
type Member = Database['public']['Tables']['workspace_members']['Row'] & {
	profile: Database['public']['Tables']['profiles']['Row'];
};
type MemberUpdate = Database['public']['Tables']['workspace_members']['Update'];

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
	stats: {
		channels: number;
		documents: number;
		snippets: number;
	};
}

const db = supabase as unknown as WorkspaceStoreInternal;

// In-memory cache for workspace metadata
const workspaceCache = new Map<string, Omit<WorkspaceState, 'loading' | 'error'>>();

function createWorkspaceStore() {
	const store = writable<WorkspaceState>({
		currentWorkspace: null,
		members: [],
		userRole: null,
		loading: false,
		error: null,
		stats: {
			channels: 0,
			documents: 0,
			snippets: 0
		}
	});

	const { subscribe, set, update } = store;

	return {
		subscribe,
		setWorkspace: async (slug: string, userId: string) => {
			console.log(`[workspaceStore] DEBUG: Setting workspace slug="${slug}" for user="${userId}"`);

			// 1. Check cache for instant load
			const cached = workspaceCache.get(slug);
			if (cached) {
				console.log(`[workspaceStore] Cache hit for slug="${slug}"`);
				set({
					...cached,
					loading: false,
					error: null
				});
			} else {
				update((s) => ({ ...s, loading: true, error: null }));
			}

			try {
				// 2. Perform fetch (Always do this to ensure data is fresh)
				const response = await db.from('workspaces').select('*').eq('slug', slug).single();

				if (response.error) {
					console.error('[workspaceStore] Workspace fetch error:', response.error);
					throw response.error;
				}

				const workspace = response.data;
				if (!workspace) {
					throw new Error('Workspace not found');
				}

				// Fetch Members
				const { data: members, error: memError } = await db
					.from('workspace_members')
					.select('*, profile:profiles(*)')
					.eq('workspace_id', workspace.id)
					.returns<Member[]>();

				if (memError) throw memError;

				// Fetch Counts
				const [channelsCount, notesCount, snippetsCount] = await Promise.all([
					supabase
						.from('channels')
						.select('*', { count: 'exact', head: true })
						.eq('workspace_id', workspace.id),
					supabase
						.from('notes')
						.select('*', { count: 'exact', head: true })
						.eq('workspace_id', workspace.id),
					supabase
						.from('snippets')
						.select('*', { count: 'exact', head: true })
						.eq('workspace_id', workspace.id)
				]);

				const memberList = members || [];
				const userMember = memberList.find((m) => m.user_id === userId);

				const newState = {
					currentWorkspace: workspace,
					members: memberList,
					userRole: userMember?.role ?? null,
					stats: {
						channels: channelsCount.count || 0,
						documents: notesCount.count || 0,
						snippets: snippetsCount.count || 0
					}
				};

				// 3. Update cache and store
				workspaceCache.set(slug, newState);
				set({
					...newState,
					loading: false,
					error: null
				});
			} catch (err: unknown) {
				console.error('[workspaceStore] Caught error in setWorkspace:', err);

				let message = 'An unknown error occurred';
				const supabaseError = err as { code?: string; message?: string };

				if (supabaseError.code === 'PGRST116') {
					message = 'Access Denied: You do not have permission to view this workspace.';
				} else if (err instanceof Error) {
					message = err.message;
				}

				// Only set error if we don't have cached data to show
				if (!workspaceCache.has(slug)) {
					update((s) => ({ ...s, loading: false, error: message }));
				}
			}
		},
		updateWorkspace: async (updates: Partial<Workspace>) => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db.from('workspaces').update(updates).eq('id', current.id);
			if (error) throw error;

			update((s) => {
				if (!s.currentWorkspace) return s;
				const updatedWorkspace = { ...s.currentWorkspace, ...updates };

				// Update cache too
				workspaceCache.set(updatedWorkspace.slug, {
					currentWorkspace: updatedWorkspace,
					members: s.members,
					userRole: s.userRole,
					stats: s.stats
				});

				return {
					...s,
					currentWorkspace: updatedWorkspace
				};
			});
		},
		updateMemberRole: async (userId: string, role: 'owner' | 'member' | 'guest') => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db
				.from('workspace_members')
				.update({ role })
				.match({ workspace_id: current.id, user_id: userId });

			if (error) throw error;

			update((s) => {
				const updatedMembers = s.members.map((m) => (m.user_id === userId ? { ...m, role } : m));

				if (s.currentWorkspace) {
					workspaceCache.set(s.currentWorkspace.slug, {
						currentWorkspace: s.currentWorkspace,
						members: updatedMembers,
						userRole: s.userRole,
						stats: s.stats
					});
				}

				return {
					...s,
					members: updatedMembers
				};
			});
		},
		removeMember: async (userId: string) => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const { error } = await db
				.from('workspace_members')
				.delete()
				.match({ workspace_id: current.id, user_id: userId });

			if (error) throw error;

			update((s) => {
				const updatedMembers = s.members.filter((m) => m.user_id !== userId);
				if (s.currentWorkspace) {
					workspaceCache.set(s.currentWorkspace.slug, {
						currentWorkspace: s.currentWorkspace,
						members: updatedMembers,
						userRole: s.userRole,
						stats: s.stats
					});
				}
				return {
					...s,
					members: updatedMembers
				};
			});
		},
		deleteWorkspace: async () => {
			const current = get(store).currentWorkspace;
			if (!current) return;

			const slug = current.slug;
			const { error } = await db.from('workspaces').delete().eq('id', current.id);

			if (error) throw error;
			workspaceCache.delete(slug);
			workspaceStore.reset();
		},
		reset: () =>
			set({
				currentWorkspace: null,
				members: [],
				userRole: null,
				loading: false,
				error: null,
				stats: {
					channels: 0,
					documents: 0,
					snippets: 0
				}
			})
	};
}

export const workspaceStore = createWorkspaceStore();
