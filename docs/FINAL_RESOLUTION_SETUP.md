# Final Resolution Executor - Setup & Testing Guide

## 🎯 What This Does

The **Final Resolution Executor** automatically executes the final resolution of prediction markets after the 7-day dispute period ends. It also handles refunding markets that never reached the 80% confidence threshold.

## 📋 Prerequisites

Before running the final resolution executor, ensure you have:

1. ✅ Database migration applied
2. ✅ Admin wallet with HBAR balance
3. ✅ Market monitor service configured
4. ✅ At least one market in `pending_resolution` status (for testing)

## 🚀 Step 1: Apply Database Migration

Run the migration to add resolution tracking columns:

```bash
# Connect to your Supabase project and run this SQL:
psql -h your-supabase-host -d postgres -f database/final-resolution-tracking-migration.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `database/final-resolution-tracking-migration.sql`
3. Click "Run"

Expected columns added:
- `preliminary_resolve_time` - When preliminaryResolve() was called
- `final_resolve_time` - When finalResolve() was called
- `resolution_tx_hash` - Blockchain transaction hash
- `final_outcome` - Final outcome (yes/no/refunded)
- `refund_reason` - Reason if refunded

## 🛠️ Step 2: Configure Environment

Add to your `.env` file:

```bash
# Start in DRY-RUN mode (safe testing, no blockchain transactions)
FINAL_RESOLUTION_DRY_RUN=true

# Your admin account (must match AdminManager contract)
HEDERA_ACCOUNT_ID=0.0.your-admin-account
HEDERA_PRIVATE_KEY=0x-your-admin-private-key
VITE_HEDERA_PRIVATE_KEY_EVM=0x-your-admin-private-key-evm

# Monitor service port
MONITOR_PORT=3002
```

## ✅ Step 3: Test in DRY-RUN Mode (IMPORTANT!)

DRY-RUN mode logs everything but **does NOT execute blockchain transactions**. This is perfect for testing.

### Start the Monitor Service

```bash
npm run monitor
```

You should see:
```
🚀 BlockCast Market Monitor Server running on port 3002
⚠️ Final Resolution Executor running in DRY-RUN mode
   Set FINAL_RESOLUTION_DRY_RUN=false in .env to enable live mode
⚖️ Final Resolution Executor: DRY-RUN mode
```

### Test Manual Execution

```bash
# Terminal 1: Monitor service is running

# Terminal 2: Trigger final resolution check manually
curl -X POST http://localhost:3002/run-final-resolution
```

Expected output (DRY-RUN):
```json
{
  "success": true,
  "executed": 1,
  "successful": 1,
  "failed": 0,
  "mode": "DRY-RUN",
  "results": [
    {
      "success": true,
      "marketId": "market-123",
      "action": "final_resolve",
      "transactionHash": "DRY_RUN_TX_HASH",
      "reason": "Dry-run mode - no actual blockchain transaction"
    }
  ]
}
```

### Check the Logs

Monitor service logs will show:
```
🔍 [FinalResolutionExecutor] Starting final resolution check...
📊 Found 1 markets ready for final resolution
⚖️ Processing final resolution for market market-123...
   Outcome: YES, Confidence: 85%
🏃 [DRY-RUN] Would execute finalResolve(yes, 85) on 0xMarketAddress
✅ Market market-123 finally resolved successfully
✅ [FinalResolutionExecutor] Completed: 1 successful, 0 failed
```

## 🔥 Step 4: Enable LIVE Mode (Production)

**ONLY after testing in DRY-RUN mode**, enable live execution:

```bash
# .env file
FINAL_RESOLUTION_DRY_RUN=false
```

Restart the monitor service:
```bash
npm run monitor
```

You should see:
```
⚖️ Final Resolution Executor: LIVE mode
```

Now when markets are ready, real blockchain transactions will be executed!

## 📊 Monitoring & Operations

### Check Service Health

```bash
curl http://localhost:3002/health
```

### Manual Trigger (Both Preliminary + Final)

```bash
curl -X POST http://localhost:3002/run-once
```

### Manual Trigger (Final Resolution Only)

```bash
curl -X POST http://localhost:3002/run-final-resolution
```

### Check Status

```bash
curl http://localhost:3002/status
```

## 🧪 Testing Scenarios

### Scenario 1: Normal Final Resolution

**Setup:**
1. Create a market
2. Let it expire (or manually advance time in DB)
3. Admin calls `preliminaryResolve()` via UI
4. Wait 7 days (or manually set `preliminary_resolve_time` to 7+ days ago)
5. Run final resolution executor

**Expected Result:**
- Executor detects market ready for final resolution
- Calls `finalResolve()` on smart contract
- Updates database with `resolved` status and transaction hash
- Users can now claim winnings

### Scenario 2: Refund Path (Low Confidence)

**Setup:**
1. Create a market with low-quality evidence
2. Let it reach 30+ days in evidence period
3. AI confidence stays below 80%
4. Run final resolution executor

**Expected Result:**
- Executor detects market eligible for refund
- Calls `refundAllBets()` on smart contract
- Updates database with `refunded` status
- Users can claim refunds

### Scenario 3: Mixed Batch

**Setup:**
1. Have 2 markets in `pending_resolution` (7+ days dispute period)
2. Have 1 market eligible for refund (30+ days, <80% confidence)
3. Run final resolution executor

**Expected Result:**
```json
{
  "executed": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    { "action": "final_resolve", "marketId": "market-1" },
    { "action": "final_resolve", "marketId": "market-2" },
    { "action": "refund", "marketId": "market-3" }
  ]
}
```

## 📝 Configuration

All timing thresholds are in `src/config/resolutionConfig.ts`:

```typescript
timingThresholds: {
  disputePeriodDays: 7,         // Dispute period after preliminary resolution
  maxEvidencePeriodDays: 30,    // Max days before refund eligibility
  minConfidenceThreshold: 80    // Minimum confidence % to resolve
}
```

To change these values, edit `resolutionConfig.ts` and restart the service.

## 🚨 Troubleshooting

### "No markets ready for final resolution"

**Check:**
1. Markets are in `pending_resolution` status: `SELECT * FROM approved_markets WHERE status = 'pending_resolution';`
2. `preliminary_resolve_time` is set and >7 days old
3. Monitor service is running

### "Transaction failed: Not authorized"

**Fix:**
- Ensure your HEDERA account is registered as admin in AdminManager contract
- Check wallet balance (need HBAR for gas)

### "Database update failed"

**Fix:**
- Ensure database migration was applied
- Check Supabase connection in .env

### Markets not auto-resolving

**Check:**
1. Monitor service is running: `curl http://localhost:3002/health`
2. DRY-RUN mode is disabled: `FINAL_RESOLUTION_DRY_RUN=false`
3. Check logs for errors

## 📚 Architecture

### Flow Diagram

```
Market Expires
    ↓
Status: 'disputable'
    ↓
Evidence Period (min 7 days)
    ↓
Admin calls preliminaryResolve() ← (Manual via UI)
    ↓
Status: 'pending_resolution'
preliminary_resolve_time set
    ↓
7-Day Dispute Period
    ↓
[FinalResolutionExecutor runs] ← (Automatic)
    ↓
Checks: preliminary_resolve_time + 7 days < NOW
    ↓
Calls finalResolve() on smart contract
    ↓
Status: 'resolved'
final_resolve_time set
resolution_tx_hash recorded
    ↓
Users claim winnings
```

### Refund Path

```
Market expires + Evidence Period >30 days + Confidence <80%
    ↓
[FinalResolutionExecutor detects]
    ↓
Calls refundAllBets() on smart contract
    ↓
Status: 'refunded'
refunded = true
refund_tx_hash recorded
    ↓
Users claim refunds
```

## 🔐 Security Notes

- Executor uses admin wallet - keep private keys secure
- DRY-RUN mode is safe - no blockchain transactions
- Always test in DRY-RUN mode first
- Monitor logs for any errors or unauthorized access attempts

## 🎉 Success Checklist

- [ ] Database migration applied successfully
- [ ] Environment variables configured
- [ ] Service starts in DRY-RUN mode
- [ ] Manual trigger works in DRY-RUN mode
- [ ] Logs show correct behavior
- [ ] Test market resolves correctly in DRY-RUN
- [ ] Switch to LIVE mode
- [ ] Real market resolves successfully
- [ ] Transaction appears on HashScan
- [ ] Database updated with tx hash

## 📞 Support

If you encounter issues:
1. Check logs: `tail -f logs/market-monitor.log`
2. Verify database columns exist
3. Test smart contract functions directly via Hardhat
4. Check admin authorization in AdminManager contract

---

**Remember**: Always start with DRY-RUN mode! 🧪
