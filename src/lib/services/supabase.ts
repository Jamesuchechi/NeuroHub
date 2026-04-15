import { createClient } from '@supabase/supabase-js';
import { config } from '$lib/config';

export const supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey);
