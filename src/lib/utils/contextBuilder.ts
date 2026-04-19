import { supabase } from '$lib/services/supabase';

export interface ChatContext {
	role: 'user' | 'assistant' | 'system';
	content: string;
	name?: string;
}

export interface WorkspaceContext {
	workspaceName: string;
	recentMessages: string[];
	recentNotes: { title: string; content: string }[];
	pinnedSnippets: { title: string; code: string }[];
}

interface MessageRecord {
	content: string;
	profiles: { username: string } | null;
}

interface NoteRecord {
	title: string;
	content: string | object;
}

interface SnippetRecord {
	title: string;
	code: string;
}

export const contextBuilder = {
	/**
	 * Aggregates context from multiple sources for a better AI understanding.
	 */
	async buildWorkspaceContext(workspaceId: string, channelId?: string): Promise<WorkspaceContext> {
		const [workspaceRes, messagesRes, notesRes, snippetsRes] = await Promise.all([
			supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
			channelId
				? supabase
						.from('messages')
						.select('content, profiles(username)')
						.eq('channel_id', channelId)
						.order('created_at', { ascending: false })
						.limit(20)
				: Promise.resolve({ data: [] }),
			supabase
				.from('notes')
				.select('title, content')
				.eq('workspace_id', workspaceId)
				.order('updated_at', { ascending: false })
				.limit(5),
			supabase
				.from('snippets')
				.select('title, code')
				.eq('workspace_id', workspaceId)
				.eq('visibility', 'workspace')
				.limit(3)
		]);

		return {
			workspaceName: workspaceRes.data?.name || 'Unknown Workspace',
			recentMessages: ((messagesRes.data as unknown as MessageRecord[]) || [])
				.reverse()
				.map((m) => `${m.profiles?.username || 'User'}: ${m.content}`),
			recentNotes: ((notesRes.data as unknown as NoteRecord[]) || []).map((n) => ({
				title: n.title,
				content: typeof n.content === 'object' ? JSON.stringify(n.content) : n.content
			})),
			pinnedSnippets: ((snippetsRes.data as unknown as SnippetRecord[]) || []).map((s) => ({
				title: s.title,
				code: s.code
			}))
		};
	},

	/**
	 * Formats workspace context into a single string for the system prompt.
	 */
	formatContextToString(context: WorkspaceContext): string {
		let prompt = `Current Workspace: ${context.workspaceName}\n\n`;

		if (context.recentMessages.length > 0) {
			prompt += 'Recent Chat Activity:\n' + context.recentMessages.join('\n') + '\n\n';
		}

		if (context.recentNotes.length > 0) {
			prompt += 'Related Knowledge Entries:\n';
			context.recentNotes.forEach((n) => {
				prompt += `Title: ${n.title}\nContent: ${n.content.slice(0, 500)}...\n\n`;
			});
		}

		if (context.pinnedSnippets.length > 0) {
			prompt += 'Workspace Snippets:\n';
			context.pinnedSnippets.forEach((s) => {
				prompt += `Title: ${s.title}\nCode:\n${s.code.slice(0, 300)}...\n\n`;
			});
		}

		// Rough estimate: truncate to ~8000 words (which is roughly 10k tokens)
		const words = prompt.split(/\s+/);
		if (words.length > 8000) {
			return words.slice(0, 8000).join(' ') + '... [Context Truncated]';
		}

		return prompt;
	}
};
