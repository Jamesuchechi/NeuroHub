import { aiService, type AIModel } from '$lib/services/ai';

class AIStore {
	#isGenerating = $state(false);
	#error = $state<string | null>(null);

	get isGenerating() {
		return this.#isGenerating;
	}
	get error() {
		return this.#error;
	}

	/**
	 * Tries models in order of quality: intelligent -> stable -> fast
	 */
	private async smartChat(prompt: string): Promise<string> {
		this.#isGenerating = true;
		this.#error = null;

		const models: AIModel[] = ['intelligent', 'stable', 'fast'];

		for (const model of models) {
			const res = await aiService.chat(prompt, model);
			if (!res.error && res.content) {
				this.#isGenerating = false;
				return res.content;
			}
		}

		this.#isGenerating = false;
		this.#error = 'All AI models failed to respond. Please check your connection or quota.';
		return '';
	}

	async generateNoteDraft(topic: string): Promise<string | null> {
		const prompt = `You are a professional knowledge assistant. 
Write a high-quality, comprehensive knowledge entry about "${topic}".
Include clear headings, detailed explanations, and structured bullet points.
Format the output using ONLY semantic HTML tags (h1, h2, p, ul, li, code, strong).
Do not include any conversational filler or Markdown blocks (like \`\`\`html). 
Return just the raw HTML content ready for an editor.`;

		const result = await this.smartChat(prompt);
		return result || null;
	}

	async expandContent(context: string): Promise<string | null> {
		const prompt = `Review the following note content and expand on it with deeper insights, 
more technical details, and additional context. Maintain a professional and helpful tone. 
Return ONLY the new, additional content in clean semantic HTML tags.
---
${context}`;

		const result = await this.smartChat(prompt);
		return result || null;
	}

	clearError() {
		this.#error = null;
	}
}

export const aiStore = new AIStore();
