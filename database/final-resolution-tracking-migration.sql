-- Final Resolution Tracking Migration
-- Adds columns to track preliminary and final resolution execution
-- Safe to run - uses IF NOT EXISTS checks

-- Add preliminary resolution tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='approved_markets' AND column_name='preliminary_resolve_time'
  ) THEN
    ALTER TABLE approved_markets ADD COLUMN preliminary_resolve_time TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_approved_markets_preliminary_resolve_time
      ON approved_markets(preliminary_resolve_time);
    RAISE NOTICE 'Added preliminary_resolve_time column';
  END IF;
END $$;

-- Add final resolution tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='approved_markets' AND column_name='final_resolve_time'
  ) THEN
    ALTER TABLE approved_markets ADD COLUMN final_resolve_time TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_approved_markets_final_resolve_time
      ON approved_markets(final_resolve_time);
    RAISE NOTICE 'Added final_resolve_time column';
  END IF;
END $$;

-- Add resolution transaction hash tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='approved_markets' AND column_name='resolution_tx_hash'
  ) THEN
    ALTER TABLE approved_markets ADD COLUMN resolution_tx_hash TEXT;
    RAISE NOTICE 'Added resolution_tx_hash column';
  END IF;
END $$;

-- Add final outcome tracking (separate from AI recommendation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='approved_markets' AND column_name='final_outcome'
  ) THEN
    ALTER TABLE approved_markets ADD COLUMN final_outcome TEXT
      CHECK (final_outcome IN ('yes', 'no', 'refunded'));
    RAISE NOTICE 'Added final_outcome column';
  END IF;
END $$;

-- Add refund reason tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='approved_markets' AND column_name='refund_reason'
  ) THEN
    ALTER TABLE approved_markets ADD COLUMN refund_reason TEXT;
    RAISE NOTICE 'Added refund_reason column';
  END IF;
END $$;

-- Create index on status for efficient queries
CREATE INDEX IF NOT EXISTS idx_approved_markets_status_resolution
  ON approved_markets(status)
  WHERE status IN ('pending_resolution', 'resolved', 'refunded');

-- Summary query to see which columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'approved_markets'
  AND column_name IN (
    'preliminary_resolve_time',
    'final_resolve_time',
    'resolution_tx_hash',
    'final_outcome',
    'refund_reason',
    'evidence_period_start',
    'refunded',
    'refund_tx_hash',
    'refunded_at'
  )
ORDER BY column_name;

-- Show migration completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Final Resolution Tracking Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - preliminary_resolve_time: Timestamp when preliminaryResolve() was called';
  RAISE NOTICE '  - final_resolve_time: Timestamp when finalResolve() was called';
  RAISE NOTICE '  - resolution_tx_hash: Blockchain transaction hash for final resolution';
  RAISE NOTICE '  - final_outcome: Final outcome (yes/no/refunded) after dispute period';
  RAISE NOTICE '  - refund_reason: Reason if market was refunded';
  RAISE NOTICE '';
  RAISE NOTICE 'Existing columns (from 80% threshold migration):';
  RAISE NOTICE '  - evidence_period_start: When evidence collection began';
  RAISE NOTICE '  - refunded: Boolean flag for refunded markets';
  RAISE NOTICE '  - refund_tx_hash: Blockchain transaction hash for refund';
  RAISE NOTICE '  - refunded_at: Timestamp when refund was executed';
  RAISE NOTICE '';
END $$;
