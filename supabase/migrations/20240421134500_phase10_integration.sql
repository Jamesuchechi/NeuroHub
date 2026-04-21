-- Phase 10: Ecosystem Integration & Synergy
-- 1. Enum for Resource Types
CREATE TYPE resource_type AS ENUM ('message', 'note', 'snippet', 'api_test');

-- 2. Channel Resource Pins
CREATE TABLE IF NOT EXISTS channel_resource_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    type resource_type NOT NULL,
    resource_id UUID NOT NULL, -- Generic ID, resolved by type
    pinned_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb -- For titles, previews, etc.
);

-- 3. Enable RLS
ALTER TABLE channel_resource_pins ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Channel members can view pins"
    ON channel_resource_pins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = channel_resource_pins.channel_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Channel members can manage pins"
    ON channel_resource_pins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = channel_resource_pins.channel_id
            AND wm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
            WHERE c.id = channel_resource_pins.channel_id
            AND wm.user_id = auth.uid()
        )
    );

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE channel_resource_pins;
