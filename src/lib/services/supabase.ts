import { createBrowserClient } from '@supabase/ssr';
import { config } from '$lib/config';
import type { AppDatabase } from '$lib/types/db';

export const supabase = createBrowserClient<AppDatabase>(
	config.public.supabaseUrl,
	config.public.supabaseAnonKey
);
