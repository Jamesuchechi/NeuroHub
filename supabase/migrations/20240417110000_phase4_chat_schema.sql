-- Realtime Chat Schema
-- Phase 4

-- 1. Channels
CREATE TYPE channel_type AS ENUM ('text', 'announcement', 'private');

CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type channel_type DEFAULT 'text',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    parent_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For threading
    metadata JSONB DEFAULT '{}'::jsonb,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

-- 4. Message Reads (Read Receipts)
CREATE TABLE IF NOT EXISTS message_reads (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- 5. Typing Indicators (Transient table - normally handled via Presence, but we'll include it for state)
CREATE TABLE IF NOT EXISTS typing_indicators (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- 1. Channels Policies
CREATE POLICY "Workspace members can view channels"
    ON channels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and members can create channels"
    ON channels FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = auth.uid()
        )
    );

-- 2. Messages Policies
CREATE POLICY "Channel members can view messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = messages.channel_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Channel members can insert messages"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = messages.channel_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3. Reactions Policies
CREATE POLICY "Channel members can view reactions"
    ON message_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channels c ON m.channel_id = c.id
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE m.id = message_reactions.message_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Channel members can toggle reactions"
    ON message_reactions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN channels c ON m.channel_id = c.id
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE m.id = message_reactions.message_id
            AND wm.user_id = auth.uid()
        )
    );

-- 4. Read Receipts Policies
CREATE POLICY "Users can manage their own read receipts"
    ON message_reads FOR ALL
    USING (user_id = auth.uid());

-- 5. Typing Indicators Policies
CREATE POLICY "Channel members can see typing status"
    ON typing_indicators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = typing_indicators.channel_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own typing status"
    ON typing_indicators FOR ALL
    USING (user_id = auth.uid());

-- Triggers for last_read_message_id update is not needed (handled by app)
-- But we should add a trigger for message_reads.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_reads_timestamp
    BEFORE UPDATE ON message_reads
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add real-time replication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
