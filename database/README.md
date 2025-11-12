# BlockCast Database Schema

## Overview

BlockCast uses **Supabase (PostgreSQL)** to store market data, evidence submissions, AI analysis results, and resolution tracking. This folder contains all database schema files and migration scripts.

---

## 📁 File Organization

### Core Schema
- **`schema.sql`** - Main database schema with all core tables
- **`supabase-schema.sql`** - Supabase-specific configuration
- **`three-signal-schema.sql`** - Three-Signal Resolution System tables

### Feature-Specific Schemas
- **`evidence-schema.sql`** - Evidence submission and validation tables
- **`bet-events-schema.sql`** - Betting event tracking
- **`setup-storage.sql`** - Supabase storage configuration for images

### Migrations
- **`80-percent-confidence-threshold-migration.sql`** - Adds 80% confidence threshold feature
- **`add-image-column.sql`** - Adds image support to markets
- **`evidence-aggregation-schema-update.sql`** - Updates evidence aggregation logic
- **`final-resolution-tracking-migration.sql`** - Adds final resolution tracking
- **`hybrid-ai-schema-update.sql`** - Updates for hybrid AI analysis
- **`persist-confidence-data.sql`** - Confidence score persistence

### Utilities
- **`check-existing-statuses.sql`** - Query to check market statuses

---

## 📊 Core Tables

### 1. **markets**
Stores all prediction markets created on the platform.

**Key Fields:**
- `id` (TEXT, PK) - Unique market identifier
- `question` (TEXT) - The prediction question
- `contract_address` (TEXT) - Hedera smart contract address
- `status` (TEXT) - Market status: `active`, `expired`, `resolved`, `processing`
- `end_time` (TIMESTAMPTZ) - Market expiration time
- `ai_confidence_score` (NUMERIC) - AI confidence in resolution (0-100)
- `resolution` (TEXT) - Final outcome: `YES`, `NO`, `INVALID`

**Related:**
- Referenced by: `evidence`, `resolution_jobs`, `three_signal_analysis`

---

### 2. **evidence**
Stores evidence submissions from users.

**Key Fields:**
- `market_id` (TEXT, FK) - References `markets.id`
- `submitter_address` (TEXT) - User's wallet address
- `content` (TEXT) - Evidence text/description
- `evidence_type` (TEXT) - Type: `text`, `url`, `file`
- `credibility_score` (NUMERIC) - AI-assigned credibility (0-100)
- `hcs_message_id` (TEXT) - Hedera Consensus Service message ID
- `is_validated` (BOOLEAN) - Admin validation status

**Purpose:**
Powers the **Evidence Signal** (0-45 points) in the Three-Signal Resolution System.

---

### 3. **resolution_jobs**
Tracks AI resolution processing tasks.

**Key Fields:**
- `market_id` (TEXT, FK) - References `markets.id`
- `status` (TEXT) - Job status: `pending`, `processing`, `completed`, `failed`
- `ai_analysis` (JSONB) - Full AI analysis results
- `scheduled_at` (TIMESTAMPTZ) - When job was scheduled
- `processed_at` (TIMESTAMPTZ) - When job completed

**Purpose:**
Queues markets for AI resolution after expiration.

---

### 4. **three_signal_analysis**
Stores detailed Three-Signal Resolution analysis.

**Key Fields:**
- `market_id` (TEXT, FK) - References `markets.id`
- `betting_signal_score` (NUMERIC) - Crowd wisdom score (0-25)
- `evidence_signal_score` (NUMERIC) - Evidence quality score (0-45)
- `api_signal_score` (NUMERIC) - External data score (0-30)
- `total_confidence` (NUMERIC) - Combined confidence (0-100)
- `recommended_outcome` (TEXT) - AI recommendation: `YES`, `NO`, `INCONCLUSIVE`
- `detailed_analysis` (JSONB) - Full breakdown with reasoning

**Purpose:**
Powers the **Three-Signal Resolution System** - BlockCast's unique approach to market resolution.

**Signal Breakdown:**
1. **Betting Volumes** (0-25 points) - Crowd wisdom from betting patterns
2. **Evidence Submissions** (0-45 points) - User-submitted proof and verification
3. **External APIs** (0-30 points) - Real-world data from news APIs, web scraping

**Threshold:** Markets require ≥80% confidence for resolution. Below 80% = refund all bets.

---

### 5. **ai_attestations**
Records all AI-generated attestations on Hedera Consensus Service.

**Key Fields:**
- `market_id` (TEXT, FK) - References `markets.id`
- `hcs_topic_id` (TEXT) - Hedera topic ID
- `message_id` (TEXT) - HCS message identifier
- `attestation_data` (JSONB) - Full attestation payload
- `confidence_score` (NUMERIC) - AI confidence level

**Purpose:**
Immutable record of AI decisions on Hedera blockchain.

---

## 🔄 Schema Evolution

### Migration Order
Run migrations in this order for a new database:

1. `schema.sql` - Base tables
2. `supabase-schema.sql` - Supabase config
3. `three-signal-schema.sql` - Three-Signal tables
4. `evidence-schema.sql` - Evidence tables
5. `bet-events-schema.sql` - Event tracking
6. `setup-storage.sql` - Storage setup
7. All migration files (in chronological order)

### Key Features Added
- **80% Confidence Threshold** - Ensures accurate resolutions
- **Image Support** - Markets can have visual content
- **Evidence Aggregation** - Combines multiple evidence sources
- **Final Resolution Tracking** - Two-stage resolution process
- **Hybrid AI Analysis** - Combines Claude + Perplexity

---

## 🚀 Setup Instructions

### For New Database
```bash
# 1. Create Supabase project at https://supabase.com

# 2. Run core schema
psql -f database/schema.sql

# 3. Run additional schemas
psql -f database/three-signal-schema.sql
psql -f database/evidence-schema.sql

# 4. Setup storage
psql -f database/setup-storage.sql
```

### For Existing Database
```bash
# Run only the migrations you need
psql -f database/80-percent-confidence-threshold-migration.sql
```

---

## 📈 Database Statistics

**Total Tables:** 8+ core tables
**Total Migrations:** 10+ migration files
**Storage:** Configured for market images via Supabase Storage
**HCS Integration:** Evidence and attestations recorded on Hedera

---

## 🔍 Useful Queries

### Check market statuses
```sql
SELECT status, COUNT(*)
FROM markets
GROUP BY status;
```

### View recent evidence
```sql
SELECT m.question, e.content, e.credibility_score
FROM evidence e
JOIN markets m ON e.market_id = m.id
ORDER BY e.created_at DESC
LIMIT 10;
```

### Check AI confidence distribution
```sql
SELECT
  CASE
    WHEN total_confidence >= 80 THEN 'High (≥80%)'
    WHEN total_confidence >= 60 THEN 'Medium (60-79%)'
    ELSE 'Low (<60%)'
  END AS confidence_range,
  COUNT(*)
FROM three_signal_analysis
GROUP BY confidence_range;
```

---

## 🛠️ Maintenance

### Indexes
The schema includes indexes on:
- `markets.status` - Fast status filtering
- `markets.end_time` - Quick expiration checks
- `evidence.market_id` - Efficient evidence lookups
- `resolution_jobs.status` - Job queue processing

### Backups
Supabase provides automatic daily backups. For critical data:
- Evidence is also stored on HCS (immutable)
- AI attestations are recorded on-chain

---

## 📞 Support

For schema questions or migration issues:
- Check `docs/TROUBLESHOOTING.md`
- Review migration files for specific feature changes
- All tables use UTC timestamps (TIMESTAMPTZ)
