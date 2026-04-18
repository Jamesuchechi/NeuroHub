import { supabase } from './src/lib/services/supabase';

const _q = supabase.from('snippets');
const _q2 = supabase.from('stories');

export type A = typeof _q extends never ? 'error' : 'ok';
export type B = typeof _q2 extends never ? 'error' : 'ok';
