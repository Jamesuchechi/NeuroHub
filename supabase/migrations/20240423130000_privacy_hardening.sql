-- Phase 12: Privacy Hardening - Private Channels

-- 1. Tighten channel_members policy
-- Only members of a channel should be able to see who else is in it.
-- This prevents enumeration of private channels via the membership table.
DROP POLICY IF EXISTS "Members can view channel_members" ON channel_members;
CREATE POLICY "Members can view channel_members"
    ON channel_members FOR SELECT
    USING (
        check_channel_membership(channel_id)
    );

-- 2. Restrict channel member addition
-- Only existing members or the channel creator should be able to add others.
DROP POLICY IF EXISTS "Users can add members to channels" ON channel_members;
CREATE POLICY "Members can add others to channels"
    ON channel_members FOR INSERT
    WITH CHECK (
        check_channel_membership(channel_id) OR
        EXISTS (
            SELECT 1 FROM channels
            WHERE id = channel_id AND created_by = auth.uid()
        )
    );

-- 3. Audit 'channels' update policy
-- Only creators should be able to update channel metadata.
DROP POLICY IF EXISTS "Creators can update their channels" ON channels;
CREATE POLICY "Creators can update their channels"
    ON channels FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- 4. Audit 'channels' delete policy
-- Only creators can delete channels.
DROP POLICY IF EXISTS "Creators can delete their channels" ON channels;
CREATE POLICY "Creators can delete their channels"
    ON channels FOR DELETE
    USING (auth.uid() = created_by);
