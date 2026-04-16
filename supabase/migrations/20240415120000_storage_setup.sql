-- Storage Setup for NeuroHub
-- Create 'images' bucket for logos and avatars

INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- 1. Public Read Access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');

-- 2. Authenticated Upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- 3. Owner Update/Delete
CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND (auth.uid())::text = (storage.foldername(name))[1]);
