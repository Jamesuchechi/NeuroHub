import { supabase } from './src/lib/services/supabase';

const q2 = supabase.from('messages').insert({
	channel_id: '123',
	user_id: '123',
	content: 'hello'
});
