export type AIModel = 'intelligent' | 'fast' | 'stable';

interface AIResponse {
	content: string;
	model: string;
	error?: string;
}

export const aiService = {
	/**
	 * Client-side bridge to the secure AI API route.
	 */
	async chat(prompt: string, profile: AIModel = 'fast'): Promise<AIResponse> {
		try {
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt, profile })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to query AI');
			}

			return await response.json();
		} catch (err) {
			console.error('aiService error:', err);
			return {
				content: '',
				model: 'error',
				error: err instanceof Error ? err.message : 'Unknown AI error'
			};
		}
	}
};
