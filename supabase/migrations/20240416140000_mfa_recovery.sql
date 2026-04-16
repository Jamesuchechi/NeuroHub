-- Migration: Add MFA Recovery Codes to Profiles
-- Description: Adds a column to store recovery codes for users who enable MFA.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_recovery_codes TEXT[] DEFAULT '{}';

-- Update RLS (already enabled on profiles)
-- Users should be able to read and update their own recovery codes.
-- Since the existing "Users can update own profile" policy covers public.profiles, 
-- and it doesn't restrict columns, it will automatically cover this new column.

COMMENT ON COLUMN public.profiles.mfa_recovery_codes IS 'Backup codes for MFA account recovery.';
