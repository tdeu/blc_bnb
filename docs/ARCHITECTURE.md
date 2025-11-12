# BlockCast Architecture

## System Overview

BlockCast is a full-stack decentralized prediction market platform built on Hedera Hashgraph with AI-powered resolution.

```
Frontend (React + TypeScript)
    ├── Truth Markets (Active betting)
    ├── Verify Markets (Evidence submission & disputes)
    ├── AI Analysis Integration
    ├── Admin Dashboard (Evidence Resolution Panel)
    └── Real-time Status Updates
         ↑
Backend Services (Node.js + Express)
    ├── AI Proxy Server (Port 3001) - REQUIRED
    │   ├── Anthropic Claude API proxy
    │   ├── Image upload handling
    │   └── CORS + Security Handling
    ├── Market Monitor (Port 3002) - RECOMMENDED
    │   ├── 60s cycle expiration detection
    │   ├── Three-tier AI resolution system
    │   └── Evidence period management
    └── Evidence Review (Port 3003) - OPTIONAL
         ↑
Database Layer (Supabase)
    ├── approved_markets (market storage + status)
    ├── evidence_submissions (user evidence)
    ├── resolution_scores (three-signal data)
    ├── market_disputes (on-chain sync)
    └── bet_tracking (unique bettor counts)
         ↑
Blockchain Integration (Hedera EVM)
    ├── Smart Contracts (6 deployed)
    │   ├── PredictionMarketFactory
    │   ├── CAST Token (ERC20)
    │   ├── BetNFT
    │   ├── AdminManager
    │   ├── Treasury
    │   └── DisputeManager
    ├── HCS Topics (immutable storage)
    └── Wallet Integration (MetaMask)
```

## Smart Contract Addresses (Hedera Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **PredictionMarketFactory** | `0xD2092162aD3A392686A6B0e5dFC0d34c953c221D` | Creates markets |
| **CAST Token** | `0xC78Ac73844077917E20530E36ac935c4B56236c2` | Platform token |
| **BetNFT** | `0x8e718596977C0BE525c5b1afeA73d9eFdF9bB7ca` | Position NFTs |
| **AdminManager** | `0x94FAF61DE192D1A441215bF3f7C318c236974959` | Access control |
| **Treasury** | `0x69649cc208138B3A2c529cB301D7Bb591C53a2e2` | Fee collection |
| **DisputeManager** | `0xCB8B4E630dFf7803055199A75969a25e7Ec48f39` | Evidence & disputes |

## Database Schema

### approved_markets Table
```sql
- market_id (primary key)
- question (text)
- end_date (timestamp)
- status (enum: open, expired, pending_resolution, resolved, refunded)
- confidence_score (numeric)
- evidence_period_start (timestamp)
- refunded (boolean)
- refund_tx_hash (text)
- preliminary_resolve_time (timestamp)
- final_resolve_time (timestamp)
- final_outcome (text)
```

### evidence_submissions Table
```sql
- id (primary key)
- market_id (foreign key)
- user_address (text)
- evidence_text (text)
- links (json)
- timestamp (timestamp)
- vote (enum: yes, no)
- credibility_weight (numeric)
```

### resolution_scores Table
```sql
- market_id (primary key)
- betting_signal_score (numeric)
- evidence_signal_score (numeric)
- api_signal_score (numeric)
- total_confidence (numeric)
- signals_aligned (boolean)
```

## Technology Stack

- **Blockchain**: Hedera Hashgraph (Testnet)
- **Smart Contracts**: Solidity 0.8.20
- **AI**: Claude 3.5 Sonnet + Haiku
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Storage**: Hedera Consensus Service (HCS)
- **Wallet**: MetaMask (Hedera integration)

## HCS Topics

| Topic | ID | Purpose |
|-------|-----|---------|
| Evidence | 0.0.6701034 | User-submitted evidence |
| AI Attestations | 0.0.6701035 | AI resolution decisions |
| Challenges | 0.0.6701036 | Dispute challenges |
| Admin Decisions | 0.0.6701037 | Final admin resolutions |
