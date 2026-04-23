-- Fix foreign key relationships for api_tests and api_environments
-- These were previously referencing auth.users directly, which prevents clean joins to public.profiles

-- 1. Fix api_tests
ALTER TABLE public.api_tests 
DROP CONSTRAINT IF EXISTS api_tests_author_id_fkey;

ALTER TABLE public.api_tests
ADD CONSTRAINT api_tests_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix api_environments
ALTER TABLE public.api_environments
DROP CONSTRAINT IF EXISTS api_environments_author_id_fkey; -- Might not exist if it was never named

-- Ensure author_id column exists (just in case)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_environments' AND column_name = 'author_id') THEN
        ALTER TABLE public.api_environments ADD COLUMN author_id UUID;
    END IF;
END $$;

-- Update author_id if it's null (best effort)
UPDATE public.api_environments 
SET author_id = (SELECT id FROM public.profiles LIMIT 1)
WHERE author_id IS NULL;

ALTER TABLE public.api_environments
ADD CONSTRAINT api_environments_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
