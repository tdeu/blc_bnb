-- CAST Treasury System Tables Migration
-- Execute this in Supabase SQL Editor
-- Date: 2025-11-13

-- CAST Purchase Tracking Table
-- Tracks all CAST token purchases via the BuyCAST contract
CREATE TABLE IF NOT EXISTS cast_purchases (
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
CREATE TABLE IF NOT EXISTS treasury_snapshots (
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
CREATE INDEX IF NOT EXISTS idx_cast_purchases_buyer ON cast_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_cast_purchases_timestamp ON cast_purchases(timestamp);
CREATE INDEX IF NOT EXISTS idx_cast_purchases_tx_hash ON cast_purchases(transaction_hash);

-- Indexes for treasury_snapshots
CREATE INDEX IF NOT EXISTS idx_treasury_snapshots_time ON treasury_snapshots(snapshot_time);

-- Enable RLS for new tables
ALTER TABLE cast_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for cast_purchases" ON cast_purchases;
DROP POLICY IF EXISTS "Public read access for treasury_snapshots" ON treasury_snapshots;

-- Create policies for public read access
CREATE POLICY "Public read access for cast_purchases" ON cast_purchases FOR SELECT USING (true);
CREATE POLICY "Public read access for treasury_snapshots" ON treasury_snapshots FOR SELECT USING (true);

-- Allow insert for authenticated users (or make it public if needed)
CREATE POLICY "Allow insert for cast_purchases" ON cast_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for treasury_snapshots" ON treasury_snapshots FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON cast_purchases TO anon, authenticated;
GRANT ALL ON treasury_snapshots TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE cast_purchases_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE treasury_snapshots_id_seq TO anon, authenticated;

-- Verify tables were created
SELECT
  'cast_purchases' as table_name,
  COUNT(*) as row_count
FROM cast_purchases
UNION ALL
SELECT
  'treasury_snapshots' as table_name,
  COUNT(*) as row_count
FROM treasury_snapshots;

-- Success message
SELECT 'CAST Treasury tables created successfully!' as status;
