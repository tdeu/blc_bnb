-- Evidence Submissions Table
CREATE TABLE IF NOT EXISTS evidence_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id VARCHAR NOT NULL REFERENCES approved_markets(id),
  user_id VARCHAR NOT NULL,
  evidence_text TEXT NOT NULL,
  evidence_links TEXT[] DEFAULT '{}',
  submission_fee DECIMAL(15,8) NOT NULL DEFAULT 0, -- HBAR amount paid to submit
  transaction_id VARCHAR, -- Hedera transaction ID for fee payment
  status VARCHAR CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')) DEFAULT 'pending',
  reward_amount DECIMAL(15,8) DEFAULT 0, -- HBAR reward if accepted
  reward_transaction_id VARCHAR, -- Hedera transaction ID for reward
  quality_score DECIMAL(3,2) DEFAULT 1.0, -- Admin quality rating (0-5.0)
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add evidence_count column to approved_markets if it doesn't exist
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_market_id ON evidence_submissions(market_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_user_id ON evidence_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_status ON evidence_submissions(status);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_created_at ON evidence_submissions(created_at);

-- Evidence Rewards Tracking Table (for analytics)
CREATE TABLE IF NOT EXISTS evidence_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES evidence_submissions(id),
  user_id VARCHAR NOT NULL,
  amount DECIMAL(15,8) NOT NULL,
  reward_type VARCHAR CHECK (reward_type IN ('quality_bonus', 'dispute_win', 'early_submission', 'partial_refund')),
  transaction_id VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update evidence_count on approved_markets
CREATE OR REPLACE FUNCTION update_market_evidence_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE approved_markets
    SET evidence_count = (
      SELECT COUNT(*) FROM evidence_submissions
      WHERE market_id = NEW.market_id
    )
    WHERE id = NEW.market_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE approved_markets
    SET evidence_count = (
      SELECT COUNT(*) FROM evidence_submissions
      WHERE market_id = OLD.market_id
    )
    WHERE id = OLD.market_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS evidence_count_trigger ON evidence_submissions;
CREATE TRIGGER evidence_count_trigger
  AFTER INSERT OR DELETE ON evidence_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_market_evidence_count();

-- Insert some sample evidence submission fees and rewards config
CREATE TABLE IF NOT EXISTS evidence_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO evidence_config (config_key, config_value, description) VALUES
  ('submission_fee_hbar', '0.1', 'HBAR fee required to submit evidence'),
  ('base_reward_hbar', '0.5', 'Base HBAR reward for accepted evidence'),
  ('quality_multiplier', '2.0', 'Multiplier for high-quality evidence rewards'),
  ('partial_refund_rate', '0.5', 'Percentage of fee refunded for rejected but good-faith evidence'),
  ('min_evidence_length', '20', 'Minimum characters required for evidence text')
ON CONFLICT (config_key) DO NOTHING;