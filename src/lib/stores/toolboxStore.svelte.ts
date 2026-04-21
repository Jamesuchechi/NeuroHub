import { workspaceStore } from './workspaceStore';
import { get } from 'svelte/store';
import type { Database } from '$lib/types/db';

type Environment = Database['public']['Tables']['api_environments']['Row'];

class ToolboxStore {
	selectedToolboxId = $state<string | null>(null);
	toolboxes = $state<Environment[]>([]);
	isLoading = $state(false);

	activeToolbox = $derived(this.toolboxes.find((t) => t.id === this.selectedToolboxId) || null);

	activeVariables = $derived(
		typeof this.activeToolbox?.variables === 'object'
			? (this.activeToolbox.variables as Record<string, string>)
			: {}
	);

	setToolbox(id: string | null) {
		this.selectedToolboxId = id;
		const wsId = get(workspaceStore).currentWorkspace?.id;
		if (id && wsId) {
			localStorage.setItem(`active-toolbox-${wsId}`, id);
		} else if (wsId) {
			localStorage.removeItem(`active-toolbox-${wsId}`);
		}
	}

	setToolboxes(list: Environment[]) {
		this.toolboxes = list;

		// Restore from localStorage
		const wsId = get(workspaceStore).currentWorkspace?.id;
		const saved = wsId ? localStorage.getItem(`active-toolbox-${wsId}`) : null;

		if (saved && list.some((t) => t.id === saved)) {
			this.selectedToolboxId = saved;
		} else if (list.length > 0 && !this.selectedToolboxId) {
			this.selectedToolboxId = list[0].id;
		}
	}
}

export const toolboxStore = new ToolboxStore();
