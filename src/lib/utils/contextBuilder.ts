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

export interface SemanticContextResult {
	contextString: string;
	references: { id: string; title: string }[];
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

interface SemanticNoteResult {
	id: string;
	title: string;
	content_text: string;
	similarity: number;
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
	 * Performs a semantic similarity search and returns the formatted context
	 * STRING only (backward compatible). For source references use
	 * findSemanticContextWithRefs instead.
	 */
	async findSemanticContext(query: string, workspaceId: string): Promise<string> {
		const result = await this.findSemanticContextWithRefs(query, workspaceId);
		return result.contextString;
	},

	async findSemanticContextWithRefs(
		query: string,
		workspaceId: string
	): Promise<SemanticContextResult> {
		const empty: SemanticContextResult = { contextString: '', references: [] };
		if (!query.trim()) return empty;

		try {
			// 1. Embed the user's query
			const embedRes = await fetch('/api/ai/embed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: query.slice(0, 2000) })
			});

			if (!embedRes.ok) return empty;
			const { embedding } = await embedRes.json();
			if (!embedding) return empty;

			// 2. Cosine similarity search against the notes vector index
			const { data, error } = await supabase.rpc('match_notes', {
				query_embedding: embedding,
				match_threshold: 0.45,
				match_count: 3,
				p_workspace_id: workspaceId
			});

			if (error || !data || (data as SemanticNoteResult[]).length === 0) return empty;

			const notes = data as SemanticNoteResult[];
			const references = notes.map((n) => ({ id: n.id, title: n.title }));

			// 3. Format for system prompt injection
			let contextString = '## Semantically Relevant Workspace Notes\n\n';
			for (const note of notes) {
				const snippet = (note.content_text || '').slice(0, 700);
				contextString += `### ${note.title}\n${snippet}${snippet.length >= 700 ? '…' : ''}\n\n`;
			}

			return { contextString, references };
		} catch {
			return empty;
		}
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

		const words = prompt.split(/\s+/);
		if (words.length > 8000) {
			return words.slice(0, 8000).join(' ') + '... [Context Truncated]';
		}
		return prompt;
	}
};
