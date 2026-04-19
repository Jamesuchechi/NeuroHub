export type AIModel = 'intelligent' | 'fast' | 'stable';

export interface AIResponse {
	content: string;
	model: string;
	error?: string;
}

export const aiService = {
	/**
	 * Securely calls the internal SvelteKit AI Chat API with streaming support.
	 * Accepts an optional contextString (RAG output) and AbortSignal.
	 */
	async *streamChat(
		prompt: string,
		profile: AIModel = 'fast',
		systemPrompt?: string,
		workspaceId?: string,
		contextString?: string,
		signal?: AbortSignal
	) {
		const response = await fetch('/api/ai/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt,
				profile,
				system_prompt: systemPrompt,
				workspace_id: workspaceId,
				context_string: contextString
			}),
			signal
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || `AI Request Failed: ${response.statusText}`);
		}

		const reader = response.body?.getReader();
		const decoder = new TextDecoder();

		if (!reader) throw new Error('No body in AI response');

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			if (chunk) yield chunk;
		}
	},

	/**
	 * Non-streaming chat convenience method.
	 */
	async chat(
		prompt: string,
		profile: AIModel = 'fast',
		systemPrompt?: string,
		workspaceId?: string
	): Promise<AIResponse> {
		try {
			let fullContent = '';
			for await (const chunk of this.streamChat(prompt, profile, systemPrompt, workspaceId)) {
				fullContent += chunk;
			}
			return { content: fullContent, model: profile };
		} catch (err) {
			console.error('aiService.chat error:', err);
			return {
				content: '',
				model: 'error',
				error: err instanceof Error ? err.message : 'Unknown AI error'
			};
		}
	},

	/**
	 * Simulate execution prediction using the AI proxy.
	 */
	async simulateExecution(code: string, language: string) {
		const systemPrompt = `You are a high-performance code execution engine called "NeuroAI Runner". 
Predict stdout/stderr for the given code. Return ONLY a JSON object: {"stdout": "...", "stderr": "...", "error": null}`;

		const prompt = `Language: ${language}\nCode:\n${code}`;
		const result = await this.chat(prompt, 'fast', systemPrompt);

		if (result.error) return { stdout: '', stderr: '', error: result.error };

		try {
			const jsonStr = result.content.replace(/```json|```/g, '').trim();
			return JSON.parse(jsonStr);
		} catch (_err) {
			return { stdout: result.content, stderr: '', error: 'Parse error' };
		}
	}
};
