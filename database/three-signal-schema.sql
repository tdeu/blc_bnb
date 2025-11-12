-- Three-Signal Resolution System - Database Schema Updates
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. Enhance evidence_submissions table
-- ========================================

-- Add columns for credibility tracking
ALTER TABLE evidence_submissions
ADD COLUMN IF NOT EXISTS user_bet_position TEXT CHECK (user_bet_position IN ('YES', 'NO', 'NONE')),
ADD COLUMN IF NOT EXISTS evidence_position TEXT CHECK (evidence_position IN ('YES', 'NO', 'NEUTRAL')),
ADD COLUMN IF NOT EXISTS credibility_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS weighted_score NUMERIC,
ADD COLUMN IF NOT EXISTS wallet_age_days INTEGER,
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_evidence_market_position ON evidence_submissions(market_id, evidence_position);
CREATE INDEX IF NOT EXISTS idx_evidence_suspicious ON evidence_submissions(is_suspicious) WHERE is_suspicious = TRUE;

COMMENT ON COLUMN evidence_submissions.user_bet_position IS 'User''s betting position: YES/NO/NONE';
COMMENT ON COLUMN evidence_submissions.evidence_position IS 'What the evidence supports: YES/NO/NEUTRAL';
COMMENT ON COLUMN evidence_submissions.credibility_multiplier IS 'Credibility weight (2.5x for contrarian evidence, 1.0x normal)';
COMMENT ON COLUMN evidence_submissions.weighted_score IS 'Final weighted score after applying multipliers';
COMMENT ON COLUMN evidence_submissions.wallet_age_days IS 'Age of wallet in days (for Sybil detection)';
COMMENT ON COLUMN evidence_submissions.is_suspicious IS 'Flagged as potentially fraudulent (new wallet, clustering, etc.)';

-- ========================================
-- 2. Create betting_snapshots table
-- ========================================

CREATE TABLE IF NOT EXISTS betting_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL REFERENCES approved_markets(id),
  contract_address TEXT NOT NULL,
  total_yes_volume NUMERIC NOT NULL,
  total_no_volume NUMERIC NOT NULL,
  yes_percentage NUMERIC NOT NULL,
  no_percentage NUMERIC NOT NULL,
  unique_bettors INTEGER DEFAULT 0,
  largest_bet_amount NUMERIC DEFAULT 0,
  largest_bet_percentage NUMERIC DEFAULT 0,
  largest_bet_wallet TEXT,
  whale_detected BOOLEAN DEFAULT FALSE,
  last_minute_surge BOOLEAN DEFAULT FALSE,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_betting_snapshots_market ON betting_snapshots(market_id);
CREATE INDEX IF NOT EXISTS idx_betting_snapshots_whale ON betting_snapshots(whale_detected) WHERE whale_detected = TRUE;

COMMENT ON TABLE betting_snapshots IS 'Captures betting volumes when market expires (Signal #1)';
COMMENT ON COLUMN betting_snapshots.whale_detected IS 'TRUE if any wallet has >25% of total volume';
COMMENT ON COLUMN betting_snapshots.last_minute_surge IS 'TRUE if >40% of volume came in final 24 hours';

-- ========================================
-- 3. Create resolution_scores table
-- ========================================

CREATE TABLE IF NOT EXISTS resolution_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL REFERENCES approved_markets(id),

  -- Signal #1: Betting
  betting_score NUMERIC NOT NULL,
  betting_percentage NUMERIC NOT NULL,
  betting_warnings TEXT[],

  -- Signal #2: Evidence
  evidence_score NUMERIC NOT NULL,
  evidence_percentage NUMERIC NOT NULL,
  evidence_weighted_yes NUMERIC,
  evidence_weighted_no NUMERIC,
  evidence_warnings TEXT[],

  -- Signal #3: API
  api_score NUMERIC NOT NULL,
  api_percentage NUMERIC NOT NULL,
  api_article_count INTEGER,
  api_warnings TEXT[],

  -- Combined
  total_score NUMERIC NOT NULL,
  confidence_percentage NUMERIC NOT NULL,
  recommended_outcome TEXT NOT NULL CHECK (recommended_outcome IN ('YES', 'NO', 'UNCERTAIN')),
  all_signals_aligned BOOLEAN NOT NULL,
  alignment_bonus NUMERIC DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by TEXT, -- 'auto' or admin wallet address

  UNIQUE(market_id) -- Only one resolution score per market
);

CREATE INDEX IF NOT EXISTS idx_resolution_scores_market ON resolution_scores(market_id);
CREATE INDEX IF NOT EXISTS idx_resolution_scores_confidence ON resolution_scores(confidence_percentage);
CREATE INDEX IF NOT EXISTS idx_resolution_scores_aligned ON resolution_scores(all_signals_aligned);

COMMENT ON TABLE resolution_scores IS 'Stores three-signal analysis results for each market';
COMMENT ON COLUMN resolution_scores.all_signals_aligned IS 'TRUE if all three signals point to same outcome (enables +8 bonus)';
COMMENT ON COLUMN resolution_scores.alignment_bonus IS 'Bonus points (8) if all signals aligned';

-- ========================================
-- 4. Create trigger to calculate weighted scores
-- ========================================

CREATE OR REPLACE FUNCTION calculate_evidence_weight()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate credibility multiplier based on bet position vs evidence position
  IF NEW.user_bet_position = 'YES' AND NEW.evidence_position = 'NO' THEN
    NEW.credibility_multiplier := 2.5; -- Contrarian evidence is highly credible
  ELSIF NEW.user_bet_position = 'NO' AND NEW.evidence_position = 'YES' THEN
    NEW.credibility_multiplier := 2.5; -- Contrarian evidence is highly credible
  ELSIF NEW.user_bet_position = 'NONE' THEN
    NEW.credibility_multiplier := 1.0; -- No bet = neutral credibility
  ELSIF NEW.evidence_position = 'NEUTRAL' THEN
    NEW.credibility_multiplier := 1.0; -- Neutral evidence = standard credibility
  ELSE
    NEW.credibility_multiplier := 1.0; -- Supporting evidence = standard credibility
  END IF;

  -- Apply wallet age penalty for Sybil detection
  IF NEW.wallet_age_days IS NOT NULL AND NEW.wallet_age_days < 7 THEN
    NEW.credibility_multiplier := NEW.credibility_multiplier * 0.5; -- 50% penalty for new wallets
    NEW.is_suspicious := TRUE;
  END IF;

  -- Calculate final weighted score
  NEW.weighted_score := NEW.credibility_multiplier;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to evidence_submissions table
DROP TRIGGER IF EXISTS calculate_weight_trigger ON evidence_submissions;
CREATE TRIGGER calculate_weight_trigger
BEFORE INSERT OR UPDATE ON evidence_submissions
FOR EACH ROW
EXECUTE FUNCTION calculate_evidence_weight();

-- ========================================
-- 5. Create view for easy querying
-- ========================================

CREATE OR REPLACE VIEW three_signal_summary AS
SELECT
  rs.market_id,
  am.claim,
  am.status,
  rs.betting_score,
  rs.betting_percentage,
  rs.evidence_score,
  rs.evidence_percentage,
  rs.api_score,
  rs.api_percentage,
  rs.total_score,
  rs.confidence_percentage,
  rs.recommended_outcome,
  rs.all_signals_aligned,
  rs.calculated_at,
  am.end_time as market_end_time
FROM resolution_scores rs
JOIN approved_markets am ON rs.market_id = am.id
ORDER BY rs.calculated_at DESC;

COMMENT ON VIEW three_signal_summary IS 'Easy-to-query summary of three-signal resolution scores';

-- ========================================
-- 6. Sample query examples (for reference)
-- ========================================

/*
-- Get high-confidence resolutions ready for auto-execute
SELECT * FROM resolution_scores
WHERE confidence_percentage >= 95
AND all_signals_aligned = TRUE
ORDER BY calculated_at DESC;

-- Get markets needing admin review (medium confidence)
SELECT * FROM resolution_scores
WHERE confidence_percentage >= 60
AND confidence_percentage < 95
ORDER BY confidence_percentage DESC;

-- Get markets with suspicious evidence
SELECT
  es.market_id,
  COUNT(*) as suspicious_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM evidence_submissions WHERE market_id = es.market_id) as suspicious_percentage
FROM evidence_submissions es
WHERE es.is_suspicious = TRUE
GROUP BY es.market_id
HAVING COUNT(*) > 3; -- More than 3 suspicious submissions

-- Get contrarian evidence (users betting against their own submission)
SELECT
  market_id,
  user_id,
  user_bet_position,
  evidence_position,
  credibility_multiplier,
  evidence_text
FROM evidence_submissions
WHERE credibility_multiplier > 2.0
ORDER BY market_id, created_at;
*/

-- ========================================
-- 7. Grant permissions (if needed)
-- ========================================

-- Grant access to authenticated users
GRANT SELECT ON three_signal_summary TO authenticated;
GRANT SELECT ON resolution_scores TO authenticated;
GRANT SELECT ON betting_snapshots TO authenticated;

-- ========================================
-- DONE! Schema ready for three-signal system
-- ========================================

-- To apply this schema:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Verify tables created with: \dt
