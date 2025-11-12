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
  dispute_count INTEGER DEFAULT 0,
  total_rewards_distributed NUMERIC DEFAULT 0
);

-- Evidence table - stores evidence submissions for markets
CREATE TABLE evidence (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES markets(id),
  submitter_address TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('text', 'url', 'file')),
  credibility_score NUMERIC,
  language TEXT NOT NULL DEFAULT 'en',
  hcs_message_id TEXT,
  ipfs_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_validated BOOLEAN DEFAULT FALSE
);

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
CREATE INDEX idx_evidence_market_id ON evidence(market_id);
CREATE INDEX idx_resolution_jobs_status ON resolution_jobs(status);

-- Insert sample data for testing
INSERT INTO markets (id, question, creator_address, contract_address, end_time, status) VALUES
  ('real-madrid-vs-manchester', 'Real Madrid is a better team than Manchester United', '0x123...', '0x456...', NOW() + INTERVAL '1 day', 'active'),
  ('jesus-existence', 'Has Jesus really existed?', '0x789...', '0x456...', NOW() - INTERVAL '1 hour', 'active'),
  ('elon-musk-richest', 'Will Elon Musk still be the richest man on 31st December?', '0xabc...', '0x456...', '2024-12-31T23:59:59Z', 'active');

-- Insert sample evidence
INSERT INTO evidence (market_id, submitter_address, content, evidence_type, credibility_score, language) VALUES
  ('jesus-existence', '0x111...', 'Historical scholarly consensus supports existence based on multiple independent sources', 'text', 0.85, 'en'),
  ('jesus-existence', '0x222...', 'Archaeological evidence from first century Palestine', 'text', 0.75, 'en'),
  ('real-madrid-vs-manchester', '0x333...', 'UEFA coefficient rankings and Champions League performance', 'text', 0.9, 'en');

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Public read access for markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Public read access for evidence" ON evidence FOR SELECT USING (true);

-- Comment: In production, you'd want more restrictive policies
-- For now, this allows the service to read and write data freely