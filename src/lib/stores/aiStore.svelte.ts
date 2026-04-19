import { aiService, type AIModel } from '$lib/services/ai';

export interface AIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
}

export interface AIConversation {
	id: string;
	title: string;
	messages: AIMessage[];
	createdAt: number;
}

class AIStore {
	#isGenerating = $state(false);
	#error = $state<string | null>(null);
	#currentGeneration = $state('');
	#messages = $state<AIMessage[]>([]);
	#conversations = $state<AIConversation[]>([]);
	#activeConversationId = $state<string | null>(null);

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
		return id;
	}

	switchConversation(id: string) {
		const conv = this.#conversations.find((c) => c.id === id);
		if (!conv) return;
		this.#activeConversationId = id;
		this.#messages = conv.messages;
		this.#error = null;
		this.#currentGeneration = '';
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
	}

	/**
	 * Tries models in order of quality with streaming support.
	 */
	private async smartStream(
		prompt: string,
		systemPrompt?: string,
		workspace_id?: string
	): Promise<string> {
		this.#isGenerating = true;
		this.#error = null;
		this.#currentGeneration = '';

		const models: AIModel[] = ['intelligent', 'stable', 'fast'];

		for (const model of models) {
			try {
				let result = '';
				for await (const chunk of aiService.streamChat(prompt, model, systemPrompt, workspace_id)) {
					result += chunk;
					this.#currentGeneration = result;
				}

				this.#isGenerating = false;
				return result;
			} catch (err) {
				console.warn(`Model ${model} failed, trying next...`, err);
				continue;
			}
		}

		this.#isGenerating = false;
		this.#error = 'All AI models failed to respond. Please check your connection or quota.';
		return '';
	}

	/**
	 * Main entry point for multi-turn chat
	 */
	async sendMessage(content: string, workspace_id?: string) {
		if (!content.trim() || this.#isGenerating) return;

		// Auto-create a conversation session if none is active
		if (!this.#activeConversationId) {
			this.newConversation();
		}

		// 1. Add User Message
		const userMsg: AIMessage = {
			role: 'user',
			content,
			timestamp: Date.now()
		};
		this.#messages.push(userMsg);

		// Auto-title the conversation from the first user message
		const conv = this.#conversations.find((c) => c.id === this.#activeConversationId);
		if (conv && conv.title === 'New Conversation' && conv.messages.length === 0) {
			conv.title = content.slice(0, 50) + (content.length > 50 ? '…' : '');
		}

		// Sync messages into the active conversation
		if (conv) conv.messages = this.#messages;

		this.#isGenerating = true;
		this.#error = null;
		this.#currentGeneration = '';

		try {
			// 2. Prepare Context (Last 10 messages for now)
			const context = this.#messages
				.slice(-10)
				.map((m) => `${m.role}: ${m.content}`)
				.join('\n');
			const systemPrompt = `You are NeuroAI, the advanced intelligence layer of NeuroHub. 
You are assisting a developer in their workspace. 
Be concise, technical, and helpful. Use Markdown for formatting.`;

			// 3. Generate Stream
			const result = await this.smartStream(context, systemPrompt, workspace_id);

			if (result) {
				const assistantMsg: AIMessage = {
					role: 'assistant',
					content: result,
					timestamp: Date.now()
				};
				this.#messages.push(assistantMsg);
				if (conv) conv.messages = this.#messages;
			}
		} catch (_err) {
			this.#error = 'Failed to generate response.';
		} finally {
			this.#isGenerating = false;
			this.#currentGeneration = '';
		}
	}

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
		const systemPrompt = `Review the note content and expand on it with deeper insights. 
Maintain a professional and helpful tone. 
Return ONLY the new, additional content in clean semantic HTML tags.`;

		const result = await this.smartStream(`Content to expand:\n${context}`, systemPrompt);
		return result || null;
	}

	async improveContent(content: string): Promise<string | null> {
		const systemPrompt = `Analyze the provided text and rewrite it for maximum clarity, better grammar, and a professional developer-centric tone. 
DO NOT change the technical meaning or omit important details.
Return ONLY the rewritten text in clean semantic HTML tags.`;

		const result = await this.smartStream(`Text to improve:\n${content}`, systemPrompt);
		return result || null;
	}

	async suggestSnippetTitle(code: string, language: string): Promise<string | null> {
		const systemPrompt = `You are an expert developer. Provide a concise, clear, and descriptive title for the given code snippet.
The title should be brief (3-6 words) and professional.
Return ONLY the suggested title as a plain string, no quotes or metadata.`;

		const result = await this.smartStream(`Language: ${language}\nCode:\n${code}`, systemPrompt);
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
