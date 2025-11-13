-- BlockCast Database Schema for Supabase
-- Run this SQL in your Supabase dashboard (SQL Editor)

-- Markets table - stores prediction markets
CREATE TABLE markets (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  creator_address TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'resolved', 'processing')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ai_confidence_score NUMERIC,
  resolution TEXT CHECK (resolution IN ('YES', 'NO', 'INVALID')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_reason TEXT,
  total_rewards_distributed NUMERIC DEFAULT 0
);

-- Evidence table removed - no longer needed for automated AI resolution

-- Resolution jobs table - tracks AI resolution processing
CREATE TABLE resolution_jobs (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES markets(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_analysis JSONB,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_end_time ON markets(end_time);
CREATE INDEX idx_resolution_jobs_status ON resolution_jobs(status);

-- Insert sample data for testing
INSERT INTO markets (id, question, creator_address, contract_address, end_time, status) VALUES
  ('real-madrid-vs-manchester', 'Real Madrid is a better team than Manchester United', '0x123...', '0x456...', NOW() + INTERVAL '1 day', 'active'),
  ('jesus-existence', 'Has Jesus really existed?', '0x789...', '0x456...', NOW() - INTERVAL '1 hour', 'active'),
  ('elon-musk-richest', 'Will Elon Musk still be the richest man on 31st December?', '0xabc...', '0x456...', '2024-12-31T23:59:59Z', 'active');

-- Sample evidence removed - evidence system no longer in use

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Public read access for markets" ON markets FOR SELECT USING (true);

-- Comment: In production, you'd want more restrictive policies
-- For now, this allows the service to read and write data freely

-- CAST Purchase Tracking Table
-- Tracks all CAST token purchases via the BuyCAST contract
CREATE TABLE cast_purchases (
  id SERIAL PRIMARY KEY,
  buyer_address TEXT NOT NULL,
  bnb_amount NUMERIC NOT NULL, -- Amount of BNB spent (in ether)
  cast_amount NUMERIC NOT NULL, -- Amount of CAST received (in ether)
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treasury Balance Snapshots Table
-- Periodic snapshots of treasury and token distribution
CREATE TABLE treasury_snapshots (
  id SERIAL PRIMARY KEY,
  total_cast_supply NUMERIC NOT NULL, -- Total CAST in circulation
  initial_allocation NUMERIC NOT NULL, -- Initial 10M allocated to owner
  purchased_cast NUMERIC NOT NULL, -- CAST minted via purchases
  bnb_revenue NUMERIC NOT NULL, -- Total BNB in treasury
  owner_balance NUMERIC NOT NULL, -- Owner's CAST balance
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cast_purchases
CREATE INDEX idx_cast_purchases_buyer ON cast_purchases(buyer_address);
CREATE INDEX idx_cast_purchases_timestamp ON cast_purchases(timestamp);
CREATE INDEX idx_cast_purchases_tx_hash ON cast_purchases(transaction_hash);

-- Indexes for treasury_snapshots
CREATE INDEX idx_treasury_snapshots_time ON treasury_snapshots(snapshot_time);

-- Enable RLS for new tables
ALTER TABLE cast_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for cast_purchases" ON cast_purchases FOR SELECT USING (true);
CREATE POLICY "Public read access for treasury_snapshots" ON treasury_snapshots FOR SELECT USING (true);