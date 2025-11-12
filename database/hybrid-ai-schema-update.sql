-- Hybrid AI Engine Schema Updates
-- Add this to your Supabase database via SQL Editor

-- Create enum type for data source classification
DO $$ BEGIN
    CREATE TYPE data_source_type AS ENUM ('NEWS', 'HISTORICAL', 'ACADEMIC', 'GENERAL_KNOWLEDGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add hybrid AI fields to approved_markets table
ALTER TABLE approved_markets ADD COLUMN IF NOT EXISTS data_source_type data_source_type DEFAULT 'NEWS';
ALTER TABLE approved_markets ADD COLUMN IF NOT EXISTS admin_override_classification BOOLEAN DEFAULT FALSE;
ALTER TABLE approved_markets ADD COLUMN IF NOT EXISTS auto_detected_type data_source_type;
ALTER TABLE approved_markets ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC DEFAULT 0.5;
ALTER TABLE approved_markets ADD COLUMN IF NOT EXISTS keywords_detected JSONB;

-- Add index for efficient filtering by data source type
CREATE INDEX IF NOT EXISTS idx_approved_markets_data_source_type ON approved_markets(data_source_type);

-- Add comments for documentation
COMMENT ON COLUMN approved_markets.data_source_type IS 'Manual or final classification of data source type for AI analysis';
COMMENT ON COLUMN approved_markets.admin_override_classification IS 'Whether admin manually overrode the auto-detected classification';
COMMENT ON COLUMN approved_markets.auto_detected_type IS 'Automatically detected classification before admin review';
COMMENT ON COLUMN approved_markets.classification_confidence IS 'Confidence score of auto-classification (0-1)';
COMMENT ON COLUMN approved_markets.keywords_detected IS 'Keywords that influenced auto-classification';

-- Update existing markets with default values
UPDATE approved_markets
SET data_source_type = 'NEWS',
    admin_override_classification = FALSE
WHERE data_source_type IS NULL;

-- Sample classification examples for testing
UPDATE approved_markets SET data_source_type = 'HISTORICAL' WHERE claim ILIKE '%jesus%' OR claim ILIKE '%historically%';
UPDATE approved_markets SET data_source_type = 'NEWS' WHERE claim ILIKE '%trump%' OR claim ILIKE '%recent%' OR claim ILIKE '%will%';
UPDATE approved_markets SET data_source_type = 'ACADEMIC' WHERE claim ILIKE '%proven%' OR claim ILIKE '%research%' OR claim ILIKE '%study%';

-- Create a view for admin dashboard with classification info
CREATE OR REPLACE VIEW admin_market_classification_view AS
SELECT
    id,
    claim,
    status,
    data_source_type,
    auto_detected_type,
    admin_override_classification,
    classification_confidence,
    keywords_detected,
    created_at,
    CASE
        WHEN admin_override_classification = TRUE THEN 'Manual Override'
        WHEN auto_detected_type IS NOT NULL THEN 'Auto-Detected'
        ELSE 'Unclassified'
    END as classification_method
FROM approved_markets;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON approved_markets TO authenticated;
GRANT SELECT ON admin_market_classification_view TO authenticated;