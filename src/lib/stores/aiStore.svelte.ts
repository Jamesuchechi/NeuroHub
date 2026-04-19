import { aiService, type AIModel } from '$lib/services/ai';
import { contextBuilder } from '$lib/utils/contextBuilder';
import { supabase } from '$lib/services/supabase';
import { toast } from '$lib/stores/toastStore';

// ── Storage ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'neuro-ai-state';
/** Trigger conversation summarisation once this many messages are in the thread. */
const SUMMARIZE_THRESHOLD = 20;
/** Re-summarise every N messages after the threshold is crossed. */
const SUMMARIZE_INTERVAL = 10;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	/** RAG source notes cited in this response (assistant only). */
	references?: { id: string; title: string }[];
	/** User quality rating: 1 = thumbs up, -1 = thumbs down. */
	rating?: 1 | -1;
}

export interface AIConversation {
	id: string;
	title: string;
	messages: AIMessage[];
	createdAt: number;
	/** Optional custom system prompt / persona for this conversation. */
	systemPrompt?: string;
	/** Cached summary of older messages for smart context pruning. */
	summary?: string;
}

export type { AIModel };

// ── Store Class ────────────────────────────────────────────────────────────────
class AIStore {
	#isGenerating = $state(false);
	#error = $state<string | null>(null);
	#currentGeneration = $state('');
	#messages = $state<AIMessage[]>([]);
	#conversations = $state<AIConversation[]>([]);
	#activeConversationId = $state<string | null>(null);
	#selectedModel = $state<AIModel>('fast');
	#isSavingNote = $state(false);
	#lastSavedNoteId = $state<string | null>(null);

	// Not reactive — internal plumbing only
	#abortController: AbortController | null = null;

	constructor() {
		if (typeof window === 'undefined') return;
		this.#hydrate();
	}

	// ── Persistence ────────────────────────────────────────────────────────────
	#hydrate() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const state = JSON.parse(raw) as {
				conversations: AIConversation[];
				activeId: string | null;
			};
			this.#conversations = state.conversations ?? [];
			const activeId = state.activeId;
			if (activeId) {
				const conv = this.#conversations.find((c) => c.id === activeId);
				if (conv) {
					this.#activeConversationId = activeId;
					this.#messages = conv.messages;
				}
			}
		} catch {
			// Corrupt storage — start fresh
		}
	}

	#persist() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					conversations: this.#conversations,
					activeId: this.#activeConversationId
				})
			);
		} catch {
			// Storage full or unavailable
		}
	}

	// ── Getters ────────────────────────────────────────────────────────────────
	get isGenerating() {
		return this.#isGenerating;
	}
	get error() {
		return this.#error;
	}
	get currentGeneration() {
		return this.#currentGeneration;
	}
	get messages() {
		return this.#messages;
	}
	get conversations() {
		return this.#conversations;
	}
	get activeConversationId() {
		return this.#activeConversationId;
	}
	get selectedModel() {
		return this.#selectedModel;
	}
	get isSavingNote() {
		return this.#isSavingNote;
	}
	get lastSavedNoteId() {
		return this.#lastSavedNoteId;
	}
	get activeConversationSystemPrompt() {
		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
		return conv?.systemPrompt ?? '';
	}

	// ── Model Selection ────────────────────────────────────────────────────────
	setModel(model: AIModel) {
		this.#selectedModel = model;
	}

	// ── Custom System Prompt ──────────────────────────────────────────────────
	setConversationSystemPrompt(prompt: string) {
		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
		if (!conv) return;
		conv.systemPrompt = prompt.trim() || undefined;
		this.#persist();
	}

	// ── Stream Abort ────────────────────────────────────────────────────────────
	abortGeneration() {
		this.#abortController?.abort();
		this.#abortController = null;
		this.#isGenerating = false;
		this.#currentGeneration = '';
	}

	// ── Conversation Management ────────────────────────────────────────────────
	newConversation() {
		const id = crypto.randomUUID();
		const conv: AIConversation = {
			id,
			title: 'New Conversation',
			messages: [],
			createdAt: Date.now()
		};
		this.#conversations.unshift(conv);
		this.#activeConversationId = id;
		this.#messages = [];
		this.#error = null;
		this.#currentGeneration = '';
		this.#persist();
		return id;
	}

	switchConversation(id: string) {
		const conv = this.#conversations.find((c) => c.id === id);
		if (!conv) return;
		this.#activeConversationId = id;
		this.#messages = conv.messages;
		this.#error = null;
		this.#currentGeneration = '';
		this.#persist();
	}

	deleteConversation(id: string) {
		this.#conversations = this.#conversations.filter((c) => c.id !== id);
		if (this.#activeConversationId === id) {
			if (this.#conversations.length > 0) {
				this.switchConversation(this.#conversations[0].id);
			} else {
				this.newConversation();
			}
		}
		this.#persist();
	}

	// ── @Mention Resolution ────────────────────────────────────────────────────
	private async resolveMentions(
		content: string
	): Promise<{ cleanContent: string; contextAppendix: string }> {
		const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
		const mentions: { title: string; id: string }[] = [];
		let match;
		while ((match = mentionRegex.exec(content)) !== null) {
			mentions.push({ title: match[1], id: match[2] });
		}
		if (mentions.length === 0) return { cleanContent: content, contextAppendix: '' };

		const cleanContent = content.replace(mentionRegex, '@$1');
		let contextAppendix = '## Manually Referenced Context\n\n';

		for (const mention of mentions) {
			try {
				const { data } = await supabase
					.from('notes')
					.select('title, content')
					.eq('id', mention.id)
					.single();
				if (data) {
					const text =
						typeof data.content === 'object'
							? JSON.stringify(data.content).slice(0, 2000)
							: String(data.content).slice(0, 2000);
					contextAppendix += `### Note: ${data.title}\n${text}\n\n`;
				}
			} catch {
				// Gracefully skip missing notes
			}
		}
		return { cleanContent, contextAppendix };
	}

	// ── Core Streaming Engine ──────────────────────────────────────────────────
	private async smartStream(
		prompt: string,
		systemPrompt?: string,
		workspace_id?: string,
		contextString?: string
	): Promise<string> {
		this.#isGenerating = true;
		this.#error = null;
		this.#currentGeneration = '';

		const controller = new AbortController();
		this.#abortController = controller;

		const allModels: AIModel[] = ['intelligent', 'stable', 'fast'];
		const startIdx = allModels.indexOf(this.#selectedModel);
		const models = allModels.slice(startIdx);

		for (const model of models) {
			if (controller.signal.aborted) break;
			try {
				let result = '';
				for await (const chunk of aiService.streamChat(
					prompt,
					model,
					systemPrompt,
					workspace_id,
					contextString,
					controller.signal
				)) {
					if (controller.signal.aborted) break;
					result += chunk;
					this.#currentGeneration = result;
				}
				this.#isGenerating = false;
				this.#abortController = null;
				return result;
			} catch (err) {
				if (controller.signal.aborted) break;
				console.warn(`[NeuroAI] Model ${model} failed, trying next...`, err);
				continue;
			}
		}

		this.#isGenerating = false;
		this.#abortController = null;
		if (!controller.signal.aborted) {
			this.#error = 'All AI models failed to respond. Please check your connection or quota.';
		}
		return '';
	}

	// ── Generation Core (shared by sendMessage + regenerate) ──────────────────
	/**
	 * Builds full context, streams a response, attaches references, and
	 * persists. This is the single source of truth for AI generation.
	 */
	private async generateResponse(workspace_id?: string, mentionContext?: string): Promise<void> {
		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);

		this.#isGenerating = true;
		this.#error = null;
		this.#currentGeneration = '';

		try {
			// 1. Get the last user message for semantic retrieval
			const userQuery = [...this.#messages].reverse().find((m) => m.role === 'user')?.content ?? '';

			// 2. Build RAG context (semantic search + general workspace info)
			let contextString = '';
			let references: { id: string; title: string }[] = [];

			if (workspace_id) {
				const [semanticResult, workspaceCtxRaw] = await Promise.all([
					contextBuilder.findSemanticContextWithRefs(userQuery, workspace_id),
					contextBuilder.buildWorkspaceContext(workspace_id)
				]);
				references = semanticResult.references;
				const wsCtxStr = contextBuilder.formatContextToString(workspaceCtxRaw);
				const parts = [semanticResult.contextString, wsCtxStr, mentionContext].filter(Boolean);
				contextString = parts.join('\n\n').trim();
			} else if (mentionContext) {
				contextString = mentionContext;
			}

			// 3. Build history — use cached summary for long threads
			let historyPrompt: string;
			if (conv?.summary && this.#messages.length > SUMMARIZE_THRESHOLD) {
				const recent = this.#messages
					.slice(-8)
					.map((m) => `${m.role}: ${m.content}`)
					.join('\n');
				historyPrompt = `[Conversation Summary]\n${conv.summary}\n\n[Recent Messages]\n${recent}`;
			} else {
				historyPrompt = this.#messages
					.slice(-10)
					.map((m) => `${m.role}: ${m.content}`)
					.join('\n');
			}

			// 4. System prompt — custom persona overrides the default
			const customPrompt = conv?.systemPrompt;
			const systemPrompt = customPrompt
				? `${customPrompt}\n\nAdditionally: Use Markdown for formatting. When including code, always specify the language on the fence (e.g. \`\`\`typescript).`
				: `You are NeuroAI, the advanced intelligence layer of NeuroHub.
You are assisting a developer in their workspace.
Be concise, technical, and insightful. Use Markdown for formatting.
When you include code examples, ALWAYS specify the programming language on the opening fence (e.g. \`\`\`typescript).
Use the provided workspace context to give precise, relevant answers.`;

			// 5. Stream the response
			const result = await this.smartStream(
				historyPrompt,
				systemPrompt,
				workspace_id,
				contextString || undefined
			);

			if (result) {
				const assistantMsg: AIMessage = {
					role: 'assistant',
					content: result,
					timestamp: Date.now(),
					references: references.length > 0 ? references : undefined
				};
				this.#messages.push(assistantMsg);
				if (conv) conv.messages = this.#messages;
				this.#persist();

				// Fire-and-forget background summarisation
				this.#maybeSummarize(conv);
			}
		} catch {
			this.#error = 'Failed to generate response.';
		} finally {
			this.#isGenerating = false;
			this.#currentGeneration = '';
		}
	}

	// ── Smart Context Summarisation (background) ──────────────────────────────
	#maybeSummarize(conv: AIConversation | undefined) {
		if (!conv) return;
		if (this.#messages.length < SUMMARIZE_THRESHOLD) return;

		const excess = this.#messages.length - SUMMARIZE_THRESHOLD;
		// Only trigger at threshold and then every SUMMARIZE_INTERVAL messages
		if (excess > 0 && excess % SUMMARIZE_INTERVAL !== 0) return;

		const oldMessages = this.#messages.slice(0, this.#messages.length - 8);
		const summaryPrompt = oldMessages
			.map((m) => `${m.role}: ${m.content.slice(0, 400)}`)
			.join('\n');

		// Use fast model — this runs in the background, never blocks the user
		aiService
			.chat(
				`Summarize this conversation history in 3-5 bullet points, capturing key facts, decisions, and context:\n\n${summaryPrompt}`,
				'fast',
				'You are a precise conversation summarizer. Return ONLY concise bullet points, no preamble.'
			)
			.then((result) => {
				if (result.content && !result.error) {
					conv.summary = result.content;
					this.#persist();
				}
			})
			.catch(() => {});
	}

	// ── Send Message ───────────────────────────────────────────────────────────
	async sendMessage(content: string, workspace_id?: string) {
		if (!content.trim() || this.#isGenerating) return;
		if (!this.#activeConversationId) this.newConversation();

		// 1. Resolve @mentions
		const { cleanContent, contextAppendix } = await this.resolveMentions(content);

		// 2. Push user message
		const userMsg: AIMessage = { role: 'user', content: cleanContent, timestamp: Date.now() };
		this.#messages.push(userMsg);

		// 3. Auto-title from first message
		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
		if (conv && conv.title === 'New Conversation' && conv.messages.length === 0) {
			conv.title = cleanContent.slice(0, 50) + (cleanContent.length > 50 ? '…' : '');
		}
		if (conv) conv.messages = this.#messages;
		this.#persist();

		await this.generateResponse(workspace_id, contextAppendix || undefined);
	}

	// ── Regenerate Last Response ───────────────────────────────────────────────
	async regenerate(workspace_id?: string) {
		if (this.#isGenerating) return;

		// Remove the last assistant message, if any
		if (this.#messages.at(-1)?.role === 'assistant') {
			this.#messages.pop();
			const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
			if (conv) conv.messages = this.#messages;
			this.#persist();
		}

		await this.generateResponse(workspace_id);
	}

	// ── Quality Rating ─────────────────────────────────────────────────────────
	async rateMessage(timestamp: number, rating: 1 | -1, workspaceId?: string) {
		const msg = this.#messages.find((m) => m.timestamp === timestamp);
		if (!msg || msg.role !== 'assistant') return;

		// Toggle off if the same rating is clicked again
		if (msg.rating === rating) {
			msg.rating = undefined;
		} else {
			msg.rating = rating;
		}

		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
		if (conv) conv.messages = this.#messages;
		this.#persist();

		// Log to Supabase — graceful fail if table doesn't exist yet
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (supabase as any).from('ai_feedback').insert({
				message_content: msg.content.slice(0, 1000),
				rating,
				workspace_id: workspaceId || null,
				rated_at: new Date().toISOString()
			});
		} catch {
			// Table may not exist yet — silently ignore
		}
	}

	// ── Save Message as Note ───────────────────────────────────────────────────
	async saveMessageAsNote(
		content: string,
		workspaceId: string,
		authorId: string
	): Promise<string | null> {
		this.#isSavingNote = true;
		try {
			const firstLine =
				content
					.split('\n')
					.map((l) => l.replace(/^#+\s*/, '').trim())
					.find((l) => l.length > 0) || 'AI Note';
			const title = firstLine.slice(0, 60) + (firstLine.length > 60 ? '…' : '');

			const { data, error } = await supabase
				.from('notes')
				.insert({
					workspace_id: workspaceId,
					author_id: authorId,
					title,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }]
					},
					status: 'draft',
					tags: ['neuro-ai']
				})
				.select('id')
				.single();

			if (error) throw error;
			this.#lastSavedNoteId = data.id;
			toast.show(`✓ Note saved: "${title}"`, 'success', 4000);
			return data.id;
		} catch (err) {
			console.error('[aiStore] saveMessageAsNote error:', err);
			toast.show('Failed to save note. Check your connection.', 'error');
			return null;
		} finally {
			this.#isSavingNote = false;
		}
	}

	// ── Workspace Utilities (note editor, snippets, etc.) ─────────────────────
	async generateNoteDraft(topic: string): Promise<string | null> {
		const systemPrompt = `You are a professional knowledge assistant.
Write a high-quality, comprehensive knowledge entry.
Include clear headings, detailed explanations, and structured bullet points.
Format the output using ONLY semantic HTML tags (h1, h2, p, ul, li, code, strong).
Do not include any conversational filler or Markdown blocks.
Return just the raw HTML content.`;
		const result = await this.smartStream(`Topic: ${topic}`, systemPrompt);
		return result || null;
	}

	async expandContent(context: string): Promise<string | null> {
		const result = await this.smartStream(
			`Content to expand:\n${context}`,
			'Review the note content and expand on it with deeper insights. Maintain a professional and helpful tone. Return ONLY the new, additional content in clean semantic HTML tags.'
		);
		return result || null;
	}

	async improveContent(content: string): Promise<string | null> {
		const result = await this.smartStream(
			`Text to improve:\n${content}`,
			'Analyze the provided text and rewrite it for maximum clarity, better grammar, and a professional developer-centric tone. DO NOT change the technical meaning or omit important details. Return ONLY the rewritten text in clean semantic HTML tags.'
		);
		return result || null;
	}

	async suggestSnippetTitle(code: string, language: string): Promise<string | null> {
		const result = await this.smartStream(
			`Language: ${language}\nCode:\n${code}`,
			'You are an expert developer. Provide a concise, clear, and descriptive title for the given code snippet. The title should be brief (3-6 words) and professional. Return ONLY the suggested title as a plain string, no quotes or metadata.'
		);
		return result?.replace(/["']/g, '').trim() || null;
	}

	async generateCustom(prompt: string, systemPrompt?: string): Promise<string | null> {
		const result = await this.smartStream(prompt, systemPrompt);
		return result || null;
	}

	clearHistory() {
		this.#messages = [];
		this.#error = null;
		this.#currentGeneration = '';
	}

	clearError() {
		this.#error = null;
		this.#currentGeneration = '';
	}
}

export const aiStore = new AIStore();
