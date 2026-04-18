import { supabase } from './src/lib/services/supabase';

const q = supabase.from('snippets');
const q2 = supabase.from('stories');

export type A = typeof q extends never ? 'error' : 'ok';
export type B = typeof q2 extends never ? 'error' : 'ok';
