import { z } from 'zod';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Environment configuration schema.
 * Validates that all required environment variables are present.
 */
const envSchema = z.object({
	public: z.object({
		supabaseUrl: z.string().url(),
		supabaseAnonKey: z.string().min(1)
	})
	// Add private env variables here if needed (e.g., OPENAI_API_KEY)
});

/**
 * Parsed and validated application configuration.
 */
export const config = envSchema.parse({
	public: {
		supabaseUrl: PUBLIC_SUPABASE_URL,
		supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY
	}
});

/**
 * Type-safe configuration helper.
 */
export type Config = typeof config;
