import { z } from 'zod';
import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_CLOUDINARY_CLOUD_NAME,
	PUBLIC_SITE_URL
} from '$env/static/public';

/**
 * Environment configuration schema (Public only).
 * Validates that required public environment variables are present.
 */
const envSchema = z.object({
	public: z.object({
		supabaseUrl: z.string().url(),
		supabaseAnonKey: z.string().min(1),
		cloudinaryCloudName: z.string().min(1),
		siteUrl: z.string().url()
	})
});

/**
 * Parsed and validated application configuration.
 * Safe to import in both client and server code.
 */
export const config = envSchema.parse({
	public: {
		supabaseUrl: PUBLIC_SUPABASE_URL,
		supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY,
		cloudinaryCloudName: PUBLIC_CLOUDINARY_CLOUD_NAME,
		siteUrl: PUBLIC_SITE_URL
	}
});

/**
 * Type-safe configuration helper.
 */
export type Config = typeof config;
