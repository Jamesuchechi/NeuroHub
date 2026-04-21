-- Phase 10: Advanced Communication - Group DMs

-- 1. Add 'group_dm' to channel_type enum
-- Since PostgreSQL doesn't allow adding values to enums within a transaction easily in some versions,
-- we check if it exists or use a robust way.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'channel_type' AND e.enumlabel = 'group_dm') THEN
        ALTER TYPE channel_type ADD VALUE 'group_dm';
    END IF;
END $$;

-- 2. Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

-- 3. Add custom_name and icon_url to channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS custom_name TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 4. Enable RLS on channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to break recursion
-- SECURITY DEFINER allows this function to bypass RLS and check membership safely.
CREATE OR REPLACE FUNCTION check_channel_membership(chan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = chan_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Policies for channel_members
DROP POLICY IF EXISTS "Members can view their own channel memberships" ON channel_members;
DROP POLICY IF EXISTS "Channel members can view other members in same channel" ON channel_members;

CREATE POLICY "Members can view channel_members"
    ON channel_members FOR SELECT
    USING (true);

CREATE POLICY "Users can add members to channels"
    ON channel_members FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Workspace members can view public channels" ON channels;

CREATE POLICY "Workspace members can view public channels"
    ON channels FOR SELECT
    USING (
        (type::text = 'text' OR type::text = 'announcement')
        AND EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can view their private/group_dm channels" ON channels;
CREATE POLICY "Members can view their private/group_dm channels"
    ON channels FOR SELECT
    USING (
        (type::text = 'private' OR type::text = 'group_dm')
        AND (
          created_by = auth.uid() OR 
          check_channel_membership(id)
        )
    );

CREATE POLICY "Users can create channels"
    ON channels FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their channels"
    ON channels FOR UPDATE
    USING (auth.uid() = created_by);

-- 8. Update Messages RLS
DROP POLICY IF EXISTS "Channel members can view messages" ON messages;
CREATE POLICY "Channel members can view messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                (c.type::text IN ('text', 'announcement') AND EXISTS (
                    SELECT 1 FROM workspace_members wm 
                    WHERE wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid()
                ))
                OR
                (c.type::text IN ('private', 'group_dm') AND (
                    c.created_by = auth.uid() OR 
                    check_channel_membership(c.id)
                ))
            )
        )
    );

-- 9. Data Migration: Populate channel_members for existing DMs
DO $$
DECLARE
    chan_rec RECORD;
    uid1 UUID;
    uid2 UUID;
    parts TEXT[];
BEGIN
    FOR chan_rec IN SELECT id, name FROM channels WHERE type = 'private' AND name LIKE 'dm-%' LOOP
        parts := string_to_array(substring(chan_rec.name from 4), '-');
        IF array_length(parts, 1) >= 2 THEN
            BEGIN
                uid1 := parts[1]::UUID;
                uid2 := parts[2]::UUID;
                INSERT INTO channel_members (channel_id, user_id)
                VALUES (chan_rec.id, uid1), (chan_rec.id, uid2)
                ON CONFLICT DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                NULL; -- Skip malformed names
            END;
        END IF;
    END LOOP;
END $$;

-- 9. Add realtime replication for channel_members
-- Check if table is already in publication to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'channel_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
    END IF;
END $$;
