# Market Creation & Display Fixes

**Date**: November 11, 2025
**Status**: NaN error fixed ✅ | Market display issue under investigation 🔍

---

## 🐛 Issue 1: Market Creation NaN Error - FIXED ✅

### Error Message:
```
Market creation failed: underflow (argument="value", value=NaN, code=INVALID_ARGUMENT, version=6.15.0)
```

### Root Cause:
The factory service was trying to convert a non-existent property to a Date:
```typescript
// ❌ WRONG - marketData.expirationDate doesn't exist
endTime: new Date(marketData.expirationDate)

// This resulted in:
new Date(undefined) → Invalid Date → NaN
Math.floor(NaN / 1000) → NaN
// Then NaN was passed to the smart contract's uint256 parameter → underflow error
```

### Fix Applied:
**File**: `src/App.tsx` (line 1210)

```typescript
// BEFORE:
const result = await factoryService.createMarket({
  question: marketData.claim,
  endTime: new Date(marketData.expirationDate), // ❌ Wrong property
  category: marketData.category || 'General',
  allowEarlyResolution: false
});

// AFTER:
const result = await factoryService.createMarket({
  question: marketData.claim || newMarket.claim,
  endTime: newMarket.expiresAt, // ✅ Correct property (already a Date object)
  category: marketData.category || 'General',
  allowEarlyResolution: false
});
```

### Why This Works:
- `newMarket.expiresAt` is already a valid `Date` object (created earlier in the code)
- No need to wrap it in `new Date()` again
- The factory service will correctly convert it to Unix timestamp

### Status:
- ✅ Fix applied at 16:28:00
- ✅ Hot module reload confirmed
- ⏳ Ready for testing on Brave browser

---

## 🐛 Issue 2: "No markets available" on Chrome - INVESTIGATING 🔍

### Symptoms:
- Chrome shows: "No markets available" (yellow background)
- Brave shows: Normal page with markets list

### Root Cause Analysis:

**How Markets Are Loaded** (App.tsx line 713-763):

```typescript
const loadApprovedMarkets = async () => {
  try {
    // 1. Load from Supabase (permanent storage)
    const supabaseMarkets = await approvedMarketsService.getApprovedMarkets();

    // 2. Load from localStorage (for backward compatibility)
    const localApprovedMarkets = pendingMarketsService.getApprovedMarkets();

    // 3. Combine both sources, avoiding duplicates
    const allApprovedMarkets = [...supabaseMarkets];
    localApprovedMarkets.forEach(localMarket => {
      if (!supabaseMarkets.find(m => m.id === localMarket.id)) {
        allApprovedMarkets.push(localMarket);
      }
    });

    // 4. Update markets state
    setMarkets(currentMarkets => {
      const existingIds = new Set(currentMarkets.map(m => m.id));
      const newApprovedMarkets = allApprovedMarkets.filter(m => !existingIds.has(m.id));

      if (newApprovedMarkets.length > 0) {
        console.log(`🎉 Adding ${newApprovedMarkets.length} approved markets`);
        return [...currentMarkets, ...newApprovedMarkets];
      }

      return currentMarkets; // ⚠️ If no new markets, returns empty array
    });
  } catch (error) {
    console.error('Error loading approved markets:', error);
  }
};
```

### Possible Causes:

1. **Supabase Query Failing**
   - Network error
   - Incorrect credentials
   - Table doesn't exist
   - No approved markets in database

2. **localStorage Differences**
   - Chrome and Brave use separate localStorage
   - Brave may have markets from previous testing
   - Chrome may have been cleared or never had markets

3. **Timing Issue**
   - Markets load asynchronously
   - Chrome may be rendering before data loads
   - React state update may not trigger re-render

4. **Browser Cache/CORS**
   - Chrome may have different CORS policies
   - Service worker differences
   - Cache differences

### Debug Steps to Try:

#### Step 1: Check Browser Console (Chrome)
```javascript
// In Chrome DevTools Console (F12):
localStorage.getItem('blockcast_approved_markets')
localStorage.getItem('blockcast_pending_markets')
```

Expected: Should return JSON string or null

#### Step 2: Check Supabase Connection
```javascript
// In Console:
// Check if error messages appear related to Supabase
```

#### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter: `supabase`
3. Look for failed requests

#### Step 4: Compare Brave vs Chrome
```javascript
// In Brave Console:
localStorage.getItem('blockcast_approved_markets')

// Compare with Chrome's output
```

### Temporary Workaround:

If user needs to test market creation urgently, they can:

1. **Use Brave** (which is working)
2. **Add mock data to Chrome localStorage**:
```javascript
// In Chrome Console:
localStorage.setItem('blockcast_approved_markets', localStorage.getItem('blockcast_approved_markets') || '[]');
```

3. **Create a new market** - which should then appear

---

## 📊 Current Architecture

### Market Data Flow:

```
User creates market
    ↓
CreateMarket.tsx (form submission)
    ↓
App.tsx handleCreateMarket()
    ↓
factoryService.createMarket() → BSC Testnet
    ↓
├─ Transaction sent to blockchain
├─ Wait for confirmation
├─ Extract market address from event
└─ Return { success, marketAddress, transactionHash }
    ↓
pendingMarketsService.addMarket() → localStorage
    ↓
adminService (auto-approve for now)
    ↓
approvedMarketsService.addMarket() → Supabase
    ↓
setMarkets() → React state
    ↓
BettingMarkets component renders
```

### Storage Locations:

1. **BSC Blockchain** (permanent, immutable)
   - Smart contract at factory-created address
   - Market parameters, bets, outcomes

2. **Supabase Database** (permanent, queryable)
   - Table: `approved_markets`
   - Full market metadata, images, evidence

3. **localStorage** (browser-specific, temporary)
   - Key: `blockcast_approved_markets`
   - Key: `blockcast_pending_markets`
   - Fallback if Supabase fails

### Why Chrome Shows "No markets":

The component renders when `markets.length === 0`:

```typescript
// App.tsx line 1348-1349
if (!markets || markets.length === 0) {
  return <div>No markets available</div>;
}
```

This happens when:
- `loadApprovedMarkets()` returns 0 markets from both Supabase and localStorage
- Initial state is empty array: `useState<BettingMarket[]>([])`
- No markets have been approved/created yet

---

## 🧪 Testing Checklist

### Before Testing:
- [x] NaN error fixed
- [x] HMR updated
- [x] Dev server running on port 3002
- [ ] Chrome DevTools console open
- [ ] Network tab open

### Test 1: Market Creation (Brave)
1. Open http://localhost:3002 in **Brave**
2. Click "Create Market" or "Truth Markets" → "+"
3. Fill in form:
   - Question: "Will Bitcoin reach $100k by end of 2025?"
   - Category: Crypto
   - End date: Future date
   - (Image upload optional)
4. Click "Create Market"
5. **Expected**:
   - MetaMask prompts for transaction
   - "Sending transaction to BSC..." toast
   - "Waiting for confirmation..." toast
   - "✅ Market created and deployed to BSC!" toast
   - Shows contract address and BSCScan link
6. **Check Console** for:
   - ✅ No NaN errors
   - ✅ Market address logged
   - ✅ Transaction hash logged

### Test 2: Verify Market Appears
1. After market creation succeeds
2. Navigate to "Markets" tab
3. **Expected**: New market appears in list
4. **Check**:
   - Market title matches
   - Category badge visible
   - End date displayed
   - "View Market" button works

### Test 3: Chrome Market Display
1. Open http://localhost:3002 in **Chrome**
2. Open DevTools Console (F12)
3. Run: `localStorage.getItem('blockcast_approved_markets')`
4. **Expected**: JSON string with markets array
5. **If null/empty**:
   - Check Supabase connection
   - Check console for errors
   - Try creating a market in Chrome

---

## 🎯 Next Steps

### Immediate (5 minutes):
1. Test market creation in **Brave** (NaN fix should work)
2. Check if market appears after creation
3. Verify BSCScan link works

### Debug Chrome Issue (10 minutes):
1. Open Chrome DevTools
2. Check localStorage keys
3. Check Supabase network requests
4. Compare with Brave's localStorage

### If Chrome Issue Persists:
1. Create market in Brave
2. Export localStorage from Brave:
   ```javascript
   JSON.parse(localStorage.getItem('blockcast_approved_markets'))
   ```
3. Import to Chrome:
   ```javascript
   localStorage.setItem('blockcast_approved_markets', 'PASTE_JSON_HERE')
   ```
4. Refresh Chrome

---

## 📝 Files Changed

### App.tsx
- **Line 1210**: Fixed `endTime` parameter
- **Change**: `new Date(marketData.expirationDate)` → `newMarket.expiresAt`
- **Impact**: Fixes NaN underflow error

### No Other Changes Needed
- factoryService.ts - Already correct
- CreateMarket.tsx - Already correct
- walletService.ts - Already fixed
- evidenceService.ts - Already fixed

---

## 🚀 Ready for Testing!

**What's Working**:
- ✅ Wallet connection (BSC Testnet)
- ✅ Factory service integration
- ✅ Market creation transaction logic
- ✅ BSCScan link generation
- ✅ NaN error fixed

**What to Test**:
1. Market creation in Brave (should work now!)
2. Transaction confirmation
3. Market appears in list
4. Chrome market display issue

**If You See**:
- ✅ "Market created and deployed to BSC!" → SUCCESS!
- ✅ BSCScan link → Click to verify transaction
- ❌ Any error → Share console output

---

## 💡 Pro Tips

### View Transaction on BSCScan:
After creating market, click the "View on BSCScan" link to see:
- Transaction details
- Gas used
- Contract creation event
- Market contract address

### Check Market Contract:
1. Copy market contract address from toast
2. Visit: `https://testnet.bscscan.com/address/YOUR_ADDRESS`
3. Should show:
   - Contract code
   - Transactions
   - Events emitted

### Debug Console:
```javascript
// Check all markets
window.localStorage.getItem('blockcast_approved_markets')

// Check market contracts
window.marketContracts

// Force reload markets
window.location.reload()
```

---

**Status**: Ready for testing! The NaN error is fixed. Please test market creation in Brave first, then we'll debug the Chrome display issue. 🎉
