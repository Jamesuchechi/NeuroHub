import { supabase } from '$lib/services/supabase';
import { authStore } from '$lib/stores/authStore';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Initialize session and listener on the client
supabase.auth.getSession().then(({ data: { session } }) => {
	authStore.setSession(session as Session | null);
});

supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
	authStore.setSession(session);
});
