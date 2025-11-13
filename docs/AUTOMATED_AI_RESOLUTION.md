# BlockCast - Automated AI Resolution System

## Overview

BlockCast now operates as a classic prediction market with fully automated AI-powered resolution. The evidence submission and dispute systems have been removed for simplicity and efficiency.

## System Architecture

### Market Lifecycle

```
SUBMITTED → OPEN → PENDING_RESOLUTION → RESOLVED
                                ↓
                           (automated)
```

1. **SUBMITTED**: Market created by user, awaiting admin approval
2. **OPEN**: Market is live and accepting bets until expiration date
3. **PENDING_RESOLUTION**: Market expired, AI is analyzing outcome
4. **RESOLVED**: Market outcome determined, payouts available

### Automated Resolution Flow

1. **Expiration Detection**
   - `AutomaticResolutionMonitor` checks every hour for expired markets
   - Markets with `expires_at < now` and `status = 'open'` are candidates

2. **AI Resolution**
   - Perplexity AI analyzes the market question
   - Returns outcome (`yes`/`no`) + confidence score (0-100%)

3. **Blockchain Resolution**
   - Calls `resolveMarketWithAI(outcome, confidence)` on smart contract
   - Market status instantly transitions from OPEN → PENDING_RESOLUTION → RESOLVED
   - Protocol fees deducted, creator rewarded with CAST tokens

4. **Payout**
   - Winners can redeem their shares for proportional payout
   - All handled on-chain via the PredictionMarket contract

## Key Components

### Smart Contracts (BNB Chain)

- **PredictionMarket.sol**
  - `resolveMarketWithAI(outcome, confidence)` - Single-step resolution
  - Removes old `preliminaryResolve()` and `finalResolve()` functions
  - Directly transitions from Open → Resolved

- **DisputeManager.sol** - REMOVED (no longer needed)

### Backend Services

- **automaticResolutionMonitor.ts**
  - Runs every hour checking for expired markets
  - Queries Perplexity AI for outcome
  - Triggers on-chain resolution

- **resolutionService.ts**
  - `resolveMarketWithAI(marketId, outcome, confidence)`
  - Handles admin signer and blockchain interaction
  - Updates database after successful resolution

### Database Schema

Removed tables:
- `evidence_submissions`
- `evidence_rewards`
- `market_disputes`
- `hcs_topics` (Hedera-specific)
- `hts_tokens` (Hedera-specific)

Removed fields from `approved_markets`:
- `dispute_period_ends`
- `evidence_count`
- `is_disputable`

### UI Components Removed

- `src/components/dispute/` - Entire folder
- `src/components/evidence/` - Entire folder
- `EvidenceResolutionPanel.tsx`
- `DisputeModal.tsx`
- `AdminDisputePanel.tsx`

### Configuration Updates

**constants.ts**:
- Removed `DISPUTE_PERIOD` constant
- Removed `DISPUTABLE` from market status enum
- Removed `DISPUTE_MANAGER_CONTRACT` address

## Benefits

1. **Simplified User Experience**: No waiting for dispute periods
2. **Faster Resolutions**: Markets resolve automatically within ~1 hour of expiration
3. **Lower Gas Costs**: Single transaction instead of two-stage resolution
4. **Reduced Complexity**: Fewer moving parts = easier to maintain
5. **Classic Prediction Market**: Familiar model like Polymarket, Manifold

## API Endpoints

### Resolution Monitor

Start the monitor:
```typescript
import { automaticResolutionMonitor } from './services/automaticResolutionMonitor';
automaticResolutionMonitor.start();
```

Manual trigger (for testing):
```typescript
automaticResolutionMonitor.triggerCheck();
```

### Resolution Service

Direct resolution:
```typescript
import { resolutionService } from './utils/resolutionService';

const result = await resolutionService.resolveMarketWithAI(
  marketId,
  'yes', // or 'no'
  85 // confidence 0-100
);
```

## Deployment Checklist

- [ ] Deploy updated PredictionMarket contract to BNB Chain
- [ ] Run database migration: `database/remove-evidence-dispute-migration.sql`
- [ ] Update contract addresses in `constants.ts`
- [ ] Start AutomaticResolutionMonitor in production
- [ ] Remove old Hedera environment variables
- [ ] Test full market lifecycle from creation to payout

## Environment Variables

Required:
```env
# BNB Chain
VITE_BSC_RPC_URL=https://bsc-testnet.publicnode.com
VITE_CHAIN_ID=97

# Admin Signer (for automated resolution)
ADMIN_PRIVATE_KEY=0x...

# AI Provider
AI_PROVIDER=perplexity
PERPLEXITY_API_KEY=...

# Database
SUPABASE_URL=...
SUPABASE_KEY=...

# IPFS (for market images only)
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
```

Removed (no longer needed):
- All `HEDERA_*` variables
- `HCS_*` variables
- `HTS_*` variables
- Dispute-related variables

## Migration Notes

For existing markets in "disputable" status:
1. Manually resolve using admin panel OR
2. Run migration script to force-resolve with AI OR
3. Allow markets to expire and be picked up by monitor

## Support

For questions or issues with the automated resolution system:
1. Check AutomaticResolutionMonitor logs
2. Verify admin signer has sufficient BNB for gas
3. Ensure Perplexity API key is valid and has credits
4. Check contract addresses in constants.ts
