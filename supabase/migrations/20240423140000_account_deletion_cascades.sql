-- Phase 12: Account Deletion - Cascade Fixes

-- 1. Fix 'notes' table
ALTER TABLE public.notes 
DROP CONSTRAINT IF EXISTS notes_author_id_fkey,
ADD CONSTRAINT notes_author_id_fkey 
    FOREIGN KEY (author_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2. Fix 'note_versions' table
ALTER TABLE public.note_versions 
DROP CONSTRAINT IF EXISTS note_versions_author_id_fkey,
ADD CONSTRAINT note_versions_author_id_fkey 
    FOREIGN KEY (author_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 3. Fix 'snippets' table
ALTER TABLE public.snippets 
DROP CONSTRAINT IF EXISTS snippets_author_id_fkey,
ADD CONSTRAINT snippets_author_id_fkey 
    FOREIGN KEY (author_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 4. Fix 'stories' table
ALTER TABLE public.stories 
DROP CONSTRAINT IF EXISTS stories_user_id_fkey,
ADD CONSTRAINT stories_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 5. Fix 'api_tests' table
ALTER TABLE public.api_tests 
DROP CONSTRAINT IF EXISTS api_tests_author_id_fkey,
ADD CONSTRAINT api_tests_author_id_fkey 
    FOREIGN KEY (author_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
