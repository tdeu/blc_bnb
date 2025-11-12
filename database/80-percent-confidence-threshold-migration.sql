-- ========================================
-- 80% Confidence Threshold Migration
-- ========================================
-- This migration adds support for the new resolution system where:
-- 1. Markets require 80% confidence for resolution
-- 2. Evidence period minimum is 7 days
-- 3. Markets can stay disputable up to 30 days
-- 4. Markets with <80% confidence after 30 days can be refunded
-- ========================================

-- Add evidence_period_start column to track when evidence collection began
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS evidence_period_start TIMESTAMPTZ;

-- Add index for efficient queries on evidence period start
CREATE INDEX IF NOT EXISTS idx_approved_markets_evidence_period_start
ON approved_markets(evidence_period_start);

-- Add column to track if market was refunded
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;

-- Add column to track refund transaction hash
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS refund_tx_hash TEXT;

-- Add column to track refund timestamp
ALTER TABLE approved_markets
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Update status CHECK constraint to include 'refunded' status
-- Strategy: Drop constraint, add columns, then recreate constraint
-- This avoids constraint violations during migration

-- Step 1: Drop the old constraint completely
ALTER TABLE approved_markets DROP CONSTRAINT IF EXISTS approved_markets_status_check;

-- Now the constraint is gone, so we can safely add it back with all possible values
-- Including every status that might exist in your database
ALTER TABLE approved_markets
ADD CONSTRAINT approved_markets_status_check
CHECK (status IN (
  'active',
  'pending_resolution',
  'disputing',
  'resolved',
  'disputed_resolution',
  'locked',
  'disputable',
  'refunded',
  'open',
  'submitted',
  'expired',
  'Submited',  -- Note: Your contract might use capital S
  'Open',
  'PendingResolution',
  'Resolved',
  'Canceled',
  'Refunded'
));

-- ========================================
-- Comments for documentation
-- ========================================
COMMENT ON COLUMN approved_markets.evidence_period_start IS 'Timestamp when evidence collection period started (market expired)';
COMMENT ON COLUMN approved_markets.refunded IS 'True if market was closed with refunds due to insufficient confidence';
COMMENT ON COLUMN approved_markets.refund_tx_hash IS 'Blockchain transaction hash of the refund operation';
COMMENT ON COLUMN approved_markets.refunded_at IS 'Timestamp when refunds were executed';

-- ========================================
-- Data Migration
-- ========================================
-- For existing markets that are already expired or disputable,
-- set evidence_period_start to expires_at if not already set
UPDATE approved_markets
SET evidence_period_start = expires_at
WHERE evidence_period_start IS NULL
AND (
  status IN ('disputable', 'pending_resolution', 'disputing', 'resolved')
  OR (status = 'active' AND expires_at <= NOW())
);
