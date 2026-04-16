-- Migration: Fix Authorize Fallback
-- Description: Adds a database-level fallback to the authorize function to handle stale JWTs.
-- This ensures members have access even if their session token doesn't have the workspace_roles claim yet.

CREATE OR REPLACE FUNCTION public.authorize(permission TEXT, workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role_str TEXT;
BEGIN
    -- 1. Try to get role from JWT claims (Fastest)
    user_role_str := auth.jwt()->'workspace_roles'->>workspace_id::TEXT;

    -- 2. Fallback: Check the database directly if JWT is stale or missing the claim
    IF user_role_str IS NULL THEN
        SELECT role::TEXT INTO user_role_str
        FROM public.workspace_members
        WHERE public.workspace_members.workspace_id = authorize.workspace_id
        AND public.workspace_members.user_id = auth.uid();
    END IF;

    -- 3. If still no role, access denied
    IF user_role_str IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 4. Permission mapping
    RETURN CASE
        WHEN permission = 'workspace.delete' THEN user_role_str = 'owner'
        WHEN permission = 'workspace.update' THEN user_role_str = 'owner'
        WHEN permission = 'members.manage' THEN user_role_str = 'owner'
        WHEN permission = 'workspace.read' THEN TRUE
        WHEN permission = 'workspace.write' THEN user_role_str IN ('owner', 'member')
        ELSE FALSE
    END;
END;
$$;
