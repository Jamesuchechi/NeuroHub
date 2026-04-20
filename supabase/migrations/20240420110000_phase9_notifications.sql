-- Phase 9: Notifications & Activity Schema

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mention', 'reply', 'invite_accepted', 'share', 'ai_complete'
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::JSONB NOT NULL, -- { message_id, channel_id, note_id, preview_text, etc }
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    mentions_enabled BOOLEAN DEFAULT TRUE,
    replies_enabled BOOLEAN DEFAULT TRUE,
    invites_enabled BOOLEAN DEFAULT TRUE,
    ai_completions_enabled BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, workspace_id)
);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- 5. Helper Function: Create Notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_workspace_id UUID,
    p_type TEXT,
    p_actor_id UUID,
    p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- Check preferences
    SELECT 
        CASE 
            WHEN p_type = 'mention' THEN mentions_enabled
            WHEN p_type = 'reply' THEN replies_enabled
            WHEN p_type = 'invite_accepted' THEN invites_enabled
            WHEN p_type = 'ai_complete' THEN ai_completions_enabled
            ELSE TRUE
        END
    INTO v_enabled
    FROM public.notification_preferences
    WHERE user_id = p_user_id AND workspace_id = p_workspace_id;

    -- If no preference record exists, default to TRUE
    IF v_enabled IS NULL OR v_enabled THEN
        INSERT INTO public.notifications (user_id, workspace_id, type, actor_id, payload)
        VALUES (p_user_id, p_workspace_id, p_type, p_actor_id, p_payload)
        RETURNING id INTO v_notification_id;
    END IF;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger Function: Handle New Message (Mentions & Replies)
CREATE OR REPLACE FUNCTION public.handle_new_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
    v_mentioned_username TEXT;
    v_mentioned_user_id UUID;
    v_parent_author_id UUID;
    v_preview_text TEXT;
BEGIN
    -- Get workspace_id from channel
    SELECT workspace_id INTO v_workspace_id FROM public.channels WHERE id = NEW.channel_id;
    
    v_preview_text := LEFT(NEW.content, 100);

    -- A. Handle Mentions
    -- Simple regex to find @username
    FOR v_mentioned_username IN 
        SELECT (regexp_matches(NEW.content, '@([a-zA-Z0-9._-]+)', 'g'))[1]
    LOOP
        SELECT id INTO v_mentioned_user_id FROM public.profiles WHERE username = v_mentioned_username;
        
        -- Don't notify self
        IF v_mentioned_user_id IS NOT NULL AND v_mentioned_user_id != NEW.user_id THEN
            PERFORM public.create_notification(
                v_mentioned_user_id,
                v_workspace_id,
                'mention',
                NEW.user_id,
                jsonb_build_object(
                    'message_id', NEW.id,
                    'channel_id', NEW.channel_id,
                    'preview', v_preview_text
                )
            );
        END IF;
    END LOOP;

    -- B. Handle Replies
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_author_id FROM public.messages WHERE id = NEW.parent_id;
        
        -- Don't notify self, and don't notify if already mentioned (to avoid duplicates)
        -- Note: We could check if v_mentioned_user_id matches v_parent_author_id in the loop above, 
        -- but for simplicity we'll just check if they are the same in the notification logic if needed.
        -- Here we just ensure we don't notify the sender.
        IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.user_id THEN
             PERFORM public.create_notification(
                v_parent_author_id,
                v_workspace_id,
                'reply',
                NEW.user_id,
                jsonb_build_object(
                    'message_id', NEW.id,
                    'parent_id', NEW.parent_id,
                    'channel_id', NEW.channel_id,
                    'preview', v_preview_text
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on reapplying
DROP TRIGGER IF EXISTS on_message_created_notify ON public.messages;

CREATE TRIGGER on_message_created_notify
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message_notifications();

-- 7. Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
