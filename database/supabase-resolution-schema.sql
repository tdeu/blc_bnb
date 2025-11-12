-- Enhanced Supabase Schema for Resolution and Dispute System
-- Run this SQL in your Supabase SQL Editor after the base schema

-- First, update existing approved_markets table to support resolution system
ALTER TABLE approved_markets 
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'pending_resolution', 'disputing', 'resolved', 'disputed_resolution', 'locked'));

ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS resolution_data JSONB,
ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispute_period_end TIMESTAMPTZ;

-- Market Resolution Table with Hedera fields
CREATE TABLE IF NOT EXISTS market_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL REFERENCES approved_markets(id) ON DELETE CASCADE,
  outcome VARCHAR CHECK (outcome IN ('yes', 'no')),
  source VARCHAR NOT NULL,
  api_data JSONB,
  confidence VARCHAR CHECK (confidence IN ('high', 'medium', 'low')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  dispute_period_end TIMESTAMPTZ NOT NULL,
  final_outcome VARCHAR CHECK (final_outcome IN ('yes', 'no')),
  resolved_by VARCHAR CHECK (resolved_by IN ('api', 'admin', 'contract')),
  admin_notes TEXT,
  
  -- Hedera-specific fields
  hcs_topic_id VARCHAR, -- HCS topic for resolution messages
  hts_token_id VARCHAR, -- HTS token for dispute bonds
  contract_id VARCHAR, -- Smart contract for advanced arbitration
  transaction_id VARCHAR, -- Hedera transaction ID
  consensus_timestamp TIMESTAMPTZ, -- Hedera consensus timestamp
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Disputes Table with Hedera integration
CREATE TABLE IF NOT EXISTS market_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL REFERENCES approved_markets(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES market_resolutions(id),
  user_id VARCHAR NOT NULL,
  dispute_reason TEXT NOT NULL,
  evidence_url VARCHAR,
  evidence_description TEXT,
  status VARCHAR CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'contract_processing')) DEFAULT 'pending',
  admin_response TEXT,
  
  -- Hedera-specific fields
  bond_amount DECIMAL(15,2), -- HTS token bond amount
  bond_transaction_id VARCHAR, -- Transaction ID for bond payment
  hcs_message_id VARCHAR, -- HCS message ID for dispute submission
  arbitration_contract_id VARCHAR, -- Contract handling this dispute
  bond_refund_transaction_id VARCHAR, -- Transaction ID for bond refund
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HCS Topics Table for tracking consensus topics
CREATE TABLE IF NOT EXISTS hcs_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id VARCHAR UNIQUE NOT NULL,
  topic_type VARCHAR NOT NULL, -- 'resolution', 'dispute', 'admin', 'evidence', 'attestation'
  description TEXT,
  admin_key VARCHAR, -- Optional admin key for topic management
  submit_key VARCHAR, -- Optional submit key for restricted topics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HTS Tokens Table for tracking dispute bonds and utility tokens
CREATE TABLE IF NOT EXISTS hts_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR UNIQUE NOT NULL,
  token_name VARCHAR NOT NULL,
  token_symbol VARCHAR NOT NULL,
  token_type VARCHAR CHECK (token_type IN ('fungible', 'non_fungible')),
  purpose VARCHAR NOT NULL, -- 'dispute_bond', 'governance', 'reward', 'betting'
  decimals INTEGER DEFAULT 0,
  total_supply DECIMAL(20,2),
  treasury_account VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Integration Logs for auditability
CREATE TABLE IF NOT EXISTS api_integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT REFERENCES approved_markets(id),
  api_source VARCHAR NOT NULL,
  request_data JSONB,
  response_data JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  response_time_ms INTEGER,
  hcs_log_message_id VARCHAR, -- HCS message ID for audit trail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings for resolution configuration
CREATE TABLE IF NOT EXISTS resolution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_resolutions_market_id ON market_resolutions(market_id);
CREATE INDEX IF NOT EXISTS idx_market_resolutions_hcs_topic ON market_resolutions(hcs_topic_id);
CREATE INDEX IF NOT EXISTS idx_market_resolutions_status ON market_resolutions(resolved_by);
CREATE INDEX IF NOT EXISTS idx_market_disputes_market_id ON market_disputes(market_id);
CREATE INDEX IF NOT EXISTS idx_market_disputes_status ON market_disputes(status);
CREATE INDEX IF NOT EXISTS idx_market_disputes_user ON market_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_market_disputes_bond_transaction ON market_disputes(bond_transaction_id);
CREATE INDEX IF NOT EXISTS idx_hcs_topics_type ON hcs_topics(topic_type);
CREATE INDEX IF NOT EXISTS idx_hts_tokens_purpose ON hts_tokens(purpose);
CREATE INDEX IF NOT EXISTS idx_api_logs_market ON api_integration_logs(market_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_source ON api_integration_logs(api_source);
CREATE INDEX IF NOT EXISTS idx_resolution_settings_key ON resolution_settings(setting_key);

-- Enable Row Level Security for new tables
ALTER TABLE market_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcs_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hts_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_resolutions (public read, controlled write)
CREATE POLICY "Anyone can read market resolutions" ON market_resolutions
    FOR SELECT USING (true);

CREATE POLICY "Allow inserts for market resolutions" ON market_resolutions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates for market resolutions" ON market_resolutions
    FOR UPDATE USING (true);

-- RLS Policies for market_disputes (public read, user can insert own disputes)
CREATE POLICY "Anyone can read market disputes" ON market_disputes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own disputes" ON market_disputes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates for market disputes" ON market_disputes
    FOR UPDATE USING (true);

-- RLS Policies for HCS topics (public read)
CREATE POLICY "Anyone can read HCS topics" ON hcs_topics
    FOR SELECT USING (true);

CREATE POLICY "Allow inserts for HCS topics" ON hcs_topics
    FOR INSERT WITH CHECK (true);

-- RLS Policies for HTS tokens (public read)
CREATE POLICY "Anyone can read HTS tokens" ON hts_tokens
    FOR SELECT USING (true);

CREATE POLICY "Allow inserts for HTS tokens" ON hts_tokens
    FOR INSERT WITH CHECK (true);

-- RLS Policies for API logs (public read for transparency)
CREATE POLICY "Anyone can read API logs" ON api_integration_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow inserts for API logs" ON api_integration_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for resolution settings (public read, controlled write)
CREATE POLICY "Anyone can read resolution settings" ON resolution_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow inserts for resolution settings" ON resolution_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates for resolution settings" ON resolution_settings
    FOR UPDATE USING (true);

-- Database triggers for automatic status updates
CREATE OR REPLACE FUNCTION update_market_status_on_resolution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE approved_markets 
  SET status = 'pending_resolution',
      dispute_period_end = NEW.dispute_period_end,
      resolution_data = jsonb_build_object(
        'resolution_id', NEW.id,
        'outcome', NEW.outcome,
        'source', NEW.source,
        'confidence', NEW.confidence,
        'timestamp', NEW.timestamp
      )
  WHERE id = NEW.market_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER resolution_status_trigger
  AFTER INSERT ON market_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION update_market_status_on_resolution();

-- Trigger to update dispute count
CREATE OR REPLACE FUNCTION update_dispute_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE approved_markets 
    SET dispute_count = dispute_count + 1,
        status = 'disputing'
    WHERE id = NEW.market_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE approved_markets 
    SET dispute_count = GREATEST(dispute_count - 1, 0)
    WHERE id = OLD.market_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER dispute_count_trigger
  AFTER INSERT OR DELETE ON market_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_dispute_count();

-- Insert initial HCS topics from environment
INSERT INTO hcs_topics (topic_id, topic_type, description) VALUES
  ('0.0.6701034', 'evidence', 'Community evidence submissions'),
  ('0.0.6701057', 'attestation', 'AI verification results'),
  ('0.0.6701064', 'dispute', 'Community challenges to AI decisions')
ON CONFLICT (topic_id) DO NOTHING;

-- Insert default resolution settings
INSERT INTO resolution_settings (setting_key, setting_value, description) VALUES
  ('dispute_period_hours', '168', 'Default dispute period in hours (7 days)'),
  ('min_bond_amount', '{"evidence": 100, "interpretation": 250, "api_error": 500}', 'Minimum bond amounts by dispute type'),
  ('confidence_thresholds', '{"high": 0.9, "medium": 0.7, "low": 0.5}', 'API confidence thresholds for auto-resolution'),
  ('bond_slashing_percentage', '50', 'Percentage of bond slashed for invalid disputes'),
  ('auto_resolve_after_hours', '168', 'Hours after which unresolved markets auto-resolve (7 days)')
ON CONFLICT (setting_key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE market_resolutions IS 'Stores resolution data from API sources with Hedera integration';
COMMENT ON TABLE market_disputes IS 'Stores user disputes against resolutions with HTS bond system';
COMMENT ON TABLE hcs_topics IS 'Tracks Hedera Consensus Service topics used by the system';
COMMENT ON TABLE hts_tokens IS 'Tracks Hedera Token Service tokens used for bonds and governance';
COMMENT ON TABLE api_integration_logs IS 'Audit trail of all API calls for resolution data';
COMMENT ON TABLE resolution_settings IS 'Configurable system parameters for the resolution system';