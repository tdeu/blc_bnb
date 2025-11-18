# BlockCast - AI-Powered Prediction Markets on BNB Chain

> **🏆 Seedify x BNB Chain Prediction Markets Hackathon 2025**
>
> **54 million African crypto users. Zero access to prediction markets. Until now.**
>
> Live demo: https://blc-bnb.vercel.app/

> Video demo: https://youtu.be/n4-4Ci-vhlQ


---

## The Problem: Cost Barriers Exclude Growing Markets

African crypto adoption is exploding. Nigeria alone processed **$59 billion in crypto volume** (2023-2024), and Sub-Saharan Africa hit **$205 billion in on-chain value** with 52% YoY growth. But prediction markets? Completely inaccessible.

**Why African users are locked out:**

| Platform | Cost Per Trade | Resolution Cost | Target User |
|----------|----------------|-----------------|-------------|
| **Polymarket** (Polygon) | $3-9 | $50-300 (UMA Oracle) | $100+ bettors |
| **Ethereum Markets** | $65-350 | $500+ | Crypto whales only |
| **African Reality** | **$1-5 trades** | **Need <$1 overhead** | **54M crypto users** |

**The math doesn't work.** When 84% of African transactions are mobile-based and average bet size is $1-10, traditional platforms charge more in fees than the actual bet.

Traditional oracles (UMA, Chainlink) cost **$50-500 per market resolution**. That's viable for "$100M election markets" but kills "Will BNB hit $700?" or "Will Team X win the match?" niche markets.

---

## Our Solution: AI Oracle + BNB Chain = 100x Cost Reduction

BlockCast slashes resolution costs from **$500 to $0.02** using dual-AI verification (Perplexity Sonar + Google Gemini). Combined with BNB Chain's low gas fees, we achieve **$0.80 total user journey** vs $65-350 on Ethereum.

### Core Innovation: Hybrid AI-Community Resolution

**High Confidence Markets (80%+):**
1. Market expires → AI searches real-time evidence
2. Perplexity Sonar queries news, social media, official sources
3. Gemini cross-validates for consensus
4. Auto-resolves on-chain in 2-3 minutes
5. Cost: **$0.02** (vs $500 traditional oracle)

**Low Confidence Markets (<80%):**
1. Market enters 48-hour Evidence Collection period
2. Community submits proof via IPFS (screenshots, documents, links)
3. AI re-analyzes with user evidence context
4. If still uncertain: Admin panel with Three-Signal scoring
5. Transparent, verifiable, community-driven

### Why This Matters

- **Enables niche markets**: $0.02 resolution makes "$5 bet on local sports" economically viable
- **Real-time resolution**: 2-3 minutes vs 24-48 hours (UMA)
- **IPFS-backed disputes**: Decentralized evidence storage, tamper-proof
- **Targets 54M users**: Africa's crypto population (2025 projection)

---

## Tech Stack

### Smart Contracts (Solidity 0.8.20)
- **PredictionMarketFactory** - Deploys markets with spam protection (0.001 BNB collateral)
- **CAST Token (ERC-20)** - Deflationary platform token with auto-burn (100M max supply)
- **BetNFT (ERC-721)** - Tradeable position NFTs (exit bets early via secondary market)
- **AdminManager** - Role-based access control (superAdmin/admin)
- **Treasury** - Fee collection + automatic CAST burning (2% platform fee)
- **BuyCAST** - Token purchase mechanism with treasury integration

**Deployed on BSC Testnet 97:**
```
Factory:      0xcb24263d80EE21a81980Bf30342D114f29a49ae2
CAST Token:   0x8B84B21AC2EB9C37EfaD196d99088Df823567e81
BetNFT:       0x3deC8EA06Cbf76cc2378de3dc367eF29837bE43d
AdminManager: 0xF02840CdB0f08E6A88E1ACbd14120b1754ebd9fe
Treasury:     0x54644FD3576720d16ff48Ea7E0545cb1D772D876
BuyCAST:      0x45fEE9DAcF3Beb2C0C67dF057D068c0003C53B79
```

### AI Resolution System
- **Perplexity Sonar API** (Primary)
  - Real-time web search with citations
  - Multi-source fact verification (news, social, official)
  - Confidence scoring (0-100%)
  - Cost: $0.001-0.02 per resolution
  - Location: `src/services/perplexityResolutionService.ts`

- **Google Gemini 2.5 Flash** (Fallback)
  - Independent verification for low-confidence markets
  - Cross-validation with Perplexity
  - Location: `src/services/geminiResolutionService.ts`

- **Three-Signal Calculator**
  - News sentiment analysis (positive/negative/neutral)
  - Social media signals (Twitter, Reddit sentiment)
  - Data signals (APIs, official sources)
  - Weighted consensus for final confidence score
  - Location: `src/services/threeSignalCalculator.ts`

### IPFS Evidence Storage
- **Decentralized evidence repository** using IPFS (ipfs-http-client v60.0.1)
- User-submitted proof stored immutably (screenshots, PDFs, text)
- Metadata tracked: submitter, timestamp, IPFS hash, evidence type
- Evidence types: `screenshot`, `article`, `official_document`, `social_media`, `other`
- 48-hour collection window when AI confidence <80%
- Location: `src/services/ipfsService.ts`, `src/services/evidenceService.ts`

### Frontend (React 18.3.1 + TypeScript)
- **UI Framework**: TailwindCSS + Shadcn/UI (45+ custom components)
- **Web3 Integration**: Ethers.js v6.15.0 + Wagmi
- **Wallet**: MetaMask one-click connect
- **Visualization**: Recharts for market price charts
- **State Management**: React Context + React Hook Form
- **Build Tool**: Vite 6.3.5 (HMR, optimized builds)

### Backend Services (Node.js + Express)
- **Market Monitor** (`market-monitor-server.ts`, Port 3002)
  - Polls expired markets every 60 seconds
  - Queues markets for AI resolution
  - Tracks resolution success/failure rates

- **Evidence Review** (`evidence-review-server.ts`)
  - Re-runs AI with user-submitted IPFS evidence
  - Aggregates community proof for re-resolution

- **AI Proxy** (`anthropic-proxy.ts`, Port 3001)
  - Claude API integration for admin evidence analysis
  - Provides resolution recommendations

### Database (Supabase PostgreSQL)
- User authentication & session management
- Market metadata & trading history
- Evidence records (IPFS hash references)
- Admin approval queue
- Payout tracking

---

## How It Works: Complete Market Lifecycle

### 1. Market Creation
```
User submits question: "Will BNB reach $700 by Dec 31, 2025?"
├─ Deposits 0.001 BNB collateral (spam protection)
├─ Factory deploys new PredictionMarket contract
├─ Status: "Submitted" (awaiting admin review)
└─ Cost: ~$0.60
```

**File**: `src/components/betting/CreateMarket.tsx`

### 2. Admin Approval
```
Admin reviews market via dashboard
├─ Checks question clarity & verifiability
├─ Approves or rejects with feedback
├─ Approved markets → Status: "Open"
└─ Ensures quality control (prevents spam/scam markets)
```

**File**: `src/components/admin/MarketApproval.tsx`

### 3. Trading Phase (AMM-Based Pricing)
```
Users buy YES/NO shares at dynamic prices
├─ AMM Formula: priceYes = yesShares / (yesShares + noShares)
├─ Virtual liquidity: 1000:1000 (prevents early manipulation)
├─ Each purchase mints tradeable BetNFT
├─ NFT metadata: marketId, shares, outcome, purchase price
├─ Slippage protection: 5% default tolerance
└─ Cost per trade: ~$0.10
```

**Files**:
- `contracts/PredictionMarket.sol:buyShares()`
- `src/components/betting/MarketDetails.tsx`
- `contracts/BetNFT.sol`

### 4. Market Expiry Detection
```
MarketMonitorService (background daemon)
├─ Polls all markets every 60 seconds
├─ Checks: block.timestamp > market.endTime
├─ Detected expired markets → Resolution queue
└─ Triggers AI resolution workflow
```

**File**: `src/services/marketMonitorService.ts`

### 5. AI Resolution (Automatic)

#### 5a. High Confidence Path (≥80%)
```
Perplexity Sonar API
├─ Searches: Google News, Twitter, official APIs
├─ Example query: "Did BNB cryptocurrency reach $700 on December 31, 2025?"
├─ Validates sources (publication date, credibility)
├─ Returns: outcome (YES/NO) + confidence (0-100%)
├─ If ≥80% confidence: Auto-resolve on-chain
│   ├─ Calls: market.resolveMarket(outcome, confidence)
│   ├─ Emits: MarketResolution event
│   ├─ Status: "Resolved"
│   └─ Cost: $0.02
└─ Resolution time: 2-3 minutes
```

**Files**:
- `src/services/perplexityResolutionService.ts`
- `src/services/finalResolutionExecutor.ts`

#### 5b. Low Confidence Path (<80%) - Community Dispute
```
Evidence Collection Phase (48 hours)
├─ Market status: "EvidenceCollection"
├─ Community submits proof:
│   ├─ Screenshots (price charts, news articles)
│   ├─ Official documents (exchange announcements)
│   ├─ Social media posts (verified Twitter screenshots)
│   └─ All evidence uploaded to IPFS
│       ├─ IPFS hash stored on-chain
│       ├─ Metadata in Supabase (submitter, timestamp, type)
│       └─ Tamper-proof, decentralized storage
│
├─ AI Re-Resolution (with evidence)
│   ├─ evidenceResolutionService compiles evidence summary
│   ├─ Enhanced prompt: original question + user evidence
│   ├─ Perplexity + Gemini re-analyze with context
│   └─ If confidence now ≥80%: Auto-resolve
│
└─ Manual Admin Review (if still <80%)
    ├─ PendingResolutionManager.tsx UI
    ├─ Admin views all IPFS evidence
    ├─ Three-Signal Panel calculates:
    │   ├─ News sentiment score
    │   ├─ Social signal score
    │   ├─ Data signal score
    │   └─ Weighted final confidence
    └─ Admin makes final call (YES/NO/REFUND)
```

**Files**:
- `src/components/evidence/EvidenceSubmission.tsx`
- `src/services/evidenceService.ts` (IPFS integration)
- `src/services/ipfsService.ts` (IPFS upload/retrieval)
- `src/services/evidenceResolutionService.ts`
- `src/components/admin/PendingResolutionManager.tsx`
- `src/services/threeSignalCalculator.ts`

### 6. Payout Distribution
```
Winners claim winnings
├─ Calls: market.claimWinnings()
├─ Calculates share of remaining pool
├─ Deducts 2% platform fee from losers
├─ Fee automatically sent to Treasury
│   └─ Treasury burns CAST tokens (deflationary)
├─ Winners receive BNB payout
├─ Market creator receives 100 CAST reward
└─ Cost to claim: ~$0.10
```

**Files**:
- `contracts/PredictionMarket.sol:claimWinnings()`
- `contracts/Treasury.sol`

---

## Unique Features & Innovation

### 1. NFT Position Trading (Industry First)
Unlike traditional prediction markets where you're locked in until resolution, BlockCast mints **ERC-721 BetNFT** for each position. This enables:
- **Early exit**: Sell losing bet at discount before expiry
- **Position trading**: Buy winning position at premium
- **Profit tracking**: NFT metadata tracks purchase price for tax purposes
- **Secondary market**: Marketplace UI for NFT trading

**File**: `src/components/nft/NFTMarketplace.tsx`

### 2. IPFS-Backed Dispute Mechanism
When AI confidence is low (<80%), BlockCast doesn't rely on centralized admins alone:
- **Decentralized storage**: Evidence stored on IPFS (tamper-proof)
- **Transparent process**: All submissions publicly viewable
- **Community validation**: Multiple users can submit corroborating proof
- **AI re-learning**: Evidence feeds back into AI for improved future resolution

### 3. Deflationary Token Economics
**CAST Token** has built-in scarcity mechanisms:
- **Max supply**: 100M tokens (hard cap)
- **Auto-burn**: 2% platform fee burned on every resolution
- **Creator rewards**: 100 CAST per resolved market (incentivizes quality)
- **Holder appreciation**: Supply decreases over time → value increases

### 4. Three-Signal Confidence Scoring
Admin panel uses multi-dimensional analysis for ambiguous markets:
- **News Signal**: Sentiment analysis of news articles (positive/negative/neutral)
- **Social Signal**: Twitter/Reddit sentiment tracking
- **Data Signal**: Official APIs (price feeds, sports scores, election results)
- **Weighted Consensus**: Combines all signals for final confidence score

**File**: `src/services/threeSignalCalculator.ts`

### 5. Mobile-First Design
84% of African crypto transactions are mobile-based. BlockCast is optimized for mobile:
- One-click MetaMask connection
- Responsive Shadcn/UI components
- Works seamlessly on $50 Android phones
- Optimized for $1-10 bet sizes

---

## The Team: 100% African-Built

**We live the problem. We built the solution.**

- **Thomas** (Ivory Coast) - Lead Developer
  - Full-stack development, smart contract architecture
  - 5+ years blockchain experience

- **Saad** (Morocco) - Blockchain Specialist
  - Solidity optimization, security auditing
  - DeFi protocol contributor

- **Camille** (Ghana) - Project Owner
  - Product strategy, user research
  - African market expert

- **Mohammed** (Nigeria) - Designer
  - UI/UX design, mobile-first optimization
  - Accessibility specialist

---

## Roadmap & Funding Request: $25K-50K

### Phase 1: Security & Mainnet Launch ($15K)
**Timeline: 3 months**
- Smart contract security audit (CertiK/OpenZeppelin)
- BNB Mainnet deployment + contract verification
- Initial CAST liquidity pool on PancakeSwap ($10K liquidity)
- Bug bounty program ($2K reserve)
- Mainnet stress testing (100+ markets)

### Phase 2: Scale & Regional Expansion ($20K)
**Timeline: 6 months**
- Mobile app development (React Native, iOS/Android)
- Regional marketing campaigns:
  - Nigeria (53M crypto users)
  - Kenya (mobile money integration)
  - South Africa (institutional partnerships)
- Fiat on-ramp partnerships (Flutterwave, Paystack)
- Multilingual support (English, French, Swahili, Hausa)
- Influencer partnerships (African crypto creators)

### Phase 3: Decentralization & DAO ($15K)
**Timeline: 12 months**
- DAO governance smart contracts
- CAST token voting mechanism
- Community moderator rewards program
- Dispute resolution DAO (token holders vote on ambiguous markets)
- Progressive admin decentralization roadmap
- Legal compliance (Nigeria SEC, South Africa FSCA)

**Total Ask: $50K** to unlock prediction markets for 53M African crypto users

---

## Why BlockCast Wins This Hackathon

### YZi Labs Preferred Track Alignment
✅ **AI-Assisted Oracle**: Perplexity Sonar + Gemini dual verification
✅ **Sub-Minute Resolution**: 2-3 minutes vs UMA's 24-48 hours
✅ **Cost Revolution**: $0.02 vs $50-500 (2500x cheaper)
✅ **Niche Market Enabler**: Makes $5 bets economically viable
✅ **Multi-Stage Predictions**: Evidence collection → AI → Community → Admin

### Technical Excellence
- **6 deployed smart contracts** with 200-run optimization
- **80%+ test coverage** on core contract logic
- **50+ testnet markets** created, 20+ AI-resolved successfully
- **500+ testnet transactions** proving real-world usage

### Real Market Validation
- **Live demo**: https://blc-bnb.vercel.app
- **Working IPFS integration**: Decentralized evidence storage
- **Dual AI resolution**: Perplexity + Gemini operational
- **NFT marketplace**: Tradeable positions functional
- **Admin panel**: Three-signal confidence scoring

### Social Impact
- **Targets 54M African crypto users** (realistic, not inflated)
- **Enables $1-10 micro-bets** (84% of African crypto is retail)
- **100x cost reduction** makes niche markets viable
- **Built by African team** understanding local needs

---

## Live Demo & Resources

**🚀 Try BlockCast Now**: https://blc-bnb.vercel.app

**Quick Start (5 minutes):**
1. Get testnet BNB: https://testnet.bnbchain.org/faucet-smart
2. Add BSC Testnet to MetaMask:
   - Network Name: BSC Testnet
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
   - Chain ID: 97
   - Currency: BNB
   - Explorer: https://testnet.bscscan.com
3. Visit app → Connect wallet → Browse 50+ markets → Place $1 bet

**📊 Contract Explorer**: https://testnet.bscscan.com/address/0xcb24263d80EE21a81980Bf30342D114f29a49ae2

**📂 Repository**: Full source code available (15K+ lines)

---

## Installation (For Judges/Reviewers)

```bash
# 1. Clone repository
git clone https://github.com/tdeu/blc_bnb
cd blockcast_new

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Required: Add VITE_PERPLEXITY_API_KEY for AI resolution testing

# 4. Start all services
npm run dev          # Frontend (Port 3000)
npm run server       # AI Proxy (Port 3001)
npm run monitor      # Market Monitor (Port 3002)

# 5. Run tests
npm run test         # Contract tests (80%+ coverage)
npm run typecheck    # TypeScript validation
```

**Note**: Supabase database and deployed contracts are pre-configured for testnet. No deployment needed for demo!

---

## Project Statistics

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | 15,000+ |
| **Smart Contracts** | 6 (Factory, Token, NFT, Treasury, Admin, BuyCAST) |
| **Test Coverage** | 80%+ on core logic |
| **Testnet Transactions** | 500+ |
| **Markets Created** | 50+ |
| **AI Resolutions** | 20+ successful |
| **IPFS Evidence Uploads** | 30+ |
| **Average Resolution Time** | 2-3 minutes |
| **Average Resolution Cost** | $0.02 |
| **User Journey Cost** | $0.80 (vs $65-350 Ethereum) |

---

## Why This Matters

54 million Africans use cryptocurrency. But prediction markets? Zero accessibility.

**The problem isn't demand.** Nigeria processed $59B in crypto volume. Sub-Saharan Africa hit $205B in on-chain value with 52% YoY growth. The problem is **cost barriers**.

When your average bet is $1-10 and traditional platforms charge $3-350 in fees, prediction markets simply don't work for African users. When oracles cost $50-500 per resolution, niche markets (local sports, regional politics, small events) are economically impossible.

**BlockCast fixes this.** AI resolution at $0.02 (not $500) + BNB Chain gas fees = $0.80 total journey. That's **100x cheaper** than alternatives. Suddenly, "Will my local team win?" or "Will BNB hit $700?" becomes viable.

This isn't just a cost optimization. **It's unlocking prediction markets for 54 million users who were completely excluded.**

---

**Prediction markets for the next generation. Built by Africa. For Africa.**

*Seedify x BNB Chain Prediction Markets Hackathon 2025*










