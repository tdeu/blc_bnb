# Market Lifecycle Analysis & Realignment Plan

## 🔍 CURRENT STATE ANALYSIS

### Contract States (PredictionMarket.sol)
```solidity
enum MarketStatus {
    Submited,           // 0 - Created, awaiting admin approval
    Open,               // 1 - Active, accepting bets  ✅ WORKS FINE
    PendingResolution,  // 2 - AI resolved, dispute window open
    Resolved,           // 3 - Finalized, payouts available
    Canceled            // 4 - Cancelled by admin
}
```

### Database States (Supabase `approved_markets.status`)
- `active` - Market open for betting
- `pending_resolution` - Waiting for resolution
- `disputable` - Can be disputed (custom status)
- `disputing` - Being disputed
- `resolved` - Finalized
- `offline` - Hidden from users

### DisputeManager Contract Requirements
**A market can ONLY be disputed when:**
```solidity
market.isPendingResolution() == true
// Which means: market.status == MarketStatus.PendingResolution (2)
```

---

## ❌ CRITICAL PROBLEMS IDENTIFIED

### Problem 1: **State Mismatch Between Contract & Database**
- **Database** says market is `"disputable"`
- **Contract** says market is `Open` (1), not `PendingResolution` (2)
- **Result**: DisputeManager rejects disputes with "Market not in disputable state"

### Problem 2: **Missing AI Resolution Step**
- Markets expire (`endTime` passes)
- **Database** gets updated to `"disputable"` status
- **Contract** is NEVER updated - still shows `Open` (1)
- AI never calls `preliminaryResolve()` on the contract
- No dispute window actually exists on-chain

### Problem 3: **Resolution Service Doesn't Call Blockchain**
- `resolutionService.ts` lines 406-509: `preliminaryResolveMarket()`
- Only updates **database**, not the blockchain contract
- Contract state remains unchanged

### Problem 4: **UI Shows Fake "Disputable" Status**
- MarketPage.tsx line 301-315: `isMarketDisputable()` checks database status
- But contract hasn't been preliminarily resolved
- Users see "submit evidence" button but transactions fail

---

## ✅ CORRECT MARKET LIFECYCLE (What It Should Be)

```
1. MARKET CREATION ✅ (WORKS - DON'T TOUCH)
   Contract: Submited → (admin approves) → Open
   Database: Created → active
   Action: Users place bets

2. MARKET EXPIRATION
   Contract: Open (endTime passes but status unchanged)
   Database: active
   Action: Betting automatically disabled (UI checks endTime)

3. AI PRELIMINARY RESOLUTION (⚠️ BROKEN - FIX THIS)
   Contract: Open → PendingResolution via preliminaryResolve(outcome)
   Database: active → disputable
   Action: 7-day dispute window opens
   Blockchain Events: PreliminaryResolution(outcome, timestamp) emitted

4. DISPUTE PERIOD (⚠️ BROKEN - FIX THIS)
   Contract: PendingResolution (users can submit disputes to DisputeManager)
   Database: disputable
   Action: Users submit evidence/disputes
   Duration: 168 hours (7 days) from preliminary resolution

5. FINAL RESOLUTION (⚠️ BROKEN - FIX THIS)
   Contract: PendingResolution → Resolved via finalResolve(outcome, confidence)
   Database: disputable → resolved
   Action: Payouts become available
   Blockchain Events: FinalResolution(outcome, confidence, timestamp) emitted
   Trigger: Either (a) 7 days pass with no disputes OR (b) Admin resolves disputes

6. PAYOUT ✅ (SHOULD WORK ONCE #5 FIXED)
   Contract: Resolved (users call redeem())
   Database: resolved
   Action: Winners claim their winnings
```

---

## 🎯 REALIGNMENT PLAN

### Phase 1: Fix AI Resolution Service (Critical)

**File**: `src/utils/resolutionService.ts`

**Changes Needed:**

1. **`preliminaryResolveMarket()` (lines 406-509)**
   - ✅ Already tries to call contract (lines 435-462)
   - ❌ But fails silently and continues
   - **FIX**: Make contract call mandatory, fail loudly if it doesn't work
   - **FIX**: Use admin signer, not user's MetaMask

2. **`finalResolveMarket()` (lines 512-576)**
   - ❌ Contract call is TODO/commented out (lines 524-529)
   - **FIX**: Implement actual contract call to `finalResolve(outcome, confidence)`

3. **Add Automated Resolution Monitor**
   - Check markets where `endTime` has passed
   - Automatically call `preliminaryResolveMarket()` with AI outcome
   - Start 7-day dispute countdown

### Phase 2: Fix Market Monitor Service

**File**: `src/services/marketMonitorService.ts`

**Add**: Automatic preliminary resolution when markets expire
```typescript
async monitorExpiringMarkets() {
  const now = new Date();
  const expiredMarkets = await getMarketsWhereEndTimePassedButStillOpen();

  for (const market of expiredMarkets) {
    // Get AI resolution
    const aiOutcome = await getAIResolution(market);

    // Call contract preliminaryResolve()
    await resolutionService.preliminaryResolveMarket(market.id, aiOutcome, adminAddress);
  }
}
```

### Phase 3: Fix UI State Checks

**File**: `src/components/MarketPage.tsx`

**Line 301-315**: `isMarketDisputable()`
- ❌ Currently checks database status
- **FIX**: Query blockchain contract `isPendingResolution()` instead
- **FIX**: Check if current time < dispute period end

**File**: `src/components/BettingMarkets.tsx`

**Lines 132-133**: Market status filtering
- ❌ Checks database status
- **FIX**: Add blockchain state verification

### Phase 4: Create Admin Resolution Panel

**New File**: `src/components/admin/ResolutionMonitorPanel.tsx`

**Features:**
- List all markets where `endTime` passed
- Show contract state vs database state mismatches
- Manual trigger for preliminary resolution
- Manual trigger for final resolution (after dispute period)
- View active disputes

### Phase 5: Database Schema Updates

**Table**: `approved_markets`

**Add columns:**
- `contract_status` (int) - Mirror the blockchain enum (0-4)
- `preliminary_resolve_time` (timestamp) - When AI resolved
- `dispute_period_end_contract` (timestamp) - From blockchain, not calculated

**Migration**: Sync existing markets with actual contract states

### Phase 6: DisputeManager Integration

**File**: `src/utils/disputeManagerService.ts`

**Current**: ✅ Already correct (checks `isPendingResolution()`)

**Verify**: Evidence submission flow works once contracts are in correct state

---

## 📋 STEP-BY-STEP IMPLEMENTATION ORDER

### Step 1: Create Admin Signer Configuration
**Why first**: Need admin wallet to call contract functions

1. Add admin private key to .env
2. Create `src/utils/adminSigner.ts` to manage admin wallet
3. Use in resolutionService for all contract calls

### Step 2: Fix `preliminaryResolveMarket()`
**Why second**: Establishes the dispute period on-chain

1. Remove silent failures in contract call
2. Use admin signer instead of user wallet
3. Add proper error handling & logging
4. Verify PreliminaryResolution event is emitted

### Step 3: Implement `finalResolveMarket()`
**Why third**: Completes the resolution flow

1. Implement actual contract call to `finalResolve(outcome, confidence)`
2. Use admin signer
3. Update database after successful blockchain tx
4. Verify FinalResolution event is emitted

### Step 4: Create Automated Monitor
**Why fourth**: Ensures markets resolve automatically

1. Create scheduled job (every 5 minutes)
2. Find expired markets still in "Open" state
3. Call AI resolution service
4. Call `preliminaryResolveMarket()` with AI outcome

### Step 5: Create Dispute Period Monitor
**Why fifth**: Handles auto-finalization

1. Create scheduled job (every hour)
2. Find markets in PendingResolution where dispute period ended
3. Check if there are active disputes
4. If no disputes: call `finalResolveMarket()` with AI outcome
5. If disputes exist: flag for admin review

### Step 6: Fix UI State Checks
**Why sixth**: Users see accurate state

1. Update `isMarketDisputable()` to query blockchain
2. Add loading states while querying contract
3. Show actual contract status to users
4. Disable dispute submission if contract says not disputable

### Step 7: Add Admin Dashboard Panel
**Why seventh**: Manual controls for edge cases

1. Create ResolutionMonitorPanel component
2. Show markets needing preliminary resolution
3. Show markets needing final resolution
4. Allow manual triggering of both steps
5. Show contract state vs database state for debugging

### Step 8: Database Sync & Migration
**Why eighth**: Clean up historical data

1. Add new columns to schema
2. Query all existing market contracts
3. Sync contract states to database
4. Update any incorrect statuses

### Step 9: Testing & Validation
**Why last**: Verify everything works

1. Create test market
2. Wait for expiration
3. Verify auto preliminary resolution
4. Submit test dispute
5. Wait for dispute period end
6. Verify auto final resolution
7. Test payout redemption

---

## 🚨 CRITICAL FILES TO MODIFY

1. ✅ **src/utils/resolutionService.ts** - Core resolution logic
2. ✅ **src/services/marketMonitorService.ts** - Automated monitoring
3. ✅ **src/components/MarketPage.tsx** - UI state checks
4. ✅ **src/components/BettingMarkets.tsx** - Market list filtering
5. **🆕 src/utils/adminSigner.ts** - Admin wallet management
6. **🆕 src/components/admin/ResolutionMonitorPanel.tsx** - Admin controls
7. **🆕 database/migrations/add_contract_state_sync.sql** - Schema updates

---

## ⚙️ CONFIGURATION NEEDED

### Environment Variables (.env)
```bash
# Admin wallet for contract calls
VITE_ADMIN_PRIVATE_KEY=0x...
VITE_ADMIN_ADDRESS=0x...

# Resolution automation
VITE_AUTO_RESOLVE_ENABLED=true
VITE_DISPUTE_PERIOD_HOURS=168  # 7 days
```

### Constants (src/config/constants.ts)
```typescript
export const RESOLUTION = {
  AUTO_RESOLVE_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  DISPUTE_CHECK_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  DISPUTE_PERIOD_HOURS: 168, // 7 days
  AI_CONFIDENCE_THRESHOLD: 0.7, // Minimum for auto-resolution
};
```

---

## 🎪 TESTING CHECKLIST

- [ ] Market expires → Auto preliminary resolution happens within 5 min
- [ ] Contract emits PreliminaryResolution event
- [ ] Database status changes to "disputable"
- [ ] UI shows "Submit Evidence" button
- [ ] User can submit dispute (DisputeManager accepts it)
- [ ] 7 days pass → Auto final resolution happens
- [ ] Contract emits FinalResolution event
- [ ] Database status changes to "resolved"
- [ ] Winners can call redeem() and get payouts
- [ ] Contract state matches database state throughout
- [ ] Admin panel shows accurate real-time status

---

**This plan ensures blockchain is the source of truth, not the database.**
