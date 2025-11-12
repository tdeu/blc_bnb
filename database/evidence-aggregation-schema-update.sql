-- Evidence Aggregation System Schema Updates
-- Phase 1: Add stance tracking and source credibility to evidence submissions

-- Add new columns to evidence_submissions table for stance tracking
ALTER TABLE evidence_submissions
ADD COLUMN IF NOT EXISTS stance VARCHAR CHECK (stance IN ('supporting', 'disputing', 'neutral')) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS source_credibility_score DECIMAL(3,2) DEFAULT 1.0 CHECK (source_credibility_score >= 0.0 AND source_credibility_score <= 1.0),
ADD COLUMN IF NOT EXISTS admin_stance_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_impact DECIMAL(5,2) DEFAULT 0.0, -- How much this evidence affects final confidence (-100 to +100)
ADD COLUMN IF NOT EXISTS source_type VARCHAR CHECK (source_type IN ('academic', 'government', 'news', 'expert_opinion', 'social_media', 'blog', 'anonymous', 'other')) DEFAULT 'other';

-- Create user reputation tracking table
CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR UNIQUE NOT NULL,
  total_submissions INTEGER DEFAULT 0,
  accepted_submissions INTEGER DEFAULT 0,
  rejected_submissions INTEGER DEFAULT 0,
  average_quality_score DECIMAL(3,2) DEFAULT 0.0,
  reputation_score DECIMAL(3,2) DEFAULT 1.0 CHECK (reputation_score >= 0.0 AND reputation_score <= 2.0),
  total_hbar_staked DECIMAL(15,8) DEFAULT 0.0,
  specialization_domains TEXT[] DEFAULT '{}', -- Areas where user shows expertise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create evidence aggregation results table
CREATE TABLE IF NOT EXISTS evidence_aggregation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id VARCHAR UNIQUE NOT NULL REFERENCES approved_markets(id),
  ai_confidence DECIMAL(5,2), -- AI analysis confidence (0-100)
  ai_weight DECIMAL(3,2) DEFAULT 0.65, -- Weight given to AI analysis (0-1)
  evidence_confidence DECIMAL(5,2), -- Calculated from user evidence (0-100)
  evidence_weight DECIMAL(3,2) DEFAULT 0.35, -- Weight given to evidence (0-1)
  final_confidence DECIMAL(5,2), -- Final aggregated confidence (0-100)
  supporting_evidence_count INTEGER DEFAULT 0,
  disputing_evidence_count INTEGER DEFAULT 0,
  neutral_evidence_count INTEGER DEFAULT 0,
  total_evidence_quality_score DECIMAL(5,2) DEFAULT 0.0,
  has_conflicts BOOLEAN DEFAULT FALSE, -- True if AI and evidence strongly disagree
  confidence_factors JSONB, -- Detailed breakdown of confidence calculation
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_stance ON evidence_submissions(stance);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_source_type ON evidence_submissions(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_admin_stance_verified ON evidence_submissions(admin_stance_verified);
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_evidence_aggregation_market_id ON evidence_aggregation(market_id);
CREATE INDEX IF NOT EXISTS idx_evidence_aggregation_final_confidence ON evidence_aggregation(final_confidence);

-- Function to calculate user reputation score
CREATE OR REPLACE FUNCTION calculate_user_reputation(p_user_id VARCHAR)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_count INTEGER;
  accepted_count INTEGER;
  avg_quality DECIMAL(3,2);
  acceptance_rate DECIMAL(3,2);
  reputation DECIMAL(3,2);
BEGIN
  -- Get user submission statistics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'accepted'),
    COALESCE(AVG(quality_score) FILTER (WHERE status = 'accepted'), 0)
  INTO total_count, accepted_count, avg_quality
  FROM evidence_submissions
  WHERE user_id = p_user_id;

  -- Calculate acceptance rate
  IF total_count > 0 THEN
    acceptance_rate := (accepted_count::DECIMAL / total_count::DECIMAL);
  ELSE
    acceptance_rate := 0;
  END IF;

  -- Calculate reputation score (0.0 to 2.0)
  -- Base score from acceptance rate
  reputation := acceptance_rate;

  -- Bonus for high quality submissions
  IF avg_quality > 3.5 THEN
    reputation := reputation + 0.3;
  ELSIF avg_quality > 2.5 THEN
    reputation := reputation + 0.1;
  END IF;

  -- Bonus for experienced users
  IF total_count > 10 THEN
    reputation := reputation + 0.2;
  ELSIF total_count > 5 THEN
    reputation := reputation + 0.1;
  END IF;

  -- Cap at 2.0
  reputation := LEAST(reputation, 2.0);

  RETURN reputation;
END;
$$ LANGUAGE plpgsql;

-- Function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
  new_reputation DECIMAL(3,2);
  total_hbar DECIMAL(15,8);
BEGIN
  -- Calculate new reputation score
  new_reputation := calculate_user_reputation(COALESCE(NEW.user_id, OLD.user_id));

  -- Calculate total HBAR staked
  SELECT COALESCE(SUM(submission_fee), 0)
  INTO total_hbar
  FROM evidence_submissions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Update or insert user reputation
  INSERT INTO user_reputation (
    user_id,
    total_submissions,
    accepted_submissions,
    rejected_submissions,
    average_quality_score,
    reputation_score,
    total_hbar_staked,
    updated_at
  )
  SELECT
    COALESCE(NEW.user_id, OLD.user_id),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'accepted'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(AVG(quality_score) FILTER (WHERE status = 'accepted'), 0),
    new_reputation,
    total_hbar,
    NOW()
  FROM evidence_submissions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    total_submissions = EXCLUDED.total_submissions,
    accepted_submissions = EXCLUDED.accepted_submissions,
    rejected_submissions = EXCLUDED.rejected_submissions,
    average_quality_score = EXCLUDED.average_quality_score,
    reputation_score = EXCLUDED.reputation_score,
    total_hbar_staked = EXCLUDED.total_hbar_staked,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user reputation when evidence status changes
DROP TRIGGER IF EXISTS user_reputation_trigger ON evidence_submissions;
CREATE TRIGGER user_reputation_trigger
  AFTER INSERT OR UPDATE OF status, quality_score ON evidence_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

-- Function to get source credibility multiplier based on source type
CREATE OR REPLACE FUNCTION get_source_credibility_multiplier(source_type VARCHAR)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN CASE source_type
    WHEN 'academic' THEN 1.0
    WHEN 'government' THEN 1.0
    WHEN 'expert_opinion' THEN 0.9
    WHEN 'news' THEN 0.8
    WHEN 'blog' THEN 0.5
    WHEN 'social_media' THEN 0.5
    WHEN 'anonymous' THEN 0.3
    ELSE 0.7 -- 'other'
  END;
END;
$$ LANGUAGE plpgsql;

-- Add new configuration entries for aggregation settings
INSERT INTO evidence_config (config_key, config_value, description) VALUES
  ('ai_weight_default', '0.65', 'Default weight given to AI analysis in aggregation'),
  ('evidence_weight_default', '0.35', 'Default weight given to user evidence in aggregation'),
  ('ai_weight_news', '0.70', 'AI weight when data source is NEWS'),
  ('ai_weight_academic', '0.75', 'AI weight when data source is ACADEMIC'),
  ('ai_weight_historical', '0.60', 'AI weight when data source is HISTORICAL'),
  ('conflict_threshold', '30.0', 'Confidence difference threshold to flag conflicts'),
  ('min_confidence_threshold', '60.0', 'Minimum confidence required for auto-resolution'),
  ('reputation_weight_multiplier', '0.2', 'How much user reputation affects evidence weight')
ON CONFLICT (config_key) DO NOTHING;

-- View for easy access to evidence with aggregation data
CREATE OR REPLACE VIEW evidence_summary AS
SELECT
  es.*,
  ur.reputation_score,
  ur.average_quality_score as user_avg_quality,
  ur.total_submissions as user_total_submissions,
  get_source_credibility_multiplier(es.source_type) as source_multiplier,
  (es.quality_score * ur.reputation_score * get_source_credibility_multiplier(es.source_type)) as weighted_score
FROM evidence_submissions es
LEFT JOIN user_reputation ur ON es.user_id = ur.user_id;

COMMENT ON TABLE evidence_submissions IS 'Enhanced with stance tracking and source credibility for intelligent aggregation';
COMMENT ON TABLE user_reputation IS 'Tracks user submission history and reputation for evidence weighting';
COMMENT ON TABLE evidence_aggregation IS 'Stores calculated confidence scores combining AI analysis with user evidence';
COMMENT ON COLUMN evidence_submissions.stance IS 'Whether evidence supports, disputes, or is neutral toward the claim';
COMMENT ON COLUMN evidence_submissions.source_credibility_score IS 'Admin-assigned credibility score for the evidence source (0.0-1.0)';
COMMENT ON COLUMN evidence_submissions.confidence_impact IS 'How much this evidence contributes to final confidence (-100 to +100)';
COMMENT ON COLUMN user_reputation.reputation_score IS 'Calculated reputation score affecting evidence weight (0.0-2.0)';