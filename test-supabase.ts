import { supabase } from './src/lib/services/supabase';

const _q = supabase.from('snippets').select('*');
