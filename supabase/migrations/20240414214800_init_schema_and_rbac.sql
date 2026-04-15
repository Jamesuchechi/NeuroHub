-- NeuroHub Initial Schema & RBAC System
-- Phase 1: Auth, Workspaces & Members

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'member', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- 5. Workspace Invites Table
CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role public.user_role DEFAULT 'member',
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- 7. RBAC Logic: Auth Token Hook
-- This function will be called by Supabase Auth to inject roles into the JWT
CREATE OR REPLACE FUNCTION public.handle_custom_access_token(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    roles_map JSONB;
BEGIN
    -- Build a map of workspace_id -> role
    SELECT json_object_agg(workspace_id::TEXT, role::TEXT)
    INTO roles_map
    FROM public.workspace_members
    WHERE user_id = (event->>'user_id')::UUID;

    -- Inject into claims
    RETURN jsonb_set(
        event,
        '{claims, workspace_roles}',
        COALESCE(roles_map, '{}'::JSONB)
    );
END;
$$;

-- 8. RBAC Logic: Authorize Helper Function
-- permission check mapping
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
    -- Get role for this workspace from JWT claims
    user_role_str := auth.jwt()->'workspace_roles'->>workspace_id::TEXT;

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

-- 9. Profile RLS Policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 10. Workspace RLS Policies
CREATE POLICY "Workspaces are viewable by members" 
ON public.workspaces FOR SELECT USING (
    authorize('workspace.read', id)
);

CREATE POLICY "Owners can update workspaces" 
ON public.workspaces FOR UPDATE USING (
    authorize('workspace.update', id)
);

CREATE POLICY "Owners can delete workspaces" 
ON public.workspaces FOR DELETE USING (
    authorize('workspace.delete', id)
);

-- 11. Workspace Members RLS Policies
CREATE POLICY "Members are viewable by workspace members" 
ON public.workspace_members FOR SELECT USING (
    authorize('workspace.read', workspace_id)
);

CREATE POLICY "Owners can manage members" 
ON public.workspace_members FOR ALL USING (
    authorize('members.manage', workspace_id)
);

-- 12. Workspace Invites RLS Policies
CREATE POLICY "Invites are viewable by workspace owners" 
ON public.workspace_invites FOR SELECT USING (
    authorize('members.manage', workspace_id)
);

CREATE POLICY "Owners can manage invites" 
ON public.workspace_invites FOR ALL USING (
    authorize('members.manage', workspace_id)
);

-- 13. Auto-creation Triggers
-- a. New User -> Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- b. New Profile -> Personal Workspace
CREATE OR REPLACE FUNCTION public.create_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
        'Personal',
        'personal-' || LOWER(REPLACE(COALESCE(NEW.username, NEW.id::TEXT), ' ', '-')) || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8),
        NEW.id
    )
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_personal_workspace();
