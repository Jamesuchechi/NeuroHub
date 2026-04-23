-- Migration: Phase 14 Social Intelligence - Recommended Developers
-- Description: Adds RPC function to find developers with overlapping skills.

CREATE OR REPLACE FUNCTION get_recommended_developers(p_user_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
    id UUID,
    username TEXT,
    avatar_url TEXT,
    title TEXT,
    skills TEXT[],
    influence_score INT,
    overlap_count INT
) AS $$
DECLARE
    v_user_skills TEXT[];
BEGIN
    -- Get current user's skills
    SELECT skills INTO v_user_skills FROM profiles WHERE id = p_user_id;

    -- If user has no skills, return empty table
    IF v_user_skills IS NULL OR CARDINALITY(v_user_skills) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.avatar_url,
        p.title,
        p.skills,
        p.influence_score,
        CARDINALITY(ARRAY(SELECT unnest(p.skills) INTERSECT SELECT unnest(v_user_skills)))::INT as overlap_count
    FROM profiles p
    WHERE p.id != p_user_id
      AND p.skills && v_user_skills -- Overlap check (at least one skill in common)
    ORDER BY overlap_count DESC, p.username ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trending Snippets Function
CREATE OR REPLACE FUNCTION get_trending_snippets(p_workspace_id UUID DEFAULT NULL, p_limit INT DEFAULT 5)
RETURNS TABLE (
    id UUID,
    title TEXT,
    language TEXT,
    star_count INT,
    fork_count INT,
    author_username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.language,
        s.star_count,
        s.fork_count,
        p.username as author_username
    FROM snippets s
    JOIN profiles p ON s.author_id = p.id
    WHERE 
        (p_workspace_id IS NULL AND s.visibility = 'public') -- Global
        OR 
        (p_workspace_id IS NOT NULL AND s.workspace_id = p_workspace_id) -- Regional/Workspace
    ORDER BY (s.star_count * 2 + s.fork_count) DESC, s.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_recommended_developers(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_snippets(UUID, INT) TO authenticated;

-- Influence Score
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influence_score INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_user_influence_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET influence_score = (
        SELECT COALESCE(SUM(star_count), 0) * 10 + COALESCE(SUM(fork_count), 0) * 5
        FROM snippets
        WHERE author_id = NEW.author_id
    )
    WHERE id = NEW.author_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on snippets (since fork_count and star_count are on snippets)
-- However, star_count and fork_count are updated via triggers themselves.
-- To ensure we catch those changes, we can use an AFTER UPDATE trigger on snippets.
DROP TRIGGER IF EXISTS trigger_update_influence_score ON snippets;
CREATE TRIGGER trigger_update_influence_score
AFTER UPDATE OF star_count, fork_count ON snippets
FOR EACH ROW EXECUTE FUNCTION update_user_influence_score();

-- AI Media Analysis
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS captions JSONB DEFAULT NULL;
