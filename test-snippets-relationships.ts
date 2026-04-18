import { supabase } from './src/lib/services/supabase';

// If snippets works, we won't get a TS error for this specifically:
const q = supabase.from('snippets').insert({
	workspace_id: '123',
	author_id: '123',
	title: 'hello',
	code: 'console.log()',
	language: 'javascript'
});
