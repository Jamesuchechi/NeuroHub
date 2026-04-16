-- Migration: Activity Triggers
-- Description: Automatically logs user actions into the activities table.

-- 1. Trigger Function: Log Workspace Creation
CREATE OR REPLACE FUNCTION public.log_workspace_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activities (user_id, workspace_id, type, payload)
    VALUES (
        NEW.owner_id,
        NEW.id,
        'workspace_create',
        jsonb_build_object(
            'workspace_name', NEW.name,
            'workspace_slug', NEW.slug
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.log_workspace_activity();

-- 2. Trigger Function: Log Member Joining
CREATE OR REPLACE FUNCTION public.log_member_joined_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log this as a workspace activity
    INSERT INTO public.activities (user_id, workspace_id, type, payload)
    VALUES (
        NEW.user_id,
        NEW.workspace_id,
        'workspace_join',
        jsonb_build_object(
            'role', NEW.role
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_joined
    AFTER INSERT ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.log_member_joined_activity();

-- 3. Trigger Function: Log Story Creation
CREATE OR REPLACE FUNCTION public.log_story_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activities (user_id, workspace_id, type, payload)
    VALUES (
        NEW.user_id,
        NEW.workspace_id,
        'story_create',
        jsonb_build_object(
            'story_id', NEW.id,
            'has_media', NEW.media_url IS NOT NULL
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_story_created
    AFTER INSERT ON public.stories
    FOR EACH ROW EXECUTE FUNCTION public.log_story_activity();
