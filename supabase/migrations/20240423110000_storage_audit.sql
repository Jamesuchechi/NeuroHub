-- Audit and Hardening of Storage Policies
-- 1. Create a private bucket for sensitive documents/assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'private', 
    'private', 
    false, 
    52428800, -- 50MB
    '{image/*,application/pdf,text/plain}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for 'private' bucket
-- Only the owner of the folder (user_id) can access their files
CREATE POLICY "Users can access their own private files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'private' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'private' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Review 'images' bucket (public but restricted upload)
-- Ensure only authenticated users can upload to their own folder in images
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload to Own Folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'images' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Ensure users can only delete their own images
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
CREATE POLICY "Owner Delete Own Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'images' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);
