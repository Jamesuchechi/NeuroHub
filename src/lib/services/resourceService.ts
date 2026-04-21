import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { uiStore } from '$lib/stores/uiStore';
import { activeTab, activeSnippetId } from '$lib/stores/devToolsStore';

export type ResourceType = 'user' | 'chan' | 'snip' | 'note' | 'api_test';

export interface ResourceRef {
	type: ResourceType;
	id: string;
	name: string;
}

export interface ListItem {
	id: string;
	name: string;
	type: ResourceType;
	avatar?: string | null;
	subtitle?: string;
	icon?: string;
}

/**
 * ResourceParser
 * Handles the serialization and deserialization of the NeuroHub reference protocol:
 * Format: [[type:id:name]]
 */
export const resourceParser = {
	// Pattern to find all tokens in a string
	tokenRegex: /\[\[(user|chan|snip|note|api_test):([a-z0-9-]+):([^\]]+)\]\]/g,

	parse(text: string): ResourceRef[] {
		const matches = [...text.matchAll(this.tokenRegex)];
		return matches.map((m) => ({
			type: m[1] as ResourceType,
			id: m[2],
			name: m[3]
		}));
	},

	serialize(type: ResourceType, id: string, name: string): string {
		return `[[${type}:${id}:${name}]]`;
	},

	/**
	 * Strips tokens and returns plain text for simple previews
	 */
	toPlainText(text: string): string {
		return text.replace(this.tokenRegex, '$3');
	}
};

/**
 * ResourceNavigator
 * Intelligent routing for cross-feature linking
 */
export const resourceNavigator = {
	async open(ref: ResourceRef, workspaceSlug: string) {
		const { type, id } = ref;

		switch (type) {
			case 'user':
				await goto(resolve(`/profile/${ref.name}`));
				break;

			case 'chan':
				await goto(resolve(`/workspace/${workspaceSlug}/chat/${id}`));
				break;

			case 'note':
				// Intelligent behavior: Open note in the Right Sidebar (Context Panel)
				// if we are already in a chat, so we don't break flow.
				uiStore.setSelectedNoteId(id);
				// Optionally navigate if not in workspace view?
				// For now assume all refs happen in-workspace
				break;

			case 'snip':
				activeTab.set('snippets');
				activeSnippetId.set(id);
				// If we want to force open the bottom pane:
				// uiStore.setDevToolsExpanded(true);
				break;

			default:
				console.warn(`[ResourceNavigator] Unknown resource type: ${type}`);
		}
	}
};
