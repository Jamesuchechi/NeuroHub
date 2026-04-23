import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Initialize Redis client
const redis =
	env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
		? new Redis({
				url: env.UPSTASH_REDIS_REST_URL,
				token: env.UPSTASH_REDIS_REST_TOKEN
			})
		: null;

/**
 * Rate limiter instance.
 * Allows 10 requests per 1 minute by default.
 */
export const aiRateLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(10, '1 m'),
			analytics: true,
			prefix: 'neurohub:ratelimit:ai'
		})
	: null;

/**
 * Helper to check rate limit for a user.
 * Falls back to 'true' (allowed) if Redis is not configured.
 */
export async function checkRateLimit(userId: string, action = 'chat') {
	if (!aiRateLimit) {
		console.warn('[RateLimit] Upstash Redis not configured. Skipping rate limit check.');
		return { success: true, limit: 0, remaining: 0, reset: 0 };
	}

	const identifier = `${action}:${userId}`;
	return await aiRateLimit.limit(identifier);
}
