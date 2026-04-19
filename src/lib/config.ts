import { z } from 'zod';
import { building } from '$app/environment';
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

export const config = envSchema.parse({
	public: {
		supabaseUrl: PUBLIC_SUPABASE_URL || (building ? 'https://build-dummy.supabase.co' : ''),
		supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY || (building ? 'build-dummy-key' : ''),
		cloudinaryCloudName: PUBLIC_CLOUDINARY_CLOUD_NAME || (building ? 'build-dummy' : ''),
		siteUrl: PUBLIC_SITE_URL || (building ? 'https://build-dummy.dev' : '')
	}
});

/**
 * Type-safe configuration helper.
 */
export type Config = typeof config;
