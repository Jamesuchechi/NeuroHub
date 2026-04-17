-- Add parent_id for threading support
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES activities(id) ON DELETE CASCADE;

-- Create Polls Table
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    votes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- RLS for Polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls are viewable by everyone" ON polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for Poll Options
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Options are viewable by everyone" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Users can create options" ON poll_options FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for Poll Votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are viewable by everyone" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can cast votes" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle vote increments (Atomic)
CREATE OR REPLACE FUNCTION increment_poll_vote()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE poll_options 
    SET votes_count = votes_count + 1 
    WHERE id = NEW.option_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_poll_vote_cast
    AFTER INSERT ON poll_votes
    FOR EACH ROW EXECUTE FUNCTION increment_poll_vote();
