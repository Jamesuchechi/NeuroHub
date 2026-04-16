-- Migration: Fix RLS Recursion and Authorization
-- Description: Eliminates circular dependencies in RLS policies by flattening authorization checks.

-- 1. Redefine get_workspace_role to be extremely safe and non-recursive
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to prevent recursion
SET search_path = public
STABLE
AS $$
DECLARE
    u_role public.user_role;
BEGIN
    -- This direct query is safe because SECURITY DEFINER bypasses RLS on workspace_members
    SELECT role INTO u_role
    FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id;
    
    RETURN u_role;
END;
$$;

-- 2. Redefine authorize to avoid any queries to the 'workspaces' table
-- This prevents the "Policy -> Authorize -> Policy" loop
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
    -- 1. Try to get role from JWT claims (Fastest path)
    -- This covers already-established sessions
    user_role_str := auth.jwt()->'workspace_roles'->>workspace_id::TEXT;

    -- 2. Fallback: Direct DB lookup using the non-recursive helper
    -- This covers the crucial "just created" or "just joined" edge case
    IF user_role_str IS NULL THEN
        user_role_str := public.get_workspace_role(workspace_id)::TEXT;
    END IF;

    -- 3. If still no role, access strictly denied
    IF user_role_str IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 4. Permission mapping
    RETURN CASE
        WHEN permission = 'workspace.delete' THEN user_role_str = 'owner'
        WHEN permission = 'workspace.update' THEN user_role_str = 'owner'
        WHEN permission = 'members.manage' THEN user_role_str = 'owner'
        WHEN permission = 'workspace.read' THEN TRUE -- All roles can read
        WHEN permission = 'workspace.write' THEN user_role_str IN ('owner', 'member')
        ELSE FALSE
    END;
END;
$$;

-- 3. Update RLS policies to use direct ID checks where possible
-- The 'owner_id = auth.uid()' check is a fast pre-filter that skips authorize() for owners.
DROP POLICY IF EXISTS "Workspaces are viewable by members" ON public.workspaces;
CREATE POLICY "Workspaces are viewable by members" 
ON public.workspaces FOR SELECT USING (
    owner_id = auth.uid() OR public.authorize('workspace.read', id)
);

-- 4. Update workspace_members policies to be non-recursive
-- Instead of calling authorize(), we use the helper functions directly.
DROP POLICY IF EXISTS "Members are viewable by workspace members" ON public.workspace_members;
CREATE POLICY "Members are viewable by workspace members" 
ON public.workspace_members FOR SELECT USING (
    user_id = auth.uid() OR -- Always visible to self
    public.get_workspace_role(workspace_id) IS NOT NULL -- Visible to other members
);

DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;
CREATE POLICY "Owners can manage members" 
ON public.workspace_members FOR ALL USING (
    public.get_workspace_role(workspace_id) = 'owner'
);
