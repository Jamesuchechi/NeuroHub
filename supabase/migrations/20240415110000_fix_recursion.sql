-- 1. Create a function to check roles WITHOUT triggering RLS recursion
-- SECURITY DEFINER bypasses RLS on the table it queries
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    u_role public.user_role;
BEGIN
    SELECT role INTO u_role
    FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id;
    
    RETURN u_role;
END;
$$;

-- 2. Create a function to check if the user is the owner_id of a workspace
-- Bypasses RLS to avoid circular dependencies
CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces 
        WHERE id = ws_id AND owner_id = u_id
    );
END;
$$;

-- 3. Update authorize function to be more robust
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
    -- 1. Direct owner check - bypasses recursion
    IF public.is_workspace_owner(workspace_id) THEN
        RETURN TRUE;
    END IF;

    -- 2. Try to get role from JWT claims (Performance optimized)
    user_role_str := auth.jwt()->'workspace_roles'->>workspace_id::TEXT;

    -- 3. Fallback to direct DB check
    IF user_role_str IS NULL THEN
        user_role_str := public.get_workspace_role(workspace_id)::TEXT;
    END IF;

    IF user_role_str IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Permission mapping
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

-- 4. Re-apply policies
DROP POLICY IF EXISTS "Members are viewable by workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspaces are viewable by members" ON public.workspaces;

CREATE POLICY "Workspaces are viewable by members" 
ON public.workspaces FOR SELECT USING (
    owner_id = auth.uid() OR public.authorize('workspace.read', id)
);

CREATE POLICY "Members are viewable by workspace members" 
ON public.workspace_members FOR SELECT USING (
    public.get_workspace_role(workspace_id) IS NOT NULL OR public.is_workspace_owner(workspace_id)
);

CREATE POLICY "Owners can manage members" 
ON public.workspace_members FOR ALL USING (
    public.get_workspace_role(workspace_id) = 'owner' OR public.is_workspace_owner(workspace_id)
);
