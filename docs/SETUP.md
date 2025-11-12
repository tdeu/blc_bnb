# BlockCast Setup Guide

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- MetaMask wallet with Hedera testnet configured
- Anthropic API key - [Get one here](https://console.anthropic.com/)

### Step 1: Install

```bash
git clone <repository-url>
cd blockcast_new
npm install
```

### Step 2: Configure Environment

Create a `.env` file in the root directory:

```bash
# REQUIRED - AI Analysis
ANTHROPIC_API_KEY=sk-ant-api03-...YOUR_KEY

# REQUIRED - Database
VITE_SUPABASE_URL=<provided-url>
VITE_SUPABASE_ANON_KEY=<provided-key>

# REQUIRED - Hedera Account
HEDERA_ACCOUNT_ID=0.0.YOUR_TESTNET_ACCOUNT
HEDERA_PRIVATE_KEY=0x...YOUR_KEY
VITE_HEDERA_PRIVATE_KEY_EVM=0x...YOUR_EVM_KEY

# OPTIONAL - Enhanced Features
VITE_PERPLEXITY_API_KEY=pplx-...    # Real-time web search
VITE_NEWS_API_KEY=...                # News verification

# CONTRACTS (Pre-deployed - copy as-is)
CONTRACT_PREDICTION_MARKET_FACTORY=0xD2092162aD3A392686A6B0e5dFC0d34c953c221D
CONTRACT_CAST_TOKEN=0xC78Ac73844077917E20530E36ac935c4B56236c2
CONTRACT_BET_NFT=0x8e718596977C0BE525c5b1afeA73d9eFdF9bB7ca
CONTRACT_ADMIN_MANAGER=0x94FAF61DE192D1A441215bF3f7C318c236974959
CONTRACT_TREASURY=0x69649cc208138B3A2c529cB301D7Bb591C53a2e2
CONTRACT_DISPUTE_MANAGER=0xCB8B4E630dFf7803055199A75969a25e7Ec48f39
VITE_ADMIN_PRIVATE_KEY=0x...ADMIN_KEY

# HCS Topics
HCS_EVIDENCE_TOPIC=0.0.6701034
HCS_AI_ATTESTATION_TOPIC=0.0.6701035
HCS_CHALLENGES_TOPIC=0.0.6701036
```

### Step 3: Start the Platform

**Option A: Full System (Recommended)**
```bash
npm run start:all
# Starts: Frontend (3000) + AI Proxy (3001) + Market Monitor (3002)
```

**Option B: Basic System**
```bash
npm start
# Starts: Frontend (3000) + AI Proxy (3001)
```

**Option C: Individual Services**
```bash
npm run server    # AI Proxy Server (port 3001)
npm run monitor   # Market Monitor (port 3002)
npm run dev       # Frontend (port 3000)
```

### Step 4: Try the Platform

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Connect Wallet**: Click "Connect" and link MetaMask
3. **Place a Bet**: Browse markets → Choose YES/NO → Approve CAST → Confirm
4. **View TX**: Check transaction on [HashScan](https://hashscan.io/testnet)

## Available Scripts

### Core Services
```bash
npm start              # Launch AI Proxy + Frontend
npm run start:all      # Launch full system (3 services)
npm run dev            # Frontend only
npm run build          # Build production frontend
npm run server         # AI proxy (port 3001)
npm run monitor        # Market monitor (port 3002)
```

### Testing & Validation
```bash
npm run test:hedera           # Test Hedera connectivity
npm run test:ai-agent         # Test AI integration
npm run create:test-market    # Create test market
npm run monitor:tick          # Manual monitor trigger
```

### Blockchain Operations
```bash
npm run deploy:hedera      # Deploy smart contracts
npm run setup:hcs          # Create HCS topics
npm run setup:resolution   # Configure resolution
```

## Windows Setup

BlockCast uses Windows-native batch files for easy service management.

### Batch Files

**start.bat** - Basic Setup
- Launches: AI Proxy + Frontend
- Double-click or run: `npm start`

**start-all.bat** - Full System
- Launches: AI Proxy + Monitor + Frontend
- Double-click or run: `npm run start:all`

## MetaMask Configuration

### Add Hedera Testnet

1. Open MetaMask → Networks → Add Network
2. Enter details:
   - **Network Name**: Hedera Testnet
   - **RPC URL**: `https://testnet.hashio.io/api`
   - **Chain ID**: 296
   - **Currency Symbol**: HBAR
   - **Block Explorer**: `https://hashscan.io/testnet`

### Get Testnet HBAR

1. Create account at [Hedera Portal](https://portal.hedera.com/)
2. Fund with testnet HBAR (free)
3. Export private key to `.env`

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
