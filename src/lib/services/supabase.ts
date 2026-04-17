import { createBrowserClient } from '@supabase/ssr';
import { config } from '../config';
import type { Database } from '../types/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export const supabase = createBrowserClient<Database>(
	config.public.supabaseUrl,
	config.public.supabaseAnonKey
) as unknown as SupabaseClient<Database>;
