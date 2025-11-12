-- Supabase Storage Setup for Market Images
-- Run this SQL in your Supabase SQL Editor (supabase.com/dashboard -> SQL Editor)

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('market-assets', 'market-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public uploads to the market-assets bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'market-assets');

-- 3. Allow public reads from the market-assets bucket
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'market-assets');

-- 4. Allow public deletes (optional, for cleanup)
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'market-assets');

-- 5. Allow public updates (optional, for overwriting files)
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'market-assets');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE name = 'market-assets';