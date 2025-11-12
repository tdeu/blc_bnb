-- Bet Events Table - Track all betting activity for bettor counting
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. Create bet_events table
-- ========================================

CREATE TABLE IF NOT EXISTS bet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  market_contract TEXT NOT NULL,
  user_address TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('YES', 'NO')),
  shares_amount NUMERIC NOT NULL,
  cost_amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  block_number BIGINT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. Create indexes for fast queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_bet_events_market ON bet_events(market_contract);
CREATE INDEX IF NOT EXISTS idx_bet_events_user ON bet_events(user_address);
CREATE INDEX IF NOT EXISTS idx_bet_events_market_user ON bet_events(market_contract, user_address);
CREATE INDEX IF NOT EXISTS idx_bet_events_timestamp ON bet_events(timestamp DESC);

-- ========================================
-- 3. Add comments for documentation
-- ========================================

COMMENT ON TABLE bet_events IS 'Tracks all betting activity for analytics and bettor counting';
COMMENT ON COLUMN bet_events.market_contract IS 'Contract address of the prediction market';
COMMENT ON COLUMN bet_events.user_address IS 'Wallet address of the bettor';
COMMENT ON COLUMN bet_events.bet_type IS 'Whether they bet YES or NO';
COMMENT ON COLUMN bet_events.shares_amount IS 'Amount of shares purchased';
COMMENT ON COLUMN bet_events.cost_amount IS 'Cost in CAST tokens';

-- ========================================
-- 4. Enable RLS (Row Level Security)
-- ========================================

ALTER TABLE bet_events ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for bet_events" ON bet_events FOR SELECT USING (true);

-- Create policy for service role insert (for backend to write)
CREATE POLICY "Service role can insert bet_events" ON bet_events FOR INSERT WITH CHECK (true);

-- ========================================
-- 5. Create helper function to get unique bettor count
-- ========================================

CREATE OR REPLACE FUNCTION get_unique_bettor_count(contract_address TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_address)
    FROM bet_events
    WHERE market_contract = contract_address
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unique_bettor_count IS 'Returns the number of unique bettors for a market';

-- ========================================
-- 6. Create view for market betting stats
-- ========================================

CREATE OR REPLACE VIEW market_betting_stats AS
SELECT
  market_contract,
  COUNT(DISTINCT user_address) as unique_bettors,
  COUNT(*) as total_bets,
  SUM(CASE WHEN bet_type = 'YES' THEN shares_amount ELSE 0 END) as total_yes_shares,
  SUM(CASE WHEN bet_type = 'NO' THEN shares_amount ELSE 0 END) as total_no_shares,
  SUM(cost_amount) as total_volume,
  MIN(timestamp) as first_bet_at,
  MAX(timestamp) as last_bet_at
FROM bet_events
GROUP BY market_contract;

COMMENT ON VIEW market_betting_stats IS 'Aggregated betting statistics per market';

-- ========================================
-- 7. Grant permissions
-- ========================================

GRANT SELECT ON bet_events TO authenticated;
GRANT SELECT ON market_betting_stats TO authenticated;

-- ========================================
-- DONE! Bet events tracking ready
-- ========================================

-- To apply this schema:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Verify with: SELECT * FROM market_betting_stats;
