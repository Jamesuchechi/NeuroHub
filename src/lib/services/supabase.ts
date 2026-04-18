import { createBrowserClient } from '@supabase/ssr';
import { config } from '../config';
import type { Database } from '../types/db';

export const supabase = createBrowserClient<Database>(
	config.public.supabaseUrl,
	config.public.supabaseAnonKey
);
