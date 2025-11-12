-- Add image_url column to approved_markets table
-- Run this in your Supabase SQL Editor

-- Check if the column already exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'approved_markets'
AND column_name = 'image_url';

-- Add the image_url column if it doesn't exist
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'approved_markets'
ORDER BY ordinal_position;