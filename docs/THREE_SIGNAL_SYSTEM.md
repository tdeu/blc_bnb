# Three-Signal Resolution System

BlockCast uses a unique three-signal approach to determine market outcomes with 80%+ confidence.

## Signal #1: Betting Volumes (0-25 points)

**Crowd Wisdom**: What did people with money at stake predict?

**Metrics Analyzed**:
- Total YES vs NO betting volumes
- Betting consensus percentage
- Whale detection (wallets >25% of volume)
- Participation level (number of unique bettors)

**Example**: 85% bet YES → Strong crowd consensus (21/25 points)

## Signal #2: Evidence Submissions (0-45 points)

**Community Verification**: What proof did users submit after the event?

### Credibility Weighting System
- User bet YES, submitted YES evidence = **1.0x weight** (neutral)
- User bet NO, submitted YES evidence = **2.5x weight** (highly credible - acting against financial interest!)
- User bet NO, submitted NO evidence = **1.0x weight** (expected)

**Storage**: Hedera Consensus Service (HCS) topic 0.0.6701034 for immutable records

**Fraud Detection**: Wallet age analysis, submission clustering detection

**Example**: 10 YES submissions (weighted: 13.5) vs 3 NO submissions (weighted: 3.0) = 82% toward YES (38/45 points)

## Signal #3: External APIs (0-30 points)

**Independent Verification**: What do trusted news sources confirm?

### API Sources
- NewsAPI for news articles
- Perplexity for real-time web search
- YouTube API for video metrics
- Twitter/X for social sentiment (optional)

### Source Credibility Weighting
- Tier 1 (BBC, Reuters) = **1.5x weight**
- Tier 2 (International media) = **1.2x weight**
- Tier 3 (Regional outlets) = **1.0x weight**
- Tier 4 (Unknown blogs) = **0.4x weight**

**Example**: 10 articles confirm YES, 2 neutral = 83% toward YES (26/30 points)

## Combined Confidence Score

```
Betting Score:    21.25 points → YES
Evidence Score:   36.80 points → YES
API Score:        28.40 points → YES
─────────────────────────────────────
Subtotal:         86.45 points

All signals aligned? YES → +8 bonus points
═══════════════════════════════════════════
FINAL SCORE:      94.45/100 (94.45% confidence)
```

## Resolution Decision Matrix

```
Confidence ≥ 95% + signals aligned  →  🚀 AUTO-EXECUTE (preliminary resolution)
Confidence 80-94%                   →  👨‍💼 Admin Review (strong recommendation)
Confidence 60-79%                   →  📋 Admin Review (weak recommendation)
Confidence < 60% OR signals conflict →  ⚠️ Manual Investigation Required
```

## 80% Confidence Threshold System

- Markets require ≥80% confidence for final resolution
- Evidence period: Minimum 7 days, extendable up to 30 days
- If confidence <80% after 30 days → Market refunded to all bettors
- Refund mechanism ensures fairness for unresolvable markets

## Market Status Flow

```
Open → Expired → PendingResolution
                      ↓
         ┌────────────┴────────────┐
         │                         │
    Confidence ≥80%          Confidence <80%
         │                         │
         ↓                         ↓
    Resolved              After 30 days → Refunded
         │                         │
         ↓                         ↓
  Winners claim             All claim refunds
   via redeem()            via claimRefund()
```

## Why Three Signals?

Each signal has weaknesses when used alone:

- **Betting** can be manipulated by whales or herd mentality
- **Evidence** can be faked or biased (losers won't submit contrary evidence)
- **APIs** have incomplete coverage and can return wrong information

**By combining all three signals**, we achieve unprecedented accuracy and resistance to manipulation.
