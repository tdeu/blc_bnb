-- Persist Confidence Data Schema Update
-- Run this in Supabase SQL Editor
-- Purpose: Enable persistence of AI analysis and evidence aggregation results

-- ========================================
-- 1. Add aggregation_results column to approved_markets
-- ========================================

-- Add column to store evidence aggregation results
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS aggregation_results JSONB;

-- Add column to track when AI analysis was last run
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS ai_analysis_timestamp TIMESTAMPTZ;

-- Add column to track when evidence aggregation was last run
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS aggregation_timestamp TIMESTAMPTZ;

-- ========================================
-- 2. Create indexes for better performance
-- ========================================

-- Index on ai_analysis_timestamp for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_approved_markets_ai_analysis_timestamp
ON approved_markets(ai_analysis_timestamp DESC);

-- Index on aggregation_timestamp for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_approved_markets_aggregation_timestamp
ON approved_markets(aggregation_timestamp DESC);

-- GIN index on resolution_data for JSONB queries
CREATE INDEX IF NOT EXISTS idx_approved_markets_resolution_data_gin
ON approved_markets USING GIN (resolution_data);

-- GIN index on aggregation_results for JSONB queries
CREATE INDEX IF NOT EXISTS idx_approved_markets_aggregation_results_gin
ON approved_markets USING GIN (aggregation_results);

-- ========================================
-- 3. Add comments for documentation
-- ========================================

COMMENT ON COLUMN approved_markets.resolution_data IS 'Stores AI engine analysis results (recommendation, confidence, reasoning, keyFactors, sourceAnalysis, extractedEntities, searchQueries, etc.)';
COMMENT ON COLUMN approved_markets.aggregation_results IS 'Stores evidence aggregation results (finalConfidence, evidenceSummary, stanceDistribution, warnings, etc.)';
COMMENT ON COLUMN approved_markets.ai_analysis_timestamp IS 'Timestamp when AI analysis was last run';
COMMENT ON COLUMN approved_markets.aggregation_timestamp IS 'Timestamp when evidence aggregation was last calculated';

-- ========================================
-- 4. Sample query examples (for reference)
-- ========================================

/*
-- Get markets with recent AI analysis (last 7 days)
SELECT
  id,
  claim,
  ai_analysis_timestamp,
  resolution_data->>'recommendation' as recommendation,
  (resolution_data->>'confidence')::numeric as confidence
FROM approved_markets
WHERE ai_analysis_timestamp > NOW() - INTERVAL '7 days'
ORDER BY ai_analysis_timestamp DESC;

-- Get markets with aggregation results
SELECT
  id,
  claim,
  aggregation_timestamp,
  aggregation_results->>'finalConfidence' as final_confidence,
  aggregation_results->>'evidenceSummary' as evidence_summary
FROM approved_markets
WHERE aggregation_results IS NOT NULL
ORDER BY aggregation_timestamp DESC;

-- Get markets needing fresh analysis (older than 3 days)
SELECT
  id,
  claim,
  status,
  ai_analysis_timestamp,
  aggregation_timestamp
FROM approved_markets
WHERE status IN ('pending_resolution', 'disputing', 'disputable')
  AND (
    ai_analysis_timestamp IS NULL
    OR ai_analysis_timestamp < NOW() - INTERVAL '3 days'
  )
ORDER BY expires_at ASC;
*/

-- ========================================
-- DONE! Schema ready for confidence data persistence
-- ========================================

-- To verify the migration:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'approved_markets'
-- AND column_name IN ('aggregation_results', 'ai_analysis_timestamp', 'aggregation_timestamp');
