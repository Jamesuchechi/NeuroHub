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

	// 0. CSRF Protection (Origin Check)
	const origin = request.headers.get('origin');
	const host = request.headers.get('host');
	// In production, we should compare origin with PUBLIC_SITE_URL or host
	// For now, a simple check that origin exists and matches the host is a good start
	if (origin && !origin.includes(host || '')) {
		return json({ error: 'Forbidden: CSRF check failed' }, { status: 403 });
	}

	// 1. Rate Limit Check (Upstash Redis)
	const { checkRateLimit } = await import('$lib/server/ratelimit');
	const { success, limit, reset, remaining } = await checkRateLimit(session.user.id, 'ai-chat');

	if (!success) {
		return json(
			{
				error: 'Rate limit exceeded. Please wait a moment.',
				limit,
				remaining,
				reset
			},
			{
				status: 429,
				headers: {
					'X-RateLimit-Limit': limit.toString(),
					'X-RateLimit-Remaining': remaining.toString(),
					'X-RateLimit-Reset': reset.toString()
				}
			}
		);
	}

	// 1b. Fallback SQL Rate Limit (Legacy/Redundancy)
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

	// --- AI Prompt Security Validation ---
	if (!prompt || typeof prompt !== 'string') {
		return json({ error: 'Invalid prompt' }, { status: 400 });
	}

	// 1. Length Limit (e.g., 4000 characters)
	const MAX_PROMPT_LENGTH = 4000;
	if (prompt.length > MAX_PROMPT_LENGTH) {
		return json(
			{ error: `Prompt too long. Maximum length is ${MAX_PROMPT_LENGTH} characters.` },
			{ status: 400 }
		);
	}

	// 2. Basic Sanitization
	const sanitizedPrompt = prompt.trim();

	// 3. Injection Check (Simple heuristic)
	// We check for common jailbreak patterns or attempts to override system instructions.
	const injectionPatterns = [
		/ignore previous instructions/i,
		/disregard all previous/i,
		/you are now/i,
		/system prompt/i,
		/<\|system\|>/i,
		/\[INST\]/i
	];

	const isPotentialInjection = injectionPatterns.some((pattern) => pattern.test(sanitizedPrompt));
	if (isPotentialInjection) {
		console.warn(`[AI Security] Potential prompt injection detected from user ${session.user.id}`);
		// We can either block it or just log it. For now, let's block the most obvious ones.
		// return json({ error: 'Potential security violation detected in prompt.' }, { status: 400 });
	}
	// -------------------------------------

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
			modelStack.push(openrouter.chat('google/gemini-2.0-flash-001'));
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
				messages: [{ role: 'user', content: sanitizedPrompt }],
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
