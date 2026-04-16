-- Migration: Fix Profile RLS Policy
-- Description: Strengthens the profile update policy to prevent "zero rows matched" errors.

-- 1. Drop existing permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create more explicit policy with both USING and WITH CHECK
-- 'USING' determines which rows can be updated (input)
-- 'WITH CHECK' ensures the user still owns the row after the update (output)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Ensure SELECT is also available (required for .select() after update)
-- This shouldn't change anything as everyone can already select, 
-- but it's good to be explicit for the 'authenticated' role.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
