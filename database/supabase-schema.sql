-- Create the approved_markets table
CREATE TABLE approved_markets (
    id TEXT PRIMARY KEY,
    claim TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT NOT NULL,
    market_type TEXT NOT NULL,
    confidence_level TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by TEXT NOT NULL,
    approval_reason TEXT,
    submitter_address TEXT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_approved_markets_category ON approved_markets(category);
CREATE INDEX idx_approved_markets_country ON approved_markets(country);
CREATE INDEX idx_approved_markets_expires_at ON approved_markets(expires_at);
CREATE INDEX idx_approved_markets_approved_at ON approved_markets(approved_at);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE approved_markets ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read approved markets (they're public anyway)
CREATE POLICY "Anyone can read approved markets" ON approved_markets
    FOR SELECT USING (true);

-- Only allow inserts/updates from admin addresses (you can customize this)
-- For now, we'll allow all authenticated users to insert/update
-- You can modify this later to check against your admin whitelist
CREATE POLICY "Allow inserts for approved markets" ON approved_markets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates for approved markets" ON approved_markets
    FOR UPDATE USING (true);

-- Comments for documentation
COMMENT ON TABLE approved_markets IS 'Stores metadata for markets approved by administrators';
COMMENT ON COLUMN approved_markets.id IS 'Unique market identifier matching the blockchain market ID';
COMMENT ON COLUMN approved_markets.approved_by IS 'Ethereum address of the admin who approved this market';
COMMENT ON COLUMN approved_markets.submitter_address IS 'Ethereum address of the user who submitted this market';