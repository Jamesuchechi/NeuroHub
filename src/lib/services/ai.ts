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
	},

	/**
	 * Simulates code execution by using AI to predict stdout/stderr.
	 */
	async simulateExecution(
		code: string,
		language: string
	): Promise<{ stdout: string; stderr: string; error: string | null }> {
		const prompt = `
      You are a high-performance code execution engine called "NeuroAI Runner". 
      Your task is to ARBITRARILY and ACCURATELY simulate the execution of the following code.
      
      Language: ${language}
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Instructions:
      1. Predict the exact standard output (stdout) and standard error (stderr) if this code were to be run in a real environment.
      2. If there are syntax errors or runtime errors, put the diagnostic message in "stderr".
      3. Return ONLY a JSON object in the following format:
         {
           "stdout": "string",
           "stderr": "string",
           "error": "null or string message if execution failed completely"
         }
      
      Output ONLY the JSON. No preamble, no explanation.
    `;

		const result = await this.chat(prompt, 'fast');

		if (result.error) {
			return { stdout: '', stderr: '', error: result.error };
		}

		try {
			// Extract JSON from response (clean up markdown if any)
			const jsonStr = result.content.replace(/```json|```/g, '').trim();
			return JSON.parse(jsonStr);
		} catch (_err) {
			console.error('Failed to parse AI execution output:', result.content);
			return {
				stdout: result.content, // Fallback to raw content as stdout
				stderr: '',
				error: 'AI returned non-JSON output, but provided simulation text.'
			};
		}
	}
};
