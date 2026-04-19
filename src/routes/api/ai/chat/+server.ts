import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENROUTER_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY } from '$env/static/private';

// Safe fetch with timeout
const customFetch = async (url: string | Request | URL, options?: RequestInit) => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

	try {
		return await fetch(url, {
			...options,
			signal: controller.signal
		});
	} finally {
		clearTimeout(timeout);
	}
};

// Initialize providers
const openrouter = createOpenRouter({
	apiKey: OPENROUTER_API_KEY,
	fetch: customFetch
});

const groq = createGroq({
	apiKey: GROQ_API_KEY,
	fetch: customFetch
});

const mistral = createMistral({
	apiKey: MISTRAL_API_KEY,
	fetch: customFetch
});

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 1. Rate Limit Check
	const { data: allowed, error: limitError } = await supabase.rpc('check_ai_rate_limit', {
		p_user_id: session.user.id
	});

	if (limitError || !allowed) {
		return json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
	}

	const {
		prompt,
		profile = 'fast',
		system_prompt,
		workspace_id,
		context_string
	} = await request.json();

	// Build a rich system prompt — inject workspace RAG context when available
	const baseSystem = system_prompt || 'You are NeuroAI, a high-performance developer assistant.';
	const fullSystem = context_string
		? `${baseSystem}\n\n## Workspace Context\n${context_string}`
		: baseSystem;

	// 2. Select Provider stack (Primary + Fallbacks)
	const modelStack = [];
	switch (profile) {
		case 'intelligent':
			modelStack.push(openrouter.chat('meta-llama/llama-3.3-70b-instruct:free'));
			modelStack.push(mistral('mistral-large-latest'));
			modelStack.push(groq('llama-3.3-70b-versatile'));
			break;
		case 'stable':
			modelStack.push(mistral('mistral-small-latest'));
			modelStack.push(groq('llama-3.3-70b-versatile'));
			break;
		case 'fast':
		default:
			modelStack.push(groq('llama-3.3-70b-versatile'));
			modelStack.push(mistral('mistral-small-latest'));
			break;
	}

	// 3. Robust Streaming with Fallback Loop
	let lastError: unknown;
	for (const model of modelStack) {
		console.log(`[AI Attempt] Trying model: ${model.modelId}...`);
		try {
			const result = await streamText({
				model,
				maxRetries: 0, // Fail fast to our own fallback loop
				system: fullSystem,
				messages: [{ role: 'user', content: prompt }],
				onFinish: async (event) => {
					try {
						await supabase.from('ai_requests').insert({
							user_id: session.user.id,
							workspace_id: workspace_id || null,
							model: event.response.modelId,
							prompt_tokens: event.usage.inputTokens,
							completion_tokens: event.usage.outputTokens,
							total_tokens: event.usage.totalTokens,
							feature: 'chat'
						});
					} catch (logErr) {
						console.error('[AI Usage Log] Failed:', logErr);
					}
				}
			});

			// CRITICAL: Await the response headers to ensure connectivity.
			// This will throw if the provider (e.g. OpenRouter) times out,
			// allowing our 'catch' block to move to the next model.
			await result.response;

			return result.toTextStreamResponse();
		} catch (err) {
			const statusMsg = err instanceof Error ? err.message : String(err);
			console.warn(`[AI Fallback] ${model.modelId} failed. Trying next...`, statusMsg);
			lastError = err;
			continue; // Attempt next model in stack
		}
	}

	// If we get here, all models failed
	console.error('[AI Chat] All providers failed:', lastError);
	const errorMessage =
		lastError instanceof Error
			? lastError.message
			: 'All AI intelligence services are currently unavailable.';
	return json({ error: errorMessage }, { status: 500 });
};
