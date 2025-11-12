<document title="BlockCast Three-Signal Resolution System - Simplified Architecture" type="text/markdown">
# BlockCast Three-Signal Resolution System
## Practical Architecture for Hackathon & Beyond

**Version:** 2.0  
**Date:** January 2025  
**Purpose:** Define how BlockCast resolves prediction markets using betting data, user evidence, and external APIs

---

## Core Concept

BlockCast combines THREE independent information sources to determine what actually happened:

1. **Betting Volumes** - What did people with money at stake believe would happen?
2. **Evidence Submissions** - What proof did users submit after the event?
3. **External APIs** - What do independent news sources say happened?

When all three agree, confidence is high. When they conflict, human review is required.

---

## Why Three Signals?

**The Problem:** You're building prediction markets for African niche events (local elections, infrastructure projects, regional sports) that traditional oracles don't cover.

**The Solution:** Combine crowd wisdom, user verification, and AI-powered external research.

**Each signal has weaknesses:**
- Betting can be manipulated by whales or driven by herd mentality
- Evidence can be faked or biased (losers won't submit evidence against themselves)
- APIs have incomplete African coverage and can return wrong information

**But together they're robust:** If 85% bet YES, 80% of evidence says YES, and NewsAPI finds 10 articles confirming YES, you can be confident the answer is YES.

---

## The Complete Timeline

### Phase 1: Market Active (Variable Duration)

Users bet on an outcome. Market has a clear expiry date.

**Example:** "Will Kenya pass the housing bill by March 31, 2025?"
- Users bet YES or NO using CAST tokens
- Market closes March 31, 2025 at 23:59
- All betting data frozen at that moment

**What gets captured:**
- Total YES volume: $4,250 CAST
- Total NO volume: $750 CAST  
- Number of bettors: 87 people
- Individual bet amounts per wallet
- Largest single bet: $320 CAST (7.5% of total)
- Betting timeline (when each bet was placed)

**Why this matters:** The betting ratio (85% YES in this example) tells you what the crowd predicted. This becomes Signal #1.

---

### Phase 2: Evidence Submission (7 Days)

Market has expired. Now users submit proof of what actually happened.

**Who can submit evidence:**
- Anyone who bet on the market
- Admins/moderators
- Verified community members

**Where evidence goes:**
- Primary: Hedera Consensus Service (HCS) topic 0.0.6701034 (immutable)
- Secondary: Supabase database (for fast queries)

**What evidence looks like:**
```
User A (bet $100 on YES):
"The bill was signed into law on March 28. Here's the link to 
the official government gazette: [link]. Also found coverage 
in Nation.africa: [link]"

User B (bet $500 on NO, but submitting YES evidence):
"I was wrong. The bill did pass. Here's video of the signing 
ceremony: [YouTube link]"

User C (bet $50 on NO):
"The bill was only approved by committee, not signed into law yet.
The president hasn't signed it. Here's the article: [link]"
```

**Evidence weighting (this is crucial):**
- User A: bet YES, submitted YES evidence = 1.0x weight (expected, neutral credibility)
- User B: bet NO, submitted YES evidence = 2.5x weight (HIGHLY credible - acting against their financial interest!)
- User C: bet NO, submitted NO evidence = 1.0x weight (expected)

**Why User B's evidence matters more:** If you bet $500 on NO but then honestly admit you were wrong and submit YES evidence, that's extremely credible. You're literally helping the people who beat you.

**Result after 7 days:**
- 10 YES evidence submissions (weighted score: 13.5)
- 3 NO evidence submissions (weighted score: 3.0)
- Evidence ratio: 82% toward YES

**This becomes Signal #2.**

---

### Phase 3: Resolution Analysis (Automated)

**Trigger:** 7 days after market expiry, cron job wakes up and says "time to resolve this market"

**Step 1: Collect betting data (30 seconds)**

System queries the smart contract:
- What was the final YES volume?
- What was the final NO volume?
- How many people bet?
- Any whale concentration? (one wallet >25% of volume?)
- Any last-minute betting surge? (>40% of volume in final 24 hours?)

Calculate betting consensus score: 0-25 points

**Example outcome:** 21.25 points toward YES

---

**Step 2: Collect evidence data (30 seconds)**

System fetches all HCS messages for this market:
- Parse each evidence submission
- Match submitter wallet to their bet position
- Apply credibility weights
- Calculate weighted YES score vs weighted NO score

Calculate evidence consensus score: 0-45 points

**Example outcome:** 36.8 points toward YES

---

**Step 3: Call external APIs (60 seconds)**

System makes API calls:

**NewsAPI:**
- Query: "Kenya housing bill March 2025"
- Filter: Sources in Kenya, English/Swahili languages
- Returns: 12 articles

**Article analysis:**
- 10 articles confirm bill was signed (Nation.africa, StandardMedia, etc.)
- 2 articles are neutral/unclear
- 0 articles say bill was NOT signed

**Source credibility weighting:**
- Nation.africa (Tier 1 trusted source) = 1.5x weight
- StandardMedia.co.ke (Tier 1) = 1.5x weight  
- Unknown blog (Tier 4) = 0.4x weight

**YouTube API (if relevant):**
- Check if government posted signing ceremony video
- Verify view count, upload date

**Twitter/X (optional):**
- Sentiment analysis of tweets about the event
- Not always reliable, so lower weight

Calculate API verification score: 0-30 points

**Example outcome:** 28.4 points toward YES

---

**Step 4: Combine the three signals**

```
Betting Score:    21.25 points → YES
Evidence Score:   36.80 points → YES  
API Score:        28.40 points → YES
─────────────────────────────────────
Total:            86.45 points

All three signals aligned (pointing same direction)?
YES → Add +8 bonus points

Final Score: 94.45 points = 94.45% confidence → YES
```

---

**Step 5: Decision routing**

The system now decides what to do based on confidence level:

**If confidence ≥ 95% and all signals aligned:**
→ AUTO-EXECUTE resolution
→ Start 7-day dispute period
→ Notify admin (FYI only, no action needed)

**If confidence 80-94%:**
→ Send to admin for review with strong recommendation
→ Admin sees full breakdown and clicks "Approve" or "Override"

**If confidence 60-79%:**
→ Send to admin with weak recommendation
→ Admin must review carefully

**If confidence <60% OR signals conflict:**
→ Flag for manual investigation
→ Don't auto-resolve under any circumstances

---

### Phase 4: Admin Review (If Required)

Admin opens dashboard and sees:

**Market:** "Will Kenya pass housing bill by March 31, 2025?"

**AI Recommendation:** YES (86% confidence)

**Signal Breakdown:**
- Betting: 85% YES (4,250 CAST vs 750 CAST, 87 bettors)
- Evidence: 82% YES (10 submissions vs 3, User B's contrarian evidence boosted credibility)
- APIs: 10 of 12 NewsAPI articles confirm YES

**Warnings:**
- Low API result count (only 12 articles, would prefer 20+)
- Evidence clustering (70% submitted in first 48 hours)

**Admin sees four buttons:**

1. **Approve YES** - Execute the AI recommendation
2. **Override to NO** - Admin disagrees with AI
3. **Request More Evidence** - Extend evidence period another 7 days
4. **Mark Invalid** - Something wrong with market, refund everyone

**Admin clicks "Approve YES"**

System executes resolution exactly like auto-execute would have.

---

### Phase 5: Dispute Period (7 Days)

Resolution is now executed on-chain, but payouts are FROZEN for 7 days.

**Who can dispute:**
- Anyone who bet on the LOSING side (NO bettors in this case)
- Must post a dispute bond: 10% of their losing bet amount

**Example dispute:**

User C (who bet $50 on NO) disputes:
- Posts $5 dispute bond
- Submits reason: "The bill was approved but not officially signed. Market says 'pass' which means signed into law. This hasn't happened yet."
- Attaches additional evidence

**What happens:**
- Market status changes to "under_dispute"
- Payout countdown pauses
- Community vote opens for 48 hours
- All CAST token holders can vote

**Community vote:**
- Question: Should we UPHOLD or OVERTURN this resolution?
- Voting weight = your CAST balance
- Quorum required: 10% of circulating supply must vote

**Vote outcome #1: UPHOLD (resolution was correct)**
- Original YES resolution stands
- User C loses their $5 dispute bond
- Payouts execute to YES winners
- Market closed

**Vote outcome #2: OVERTURN (resolution was wrong)**
- Resolution flipped to NO
- User C gets dispute bond back + 20% reward
- Payouts now go to NO winners (including User C)
- Admin gets alert: "Your resolution was overturned - investigate why"

**If nobody disputes after 7 days:**
- Resolution becomes final
- Payouts execute automatically
- Market closed permanently

---

### Phase 6: Payout Execution

Smart contract calculates each winner's share:

**Total pool:** $5,000 (4,250 YES + 750 NO)  
**Platform fee:** 2% = $100  
**Prize pool:** $4,900

**Winner distribution (YES won):**
- User A bet $1,000 → receives $1,225 (their stake + proportional share of losing bets)
- User B bet $500 → receives $612.50
- User C bet... etc.

Formula: `your_bet / total_winning_bets * prize_pool`

Payouts sent directly to wallets as CAST tokens.

---

## Critical Scenarios

### Scenario 1: Perfect Alignment (Easy Case)

**Market:** "Will Nigeria win AFCON 2025?"

**Signals:**
- Betting: 88% YES (strong consensus)
- Evidence: 92% YES (22 submissions say YES, 2 say NO)
- APIs: 19 news articles confirm Nigeria won, 0 say they lost

**Confidence:** 97% YES

**Decision:** Auto-execute with 7-day dispute period

**Why this works:** All three independent sources agree. Very low chance of error.

---

### Scenario 2: Betting vs Evidence Conflict (Red Flag)

**Market:** "Will Kenya president be impeached by December 2024?"

**Signals:**
- Betting: 85% YES ($8,500 on YES, $1,500 on NO)
- Evidence: 70% NO (7 submissions say "impeachment failed", 3 say "succeeded")
- APIs: 60% NO (6 articles say impeachment didn't happen, 3 articles are unclear)

**What this pattern suggests:**
- Early betting was driven by rumors or wishful thinking
- When evidence phase came, people submitted what actually happened
- News confirms evidence, not betting

**Confidence calculation:**
```
Betting: 21.25 points → YES
Evidence: 13.5 points → NO (inverted because evidence says NO)
API: 12.0 points → NO
─────────────────────────
Total: -4.25 points = 4.25% toward NO

Conflict penalty: -10 points (signals disagree)
Final: 14.25% confidence NO
```

**Decision:** Manual review required

**Admin sees alert:** "Betting consensus contradicts evidence and APIs. Possible early misinformation or manipulation. Investigate before resolving."

**Admin action:**
- Review evidence quality (are the NO submissions legitimate?)
- Check betting timeline (was there a whale who bet YES early?)
- Read news articles personally
- Final decision: Resolve to NO (evidence + APIs override betting)

**Lesson:** Betting alone is not enough. This is why we need three signals.

---

### Scenario 3: No External Data Available (Niche Event)

**Market:** "Will Kisumu County complete water project by June 2025?"

**Signals:**
- Betting: 70% YES (healthy consensus)
- Evidence: 75% YES (9 submissions say YES, 3 say NO)
- APIs: 0 results (NewsAPI finds nothing, too local/niche)

**Confidence calculation:**
```
Betting: 17.5 points → YES
Evidence: 30.4 points → YES
API: 15.0 points (neutral, no data penalty)
─────────────────────────
Total: 62.9 points

Quality cap: Max 85% confidence when API returns nothing
Final: 62.9% confidence YES (capped at 85%)
```

**Decision:** Admin review with moderate recommendation

**Why the cap:** Without external verification, we rely entirely on betting + evidence. Both can be manipulated. Admin should verify manually (call local government, check official records, etc.)

---

### Scenario 4: Weak Signals Across the Board

**Market:** "Will Tanzania inflation rate reach 8% in Q1 2025?"

**Signals:**
- Betting: 55% YES vs 45% NO (almost even split)
- Evidence: 60% YES (6 submissions vs 4 submissions, low participation)
- APIs: 0 results (economic data not available yet from official sources)

**Confidence calculation:**
```
Betting: 12.5 points → YES (weak)
Evidence: 24.3 points → YES (weak)
API: 15.0 points (neutral)
─────────────────────────
Total: 51.8 points

Quality penalties:
- Only 10 evidence submissions (low count): -5 points
- No external verification: already applied
Final: 46.8% confidence YES
```

**Decision:** Insufficient data

**Admin sees three options:**

1. **Extend evidence period** - Give users another 7 days to submit better evidence
2. **Wait for official data** - Tanzania Bureau of Statistics will publish Q1 data in April
3. **Mark invalid** - Economic data markets are hard to verify in real-time, refund all bets

**Recommended choice:** Option 2 (wait for official government statistics)

---

### Scenario 5: Evidence Quality is Suspicious

**Market:** "Will Ethiopian dam construction reach 95% by December 2024?"

**Signals:**
- Betting: 65% YES
- Evidence: 90% YES (18 YES submissions, 2 NO submissions)
- APIs: 40% YES (4 articles say incomplete, 6 articles say nearing completion but not at 95%)

**Red flags detected:**
- 16 of the 18 YES evidence submissions came from wallets created in the last week
- All 16 submitted within 2 hours of each other
- Similar writing style across submissions
- No credible sources linked

**System flags:** Possible coordinated evidence attack (Sybil attack)

**Confidence calculation:**
```
Betting: 16.25 points → YES
Evidence: 40.5 points → YES (but flagged)
API: 12.0 points → YES

Evidence quality penalty: -15 points (suspicious pattern)
Final: 53.75% confidence YES
```

**Decision:** Manual investigation required

**Admin investigates:**
- Check wallet creation dates (16 are brand new)
- Check wallet funding sources (all funded from same source wallet)
- Conclusion: This is one person creating fake accounts to submit fake evidence

**Admin action:** Ban the suspicious wallets, discard their evidence, recalculate:

```
Betting: 16.25 points → YES
Evidence: 9.0 points → YES (only 2 legitimate YES submissions remain)
API: 12.0 points → YES
─────────────────────────
Total: 37.25 points YES

Final: 37.25% confidence YES (weak)
```

**New decision:** Override to NO (APIs say project is not at 95% yet, and legitimate evidence is thin)

**Lesson:** Evidence weighting isn't enough. Need fraud detection.

---

## Edge Cases

### What if zero evidence is submitted?

**Scenario:** Market expires, 7 days pass, nobody submits any evidence.

**Resolution:**
- Betting signal: Available
- Evidence signal: 0 submissions (neutral score: 22.5 points out of 45)
- API signal: Depends on API results

**If APIs return strong data:** Rely on Betting + APIs, cap confidence at 70%

**If APIs also return nothing:** Only betting data available, cap confidence at 50%, require admin manual verification

**Admin options:**
- Extend evidence period (maybe people forgot?)
- Resolve based on external research
- Mark invalid if unverifiable

---

### What if the event hasn't happened yet?

**Scenario:** Market says "Will X happen by June 2025?" and it's now July 2025, but the event is still ongoing.

**Example:** "Will Tanzania railway be completed by June 2025?" - In July, the railway is 95% done but not officially completed.

**Resolution:**
- Strict interpretation: Market deadline was June 2025. It's now July. Answer is NO (did not happen by deadline).
- Evidence will show "nearly complete but not finished"
- APIs will confirm "still under construction"

**Outcome:** Resolve to NO

**Important rule:** Market terms are a contract. If deadline passes and condition not met, answer is NO regardless of how close they got.

**Prevents disputes like:** "But it's only 1 week late!" - Doesn't matter, deadline is deadline.

---

### What if admin goes rogue?

**Scenario:** Admin has financial interest in a market and resolves it incorrectly to benefit themselves.

**Protections:**

1. **All resolutions are disputable** - Community can overturn bad admin decisions
2. **Audit trail** - Every admin action recorded immutably on HCS with their wallet address
3. **Community governance** - Token holders have final say via dispute votes
4. **Time delays** - 7-day dispute window gives community time to notice and react

**If pattern of bad decisions:** Community can vote to remove admin privileges (governance feature)

---

### What if APIs return wrong information?

**Scenario:** NewsAPI returns articles about a different event with similar name.

**Example:** Search for "Kenya election 2025" returns articles about "Kenya election 2022"

**Detection:**
- Evidence will contradict APIs
- Betting may contradict APIs
- AI agent should detect temporal mismatch (articles from 2022 not relevant to 2025 market)

**Resolution:**
- System flags API data as "potentially incorrect"
- Admin manually reviews API results
- Admin can exclude API signal from calculation
- Rely on Betting + Evidence only

**Lesson:** This is why we don't trust any single signal absolutely. Cross-validation catches API errors.

---

## Confidence Threshold Strategy

### For Hackathon (Safe Demo Mode)

**Never auto-execute.** Every resolution requires admin approval, but show the AI recommendation.

**Why:** You want to demonstrate the system works, but you don't want a wrong resolution during the demo to ruin everything.

**Demo script:**
1. Show market that just expired
2. Click "Start Resolution Analysis" button
3. Wait 2 minutes while AI analyzes
4. Show AI recommendation: "YES (89% confidence)"
5. Show signal breakdown
6. Admin clicks "Approve"
7. Show on-chain resolution transaction
8. Say: "In production, 95%+ confidence resolutions auto-execute"

---

### For Production (Phased Rollout)

**Phase 1 (Launch):** All resolutions require admin approval (confidence threshold: 0%)

**Phase 2 (After 50 successful manual resolutions):** Enable auto-execute for 98%+ confidence only

**Phase 3 (After 100 successful resolutions, 0 overturns):** Lower to 95%+ confidence

**Phase 4 (Mature product):** Potentially lower to 90%+ for objective markets (sports scores, view counts)

**Never:** Auto-execute subjective markets (political outcomes, economic predictions) - always require human judgment

---

## What You Need to Build

### Data Capture (Required)

When market expires, snapshot:
- Total YES volume
- Total NO volume
- Bettor count per side
- Largest bet amount
- Betting timeline

**Storage:** New database table `betting_snapshots`

---

### Evidence Linking (Required)

When user submits evidence, record:
- Their wallet address
- Their bet position (YES/NO/didn't bet)
- Their bet amount
- Evidence content
- Submission timestamp

**Storage:** Enhance existing `evidence_submissions` table

---

### API Integration (Required for hackathon)

**Must have:**
- NewsAPI integration
- Query based on market keywords + region
- Parse results and calculate sentiment

**Nice to have:**
- YouTube API (for view count markets)
- Twitter API (for sentiment, but expensive)

---

### Resolution Calculator (Core Logic)

Service that:
1. Reads betting snapshot
2. Fetches evidence submissions
3. Calls external APIs
4. Calculates three signal scores
5. Combines into final confidence
6. Returns recommendation

**Input:** Market ID  
**Output:** Recommended outcome + confidence + reasoning

---

### Admin Dashboard (Required for hackathon)

Simple UI showing:
- Markets pending resolution
- AI recommendation for each
- Signal breakdown (betting %, evidence %, API %)
- Buttons: Approve / Override / Request More Evidence

**You already have admin tools, just add this resolution view.**

---

## Success Metrics

### How to know if system is working:

**Accuracy:** % of resolutions that don't get disputed (target: >95%)

**Speed:** Average time from market expiry to resolution (target: <3 minutes for auto, <4 hours for admin review)

**Coverage:** % of markets that can be resolved automatically vs requiring manual investigation (target: >70% automatic)

**Community trust:** Dispute rate (target: <5% of markets get disputed)

---

## Final Recommendation

**For hackathon:**
- Build the three-signal calculation engine
- Integrate NewsAPI only (skip Twitter/YouTube)
- Show full breakdown in admin dashboard
- Require admin approval for ALL resolutions (no auto-execute in demo)
- Have 2-3 pre-created test markets ready to resolve live

**After hackathon:**
- Add fraud detection (Sybil attack prevention)
- Implement auto-execute with conservative thresholds (98%+)
- Add more API sources
- Build community governance tools
- Scale to handle 100+ markets simultaneously

**The core insight:** Don't trust AI confidence scores blindly. Build a validation layer that cross-checks multiple independent signals. When they agree, you can be confident. When they conflict, slow down and investigate.

</document>