import { supabase } from './src/lib/services/supabase';

const q = supabase.from('profiles').insert({
	id: 'test',
	username: 'test',
	full_name: 'test',
	avatar_url: 'test',
	email: 'test'
});
