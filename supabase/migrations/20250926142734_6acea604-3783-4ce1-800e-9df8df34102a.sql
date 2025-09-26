-- Create storage policy to allow public uploads to gym-logos bucket
-- This will allow unauthenticated users to upload logos
CREATE POLICY "Allow public uploads to gym-logos"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gym-logos');

-- Update existing authenticated upload policy to be more permissive
DROP POLICY IF EXISTS "Authenticated users can upload gym logos" ON storage.objects;

CREATE POLICY "Allow all users to upload gym logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gym-logos');