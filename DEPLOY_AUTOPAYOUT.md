# 🚀 Auto-Payout Deployment Guide

## ✅ What Changed

### Smart Contract Updates (PredictionMarket.sol)

1. **Participant Tracking** - Added arrays to track all YES/NO participants
2. **Auto-Distribution** - Winnings automatically sent during resolution
3. **Deprecated redeem()** - Manual claim function removed (auto-payout replaces it)

### Benefits

- ✅ Winners receive CAST instantly when market resolves
- ✅ No "Claim" button needed in UI
- ✅ Better UX (money appears automatically)
- ⚠️ Platform pays gas (~$0.50-$5 per market)

---

## 📋 Deployment Steps

### Option 1: Quick Deploy (Using existing build system)

```bash
# If hardhat works for you:
npx hardhat compile
node deploy-autopayout.mjs
```

### Option 2: Manual Compilation (If Hardhat fails)

Since Hardhat has ESM issues, here's the manual approach:

#### Step 1: Delete old artifacts
```bash
rm -rf artifacts/contracts/PredictionMarket.sol
rm -rf artifacts/contracts/PredictionMarketFactory.sol
```

#### Step 2: Install solc-js (if not installed)
```bash
npm install solc@0.8.20 --save-dev
```

#### Step 3: Compile manually
Create a file `compile-manual.mjs`:

```javascript
import solc from 'solc';
import fs from 'fs';
import path from 'path';

// Read source files
const predictionMarketSource = fs.readFileSync('contracts/PredictionMarket.sol', 'utf8');
const factorySource = fs.readFileSync('contracts/PredictionMarketFactory.sol', 'utf8');
const adminManagerSource = fs.readFileSync('contracts/AdminManager.sol', 'utf8');
const treasurySource = fs.readFileSync('contracts/Treasury.sol', 'utf8');
const betNFTSource = fs.readFileSync('contracts/BetNFT.sol', 'utf8');

// Import resolver for OpenZeppelin contracts
function findImports(importPath) {
  try {
    const fullPath = path.join('node_modules', importPath);
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch (e) {
    return { error: 'File not found' };
  }
}

const input = {
  language: 'Solidity',
  sources: {
    'PredictionMarket.sol': { content: predictionMarketSource },
    'PredictionMarketFactory.sol': { content: factorySource },
    'AdminManager.sol': { content: adminManagerSource },
    'Treasury.sol': { content: treasurySource },
    'BetNFT.sol': { content: betNFTSource },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    }
  }
};

console.log('🔧 Compiling contracts...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  output.errors.forEach(err => {
    if (err.severity === 'error') {
      console.error('❌', err.formattedMessage);
    } else {
      console.warn('⚠️', err.formattedMessage);
    }
  });

  const hasErrors = output.errors.some(err => err.severity === 'error');
  if (hasErrors) {
    console.log('\n❌ Compilation failed!');
    process.exit(1);
  }
}

// Save artifacts
fs.mkdirSync('artifacts/contracts/PredictionMarket.sol', { recursive: true });
fs.mkdirSync('artifacts/contracts/PredictionMarketFactory.sol', { recursive: true });

const marketContract = output.contracts['PredictionMarket.sol']['PredictionMarket'];
const factoryContract = output.contracts['PredictionMarketFactory.sol']['PredictionMarketFactory'];

fs.writeFileSync(
  'artifacts/contracts/PredictionMarket.sol/PredictionMarket.json',
  JSON.stringify({
    abi: marketContract.abi,
    bytecode: marketContract.evm.bytecode.object
  }, null, 2)
);

fs.writeFileSync(
  'artifacts/contracts/PredictionMarketFactory.sol/PredictionMarketFactory.json',
  JSON.stringify({
    abi: factoryContract.abi,
    bytecode: factoryContract.evm.bytecode.object
  }, null, 2)
);

console.log('✅ Compilation successful!');
console.log('📦 Artifacts saved to artifacts/contracts/');
```

Then run:
```bash
node compile-manual.mjs
```

#### Step 4: Deploy
```bash
node deploy-autopayout.mjs
```

### Step 5: Update .env

Copy the new factory address from the deployment output and update `.env`:

```bash
VITE_FACTORY_ADDRESS=0x[NEW_FACTORY_ADDRESS]
```

---

## 🧪 Testing Auto-Payout

### Test Scenario

1. Create a test market
2. Place bets from 2 different wallets (YES and NO)
3. Wait for market to expire
4. Resolve market with AI
5. **Check winner's wallet** - CAST should appear automatically!
6. No "Claim" button needed

### Verification

```bash
# Check winner's CAST balance before resolution
# Then after resolution
# Balance should increase automatically
```

---

## ⚠️ Important Notes

### Gas Costs

- Platform pays gas for ALL winners
- Small market (2-5 winners): ~$0.50
- Medium market (10-20 winners): ~$1-2
- Large market (50+ winners): ~$5-10

### UI Changes Needed

After deployment, update UI to show:
- ✅ "You won X CAST! (Already in your wallet)"
- ❌ Remove "Claim Winnings" button
- ✅ Show transaction history of auto-payouts

---

## 🐛 Troubleshooting

### "Out of gas" error during resolution

If market has too many winners (>100), transaction may fail. Solutions:
1. Batch payouts (process 50 winners at a time)
2. Increase gas limit in admin wallet
3. Wait and retry

### Hardhat compilation fails

Use manual compilation (Option 2 above) with `solc-js` directly.

### Old markets still show "Claim" button

This is expected. Only NEW markets (created with new factory) will have auto-payout.

---

## 📊 Next Steps

1. ✅ Deploy new factory
2. ✅ Update `.env` with new factory address
3. ✅ Test with small market
4. ✅ Update UI (remove claim buttons, show auto-payout status)
5. ✅ Add burn stats to admin panel

---

Questions? Check the contract at `contracts/PredictionMarket.sol` lines 327-364 for auto-payout logic.
