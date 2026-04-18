-- Migration: Add Enhanced Developer Profile Fields
-- Description: Adds birthday, skills, and title to profiles and updates the new user trigger.

-- 1. Add new columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Update handle_new_user function to extract new fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, birthday, skills, title)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        (NEW.raw_user_meta_data->>'birthday')::DATE,
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'skills', '[]'::jsonb))),
        NEW.raw_user_meta_data->>'title'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
