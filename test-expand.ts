import { supabase } from './src/lib/services/supabase';

const q = supabase.from('snippets').insert({
	workspace_id: '123',
	author_id: '123',
	title: 'hello',
	code: 'console.log()',
	language: 'javascript'
});
// Using any so we don't have to fix the Record vs Json issue for api_tests right now, this is just to verify the table resolution
const q2 = supabase.from('api_tests').insert({
	workspace_id: '123',
	author_id: 'test',
	name: 'test',
	method: 'GET',
	url: 'test'
} as any);
