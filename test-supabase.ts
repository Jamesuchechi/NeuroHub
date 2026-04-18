import { supabase } from './src/lib/services/supabase';

const q = supabase.from('snippets').select('*');
