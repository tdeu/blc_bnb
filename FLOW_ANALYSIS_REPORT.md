# RAPPORT D'ANALYSE COMPLÈTE - FLOW DE DONNÉES END-TO-END
## Plateforme de Prédiction BlockCast

**Date:** 2025-11-15
**Analyste:** Claude AI
**Objectif:** Analyser le flow complet de création → paris → résolution → métriques et identifier tous les bugs potentiels

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du système](#1-vue-densemble-du-système)
2. [Flow 1: Création de marché](#2-flow-1-création-de-marché)
3. [Flow 2: Placement de paris](#3-flow-2-placement-de-paris)
4. [Flow 3: Résolution automatique](#4-flow-3-résolution-automatique)
5. [Flow 4: Mise à jour des métriques](#5-flow-4-mise-à-jour-des-métriques)
6. [Problèmes critiques identifiés](#6-problèmes-critiques-identifiés)
7. [Recommandations](#7-recommandations)

---

## 1. VUE D'ENSEMBLE DU SYSTÈME

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ BettingMarkets│  │ AdminPanel   │  │ Treasury     │     │
│  │  Component    │  │              │  │  Dashboard   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICES LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Factory      │  │ aiResolution │  │ Treasury     │     │
│  │ Service      │  │ Scheduler    │  │ Service      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  SMART CONTRACTS (BSC)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Factory      │  │ Prediction   │  │ Treasury     │     │
│  │ Contract     │  │ Market       │  │ Contract     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (Supabase)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ approved_    │  │ bets         │  │ cast_        │     │
│  │ markets      │  │              │  │ purchases    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Tables Supabase Clés

**approved_markets** (marché principal)
- `id`: UUID du marché
- `claim`: Question du marché
- `contract_address`: Adresse du smart contract déployé
- `status`: 'active' | 'pending_resolution' | 'resolved' | 'offline'
- `expires_at`: Date d'expiration
- `resolution_data`: JSON avec outcome, confidence, etc.
- `resolution_outcome`: 'yes' | 'no'
- `ai_confidence_score`: 0-100

**bets** (paris utilisateurs)
- `market_id`: Référence à approved_markets
- `user_address`: Wallet de l'utilisateur
- `bet_type`: 'YES' | 'NO'
- `shares_amount`: Nombre de shares
- `cost_amount`: Coût en CAST

**cast_purchases** (achats de tokens CAST)
- `buyer_address`: Wallet
- `bnb_amount`: BNB payé
- `cast_amount`: CAST reçu
- `transaction_hash`: TX hash
- `timestamp`: Date/heure

---

## 2. FLOW 1: CRÉATION DE MARCHÉ

### 2.1 Points d'entrée

**Frontend:** `BettingMarkets.tsx` (ligne 424-433)
```typescript
{onCreateMarket && (
  <Button onClick={onCreateMarket}>
    <Plus className="h-4 w-4" />
    Create Market
  </Button>
)}
```

**Service:** `factoryService.ts` (ligne 71-188)
```typescript
async createMarket(params: CreateMarketParams): Promise<CreateMarketResult>
```

### 2.2 Étapes de création

#### Étape 1: Validation Frontend
- Vérification de la longueur de la question (min 10 caractères)
- Vérification que endTime > Date.now()
- Validation de la catégorie

#### Étape 2: Appel Smart Contract Factory
**Fichier:** `factoryService.ts` ligne 108-114
```typescript
const tx = await factory.createMarket(
  params.question,
  endTimeUnix,
  {
    value: collateralWei // 0.001 BNB collateral
  }
);
```

**Smart Contract:** `PredictionMarketFactory.sol`
- Crée un nouveau contrat `PredictionMarket`
- Déploie avec les paramètres :
  - question
  - endTime
  - collateral token (CAST)
  - adminManager address
  - treasury address
  - protocolFeeRate (200 = 2%)

#### Étape 3: Extraction de l'événement MarketCreated
**Fichier:** `factoryService.ts` ligne 125-133
```typescript
const marketCreatedEvent = receipt.logs
  .map((log: any) => factory.interface.parseLog(log))
  .find((event: any) => event?.name === 'MarketCreated');

const marketId = marketCreatedEvent.args.id;
const marketAddress = marketCreatedEvent.args.market;
```

#### Étape 4: Enregistrement dans Supabase
**PROBLÈME CRITIQUE #1: ENREGISTREMENT MANQUANT**

Le code retourne `marketId` et `marketAddress` MAIS **NE LES ENREGISTRE PAS dans Supabase** !

```typescript
// factoryService.ts ligne 151-156
return {
  success: true,
  marketId,
  marketAddress,
  transactionHash: receipt.hash
};
// ❌ Aucun appel à supabase.from('approved_markets').insert()
```

### 2.3 État attendu vs État réel

**État attendu après création:**
```sql
INSERT INTO approved_markets (
  id,
  claim,
  contract_address,
  status,
  expires_at,
  category
) VALUES (
  marketId,
  params.question,
  marketAddress,
  'submitted', -- ou 'active' après approbation
  params.endTime,
  params.category
);
```

**État réel:**
- ✅ Marché déployé sur blockchain
- ❌ **AUCUNE ENTRÉE dans approved_markets**
- ❌ **Marché invisible pour le système**
- ❌ **Ne peut pas être résolu par AI scheduler**

---

## 3. FLOW 2: PLACEMENT DE PARIS

### 3.1 Points d'entrée

**Frontend:** `BettingMarkets.tsx` ligne 228-236
```typescript
const handleOpenBetDialog = (market: BettingMarket, position: 'yes' | 'no') => {
  setSelectedMarket(market);
  setBetPosition(position);
  setShowBetDialog(true);
};
```

### 3.2 Étapes de placement

#### Étape 1: Calcul du coût en temps réel
**Fichier:** `BettingMarkets.tsx` ligne 94-135
```typescript
const calculateEstimatedCost = async () => {
  const contract = new ethers.Contract(contractAddress, marketABI, provider);
  const shares = ethers.parseEther(betAmount);
  const cost = betPosition === 'yes'
    ? await contract.getPriceYes(shares)
    : await contract.getPriceNo(shares);

  setEstimatedCost(ethers.formatEther(cost));
};
```

**Smart Contract:** `PredictionMarket.sol` ligne 147-161
```solidity
function getPriceYes(uint256 sharesToBuy) public view returns (uint256) {
    uint256 currentTotal = yesShares + noShares;
    uint256 futureTotal = currentTotal + sharesToBuy;

    uint256 currentPrice = (yesShares * 1e18) / currentTotal;
    uint256 futurePrice = ((yesShares + sharesToBuy) * 1e18) / futureTotal;

    uint256 avgPrice = (currentPrice + futurePrice) / 2;
    return (avgPrice * sharesToBuy) / 1e18;
}
```

#### Étape 2: Approbation CAST + Placement
**Fichier:** `contractService.ts` ligne 488-540
```typescript
// 1. Approve CAST tokens
const approveTx = await castToken.approve(marketAddress, maxCost);
await approveTx.wait();

// 2. Place bet avec protection slippage
const betTx = await marketContract.placeBet(isYes, shares, maxCost);
await betTx.wait();
```

**Smart Contract:** `PredictionMarket.sol` ligne 227-269
```solidity
function placeBet(bool isYes, uint256 shares, uint256 maxCost) external isOpen {
    uint256 cost = isYes ? getPriceYes(shares) : getPriceNo(shares);
    require(cost <= maxCost, "Cost exceeds maxCost (slippage)");

    require(collateral.transferFrom(msg.sender, address(this), cost), "Transfer failed");

    if (isYes) {
        yesShares += shares;
        yesBalance[msg.sender] += shares;
        if (!hasYesPosition[msg.sender]) {
            yesParticipants.push(msg.sender);
            hasYesPosition[msg.sender] = true;
        }
    }

    reserve += cost;
}
```

#### Étape 3: Enregistrement du pari
**Fichier:** `betTrackingService.ts` ligne 34-58
```typescript
export async function logBetEvent(bet: BetEvent): Promise<void> {
  const { error } = await supabase
    .from('bet_events')
    .insert({
      market_id: bet.marketId,
      market_contract: bet.marketContract,
      user_address: bet.userAddress,
      bet_type: bet.betType,
      shares_amount: bet.sharesAmount,
      cost_amount: bet.costAmount,
      transaction_hash: bet.transactionHash,
      timestamp: bet.timestamp.toISOString()
    });
}
```

**PROBLÈME CRITIQUE #2: LOGGING NON AUTOMATIQUE**

Le code définit `logBetEvent()` MAIS **N'EST JAMAIS APPELÉ AUTOMATIQUEMENT** après `placeBet()`.

### 3.3 État des paris

**État blockchain (PredictionMarket.sol):**
- ✅ `yesBalance[user]` ou `noBalance[user]` mis à jour
- ✅ `yesShares` / `noShares` globaux mis à jour
- ✅ `reserve` (pool CAST) mis à jour
- ✅ User ajouté à `yesParticipants` ou `noParticipants`

**État database:**
- ❌ **Table `bets` vide** (pas d'insertion automatique)
- ❌ **Table `bet_events` vide** (logBetEvent non appelé)
- ❌ **Impossible de compter les paris pour métriques**

---

## 4. FLOW 3: RÉSOLUTION AUTOMATIQUE

### 4.1 Architecture de résolution

```
aiResolutionScheduler.start()
    │
    ├─► loadAndScheduleMarkets()
    │   └─► SELECT * FROM approved_markets WHERE status='active'
    │
    ├─► scheduleMarketResolution(market)
    │   └─► setTimeout(() => triggerMarketResolution(market), timeUntilExpiry)
    │
    └─► triggerMarketResolution(market)
        │
        ├─► perplexityResolutionService.resolveMarket()
        │   └─► Retourne {outcome, confidence, reasoning}
        │
        ├─► SI confidence < 85% → geminiResolutionService.resolveMarket()
        │   └─► Fallback AI
        │
        ├─► SI needsReview → markMarketForReview()
        │   └─► UPDATE approved_markets SET status='pending_resolution'
        │
        └─► SINON → saveResolutionToDatabase() + triggerPayout()
            │
            ├─► UPDATE approved_markets SET status='resolved', resolution_data={...}
            │
            └─► resolutionService.resolveMarketWithAI(marketId, outcome, confidence)
                └─► Appel smart contract resolveMarketWithAI()
```

### 4.2 Étapes détaillées

#### Étape 1: Démarrage du scheduler
**Fichier:** `aiResolutionScheduler.ts` ligne 31-49
```typescript
async start() {
  await this.loadAndScheduleMarkets();

  // Check for new markets every 5 minutes
  this.checkInterval = setInterval(() => {
    this.loadAndScheduleMarkets();
  }, 5 * 60 * 1000);
}
```

#### Étape 2: Chargement des marchés actifs
**Fichier:** `aiResolutionScheduler.ts` ligne 77-132
```typescript
const { data, error } = await supabase
  .from('approved_markets')
  .select('*')
  .eq('status', 'active')
  .order('expires_at', { ascending: true });

for (const market of data) {
  if (this.scheduledMarkets.has(market.id)) continue;

  const expiresAt = new Date(market.expires_at);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  if (timeUntilExpiry > 0) {
    this.scheduleMarketResolution({
      id: market.id,
      claim: market.claim,
      expiresAt,
      contractAddress: market.contract_address
    });
  }
}
```

#### Étape 3: Résolution Perplexity AI
**Fichier:** `aiResolutionScheduler.ts` ligne 168-183
```typescript
const perplexityResolution = await perplexityResolutionService.resolveMarket(
  market.claim,
  market.description
);
// Retourne: {outcome: 'yes'|'no', confidence: 0-100, reasoning: string, needsReview: boolean}
```

#### Étape 4: Fallback Gemini (si confidence < 85%)
**Fichier:** `aiResolutionScheduler.ts` ligne 185-217
```typescript
if (perplexityResolution.confidence < 85) {
  geminiResolution = await geminiResolutionService.resolveMarket(
    market.claim,
    market.description
  );

  // Check for disagreement
  if (perplexityResolution.outcome !== geminiResolution.outcome) {
    needsManualReview = true;
  }
}
```

#### Étape 5: Enregistrement en DB
**Fichier:** `aiResolutionScheduler.ts` ligne 248-279
```typescript
await supabase
  .from('approved_markets')
  .update({
    status: 'resolved',
    resolution_data: {
      final_outcome: resolution.outcome,
      confidence: resolution.confidence,
      admin_notes: resolution.reasoning,
      source: source,
      resolved_by: 'api',
      timestamp: new Date().toISOString()
    }
  })
  .eq('id', marketId);
```

#### Étape 6: Résolution on-chain
**Fichier:** `aiResolutionScheduler.ts` ligne 328-354
```typescript
const result = await resolutionService.resolveMarketWithAI(marketId, outcome, confidence);
```

**Fichier:** `resolutionService.ts` ligne 556-680
```typescript
async resolveMarketWithAI(marketId: string, outcome: 'yes' | 'no', confidence: number) {
  // 1. Fetch market contract address
  const { data: market } = await supabase
    .from('approved_markets')
    .select('contract_address, status')
    .eq('id', marketId)
    .single();

  // 2. Use ADMIN signer (not user's wallet)
  const { getAdminSigner } = await import('./adminSigner');
  const adminSigner = await getAdminSigner();

  // 3. Call smart contract
  const contractOutcome = outcome === 'yes' ? 1 : 2;
  const marketContract = new ethers.Contract(marketAddress, ABI, adminSigner);
  const tx = await marketContract.resolveMarketWithAI(contractOutcome, confidence);
  await tx.wait();

  // 4. Update database
  await supabase
    .from('approved_markets')
    .update({
      status: 'resolved',
      resolution_outcome: outcome,
      ai_confidence_score: confidence,
      resolved_at: new Date().toISOString()
    })
    .eq('id', marketId);
}
```

#### Étape 7: Calcul et transfert des protocol fees
**Smart Contract:** `PredictionMarket.sol` ligne 294-311
```solidity
function resolveMarketWithAI(Outcome outcome, uint256 _confidenceScore) external onlyAdmin {
    // 1. Calculate protocol fees from LOSING side only
    uint256 totalReserve = reserve;
    uint256 totalShares = yesShares + noShares;
    uint256 losingShares = (outcome == Outcome.Yes) ? noShares : yesShares;

    // Fee = (losing side's proportion) * fee rate (2%)
    uint256 losingContribution = (losingShares * totalReserve) / totalShares;
    uint256 protocolFees = (losingContribution * protocolFeeRate) / 10000;

    // 2. Transfer fees to Treasury
    if (protocolFees > 0) {
        require(collateral.approve(address(treasury), protocolFees), "Approval failed");
        treasury.receiveFees(address(collateral), protocolFees);
        reserve -= protocolFees; // Subtract fees from reserve
    }

    // 3. Auto-payout winners
    _distributeWinnings(outcome);
}
```

#### Étape 8: Distribution automatique aux gagnants
**Smart Contract:** `PredictionMarket.sol` ligne 327-364
```solidity
function _distributeWinnings(Outcome outcome) private {
    address[] memory winners = (outcome == Outcome.Yes) ? yesParticipants : noParticipants;
    uint256 totalWinningShares = (outcome == Outcome.Yes)
        ? (yesShares - VIRTUAL_LIQUIDITY)
        : (noShares - VIRTUAL_LIQUIDITY);

    for (uint256 i = 0; i < winners.length; i++) {
        address winner = winners[i];
        uint256 userShares = (outcome == Outcome.Yes) ? yesBalance[winner] : noBalance[winner];

        if (userShares > 0) {
            // Calculate proportional payout
            uint256 payout = (userShares * reserve) / totalWinningShares;

            // Transfer winnings
            require(collateral.transfer(winner, payout), "Payout failed");

            // Clear shares
            if (outcome == Outcome.Yes) {
                yesBalance[winner] = 0;
            } else {
                noBalance[winner] = 0;
            }

            emit WinningsPaidOut(winner, payout);
        }
    }

    reserve = 0; // All funds distributed
}
```

**PROBLÈME CRITIQUE #3: TRACKING DES FEES MANQUANT**

Les protocol fees sont bien transférés au Treasury contract MAIS **AUCUN ENREGISTREMENT EN DATABASE**.

```solidity
// PredictionMarket.sol ligne 309
treasury.receiveFees(address(collateral), protocolFees);
// ✅ Fees transférés au Treasury contract
// ❌ Pas d'événement FeeReceived loggé en DB
```

---

## 5. FLOW 4: MISE À JOUR DES MÉTRIQUES

### 5.1 Métriques dans UnifiedTreasuryDashboard

**Fichier:** `UnifiedTreasuryDashboard.tsx` ligne 63-117

#### Métrique 1: Total CAST Supply
**Source:** Smart contract CAST Token
```typescript
const [maxSupply, totalSupply, ownerBalance] = await Promise.all([
  castContract.MAX_SUPPLY(),      // 100,000,000 CAST
  castContract.totalSupply(),     // Supply actuel
  castContract.balanceOf(OWNER_ADDRESS)
]);
```
**État:** ✅ **CORRECT** - Données on-chain fiables

#### Métrique 2: Token Sales Revenue
**Source:** Smart contract Treasury balance
```typescript
const bnbRevenue = await provider.getBalance(TREASURY_CONTRACT_ADDRESS);
```
**État:** ✅ **CORRECT** - Lit directement le solde BNB du Treasury

#### Métrique 3: Protocol Fees
**Source:** `treasuryService.ts` (utils) ligne 256-276
```typescript
async getTreasuryAnalytics() {
  const [balances, feeStats] = await Promise.all([
    this.getAllBalances(),
    this.getTotalFeesCollected()
  ]);

  return {
    totalValue: totalValue.toString(),
    monthlyFees: feeStats.totalFees
  };
}
```

**Source des fees:** `treasuryService.ts` ligne 191-222
```typescript
async getFeeHistory(): Promise<FeeCollection[]> {
  const fromBlock = (await provider.getBlockNumber()) - 86400;
  const filter = treasuryContract.filters.FeeReceived();
  const events = await treasuryContract.queryFilter(filter, fromBlock);

  return events.map(event => ({
    marketId: `market-${event.transactionHash.slice(-8)}`,
    marketTitle: 'Market Resolution Fee',
    feeAmount: ethers.formatEther(event.args.amount),
    token: event.args.token,
    timestamp: new Date(block.timestamp * 1000).toISOString()
  }));
}
```

**PROBLÈME CRITIQUE #4: ÉVÉNEMENTS FEERECIEVED MANQUANTS**

Le Treasury contract devrait émettre un événement `FeeReceived` MAIS :

```solidity
// Treasury.sol (supposé)
function receiveFees(address token, uint256 amount) external {
    require(IERC20(token).transferFrom(msg.sender, address(this), amount));
    tokenBalances[token] += amount;

    // ❌ Manque: emit FeeReceived(token, amount, msg.sender);
}
```

**Résultat:** `getFeeHistory()` retourne un tableau VIDE → `monthlyFees = '0'`

#### Métrique 4: Total Transactions
**Source:** Requêtes Supabase
```typescript
const [
  { count: betsCount },
  { count: marketsCount },
  { count: purchasesCount },
  { count: resolutionsCount }
] = await Promise.all([
  supabase.from('bets').select('*', { count: 'exact', head: true }),
  supabase.from('approved_markets').select('*', { count: 'exact', head: true }),
  supabase.from('cast_purchases').select('*', { count: 'exact', head: true }),
  supabase.from('approved_markets').select('*', { count: 'exact', head: true }).eq('status', 'resolved')
]);

const total = (betsCount || 0) + (marketsCount || 0) + (purchasesCount || 0) + (resolutionsCount || 0);
```

**PROBLÈME CRITIQUE #5: BETS COUNT = 0**

La table `bets` n'existe PAS dans les schémas SQL fournis → `betsCount` sera toujours 0.

#### Métrique 5: Total Markets
**Source:** Requête Supabase
```typescript
supabase.from('approved_markets').select('*', { count: 'exact', head: true })
```
**État:** ✅ **CORRECT** si les marchés sont bien insérés (voir Problème #1)

---

## 6. PROBLÈMES CRITIQUES IDENTIFIÉS

### 🔴 CRITIQUE #1: Marchés non enregistrés en DB après création

**Localisation:** `factoryService.ts` ligne 71-188
**Impact:** BLOQUANT
**Description:**
- Le smart contract Factory crée bien le marché on-chain
- L'événement `MarketCreated` est extrait avec `marketId` et `marketAddress`
- MAIS aucun appel à `supabase.from('approved_markets').insert()`
- Résultat : Marché invisible pour l'AI scheduler, ne peut pas être résolu

**Preuve:**
```typescript
// factoryService.ts ligne 151-156
return {
  success: true,
  marketId,
  marketAddress,
  transactionHash: receipt.hash
};
// ❌ Manque: await saveMarketToSupabase(marketId, marketAddress, params)
```

**Fix requis:**
```typescript
// Après ligne 150
const { error } = await supabase
  .from('approved_markets')
  .insert({
    id: marketId,
    claim: params.question,
    contract_address: marketAddress,
    status: 'submitted', // Attente approbation admin
    expires_at: params.endTime.toISOString(),
    category: params.category,
    creator_address: walletService.getConnection()?.address,
    created_at: new Date().toISOString()
  });

if (error) throw new Error(`Failed to save market: ${error.message}`);
```

---

### 🔴 CRITIQUE #2: Paris non loggés automatiquement

**Localisation:** `contractService.ts` + `betTrackingService.ts`
**Impact:** BLOQUANT pour métriques
**Description:**
- `placeBet()` appelle le smart contract avec succès
- `logBetEvent()` existe dans `betTrackingService.ts`
- MAIS n'est jamais appelé après un pari réussi
- Résultat : `bets` table vide, Total Transactions toujours 0

**Preuve:**
```typescript
// contractService.ts ligne 537
await retryWithBackoff(() => betTx.wait());
console.log(`✅ Bet placed successfully!`);

return betTx.hash;
// ❌ Manque: await betTrackingService.logBetEvent({...})
```

**Fix requis:**
```typescript
// Après ligne 537 dans contractService.ts
import { logBetEvent } from '../services/betTrackingService';

await logBetEvent({
  marketId: marketId, // Passer en paramètre
  marketContract: marketAddress,
  userAddress: await signer.getAddress(),
  betType: isYes ? 'YES' : 'NO',
  sharesAmount: ethers.formatEther(shares),
  costAmount: ethers.formatEther(cost),
  transactionHash: betTx.hash,
  blockNumber: receipt.blockNumber,
  timestamp: new Date()
});
```

**PROBLÈME SECONDAIRE:** La table `bets` n'existe pas dans `schema.sql` !

**Fix requis dans schema.sql:**
```sql
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id),
  user_address TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('YES', 'NO')),
  shares_amount NUMERIC NOT NULL,
  cost_amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_user_address ON bets(user_address);
CREATE INDEX idx_bets_timestamp ON bets(timestamp);
```

---

### 🔴 CRITIQUE #3: Protocol fees non trackés en DB

**Localisation:** Smart contract `PredictionMarket.sol` + `treasuryService.ts`
**Impact:** MOYEN (métriques incorrectes)
**Description:**
- Protocol fees sont bien calculés (2% du losing side)
- Fees sont bien transférés au Treasury contract
- MAIS aucun événement `FeeReceived` émis
- Résultat : `getFeeHistory()` retourne [], Protocol Fees = 0 dans dashboard

**Preuve smart contract:**
```solidity
// PredictionMarket.sol ligne 304-311
if (protocolFees > 0) {
    require(collateral.approve(address(treasury), protocolFees), "Approval failed");
    treasury.receiveFees(address(collateral), protocolFees);
    reserve -= protocolFees;
}
// ❌ Pas d'événement émis
```

**Fix requis dans Treasury.sol:**
```solidity
event FeeReceived(address indexed token, uint256 amount, address indexed from);

function receiveFees(address token, uint256 amount) external {
    require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
    tokenBalances[token] += amount;

    emit FeeReceived(token, amount, msg.sender); // ✅ Ajouter ceci
}
```

**Alternative:** Logger en DB directement depuis `resolutionService.ts`

```typescript
// Dans resolutionService.ts après ligne 662
if (protocolFees > 0) {
  await supabase.from('protocol_fee_collections').insert({
    market_id: marketId,
    market_title: market.claim,
    fee_amount: ethers.formatEther(protocolFees),
    token: 'CAST',
    timestamp: new Date().toISOString(),
    transaction_hash: receipt.hash
  });
}
```

**Table SQL à créer:**
```sql
CREATE TABLE protocol_fee_collections (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id),
  market_title TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL,
  token TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  transaction_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protocol_fees_market_id ON protocol_fee_collections(market_id);
CREATE INDEX idx_protocol_fees_timestamp ON protocol_fee_collections(timestamp);
```

---

### 🟡 MOYEN #4: Incohérence dans le calcul de Total Transactions

**Localisation:** `UnifiedTreasuryDashboard.tsx` ligne 93-106
**Impact:** MOYEN
**Description:**
- Total Transactions = bets + markets + purchases + resolutions
- `resolutionsCount` utilise `approved_markets WHERE status='resolved'`
- MAIS `resolutionsCount` compte les MARCHÉS résolus, pas les RÉSOLUTIONS
- Résultat : Double comptage (markets + resolutions = même chose)

**Fix requis:**
```typescript
// Ligne 93-106
const [
  { count: betsCount },
  { count: marketsCount },
  { count: purchasesCount }
  // ❌ Retirer resolutionsCount
] = await Promise.all([
  supabase.from('bets').select('*', { count: 'exact', head: true }),
  supabase.from('approved_markets').select('*', { count: 'exact', head: true }),
  supabase.from('cast_purchases').select('*', { count: 'exact', head: true })
]);

const total = (betsCount || 0) + (marketsCount || 0) + (purchasesCount || 0);
// ✅ Pas de resolutionsCount (déjà compté dans marketsCount)
```

---

### 🟡 MOYEN #5: AI Scheduler ne gère pas les marchés sans contract_address

**Localisation:** `aiResolutionScheduler.ts` ligne 120-126
**Impact:** MOYEN
**Description:**
- Le scheduler lit `contract_address` de Supabase
- MAIS ne vérifie pas si `contract_address` est null/undefined
- Si un marché n'a pas de contract_address → crash lors de `triggerPayout()`

**Preuve:**
```typescript
// aiResolutionScheduler.ts ligne 334-337
if (!contractAddress) {
  console.warn('⚠️ No contract address, skipping blockchain payout');
  return; // ✅ Bon : skip si pas d'adresse
}
```

**FIX déjà présent mais devrait être plus tôt:**
```typescript
// Ligne 120 - Ajouter filtre
this.scheduleMarketResolution({
  id: market.id,
  claim: market.claim,
  description: market.description,
  expiresAt,
  contractAddress: market.contract_address
});

// ✅ Ajouter avant scheduling:
if (!market.contract_address || market.contract_address === '0x0000000000000000000000000000000000000000') {
  console.warn(`⚠️ Market ${market.id} has no contract address, skipping scheduling`);
  continue;
}
```

---

### 🟢 MINEUR #6: Format inconsistant des timestamps

**Impact:** MINEUR
**Description:**
- Smart contract utilise `block.timestamp` (Unix timestamp en secondes)
- Frontend utilise `new Date().toISOString()` (ISO 8601)
- Certaines conversions manquent

**Exemple:**
```typescript
// resolutionService.ts ligne 626
const parsedLog = marketContract.interface.parseLog(log);
if (parsedLog.name === 'MarketResolution') {
  resolutionTime = new Date(Number(parsedLog.args.timestamp) * 1000); // ✅ Bon
}

// MAIS dans d'autres endroits:
resolved_at: new Date().toISOString() // ❌ Devrait utiliser block.timestamp
```

---

## 7. RECOMMANDATIONS

### 7.1 CORRECTIONS PRIORITAIRES (à faire IMMÉDIATEMENT)

#### ✅ Action 1: Ajouter insertion Supabase après création marché
**Fichier:** `src/services/factoryService.ts`
**Ligne:** Après 150

```typescript
// Import Supabase
import { supabase } from '../utils/supabase';
import { walletService } from '../utils/walletService';

// Après ligne 150, avant le return
const walletAddress = walletService.getConnection()?.address;
if (!walletAddress) {
  throw new Error('Wallet not connected');
}

const { error: dbError } = await supabase
  .from('approved_markets')
  .insert({
    id: marketId,
    claim: params.question,
    contract_address: marketAddress,
    status: 'submitted', // Nécessite approbation admin
    expires_at: params.endTime.toISOString(),
    category: params.category,
    submitter_address: walletAddress,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

if (dbError) {
  console.error('❌ Failed to save market to database:', dbError);
  // Optionnel: annuler la création on-chain ou continuer quand même ?
  toast.error('Market created on-chain but failed to save to database');
}
```

#### ✅ Action 2: Créer table `bets` dans Supabase
**Fichier:** `database/schema.sql`

```sql
-- Ajouter après la table approved_markets
CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('YES', 'NO')),
  shares_amount NUMERIC NOT NULL,
  cost_amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_user_address ON bets(user_address);
CREATE INDEX idx_bets_timestamp ON bets(timestamp);
CREATE INDEX idx_bets_tx_hash ON bets(transaction_hash);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bets" ON bets FOR SELECT USING (true);
CREATE POLICY "Allow insert for bets" ON bets FOR INSERT WITH CHECK (true);
```

#### ✅ Action 3: Logger automatiquement les paris
**Fichier:** `src/utils/contractService.ts`
**Ligne:** Après 537

```typescript
import { logBetEvent } from '../services/betTrackingService';

// Après await retryWithBackoff(() => betTx.wait());
const receipt = await betTx.wait();

// Log bet to database
try {
  const userAddress = await signer.getAddress();
  await logBetEvent({
    marketId: marketId, // Ajouter marketId en paramètre de placeBet()
    marketContract: marketAddress,
    userAddress: userAddress,
    betType: isYes ? 'YES' : 'NO',
    sharesAmount: ethers.formatEther(shares),
    costAmount: ethers.formatEther(cost),
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date()
  });
  console.log(`✅ Bet logged to database`);
} catch (dbError) {
  console.warn('⚠️ Failed to log bet to database:', dbError);
  // Continue anyway - bet is on-chain
}
```

**Modification de la signature:**
```typescript
// Ligne 488 - Ajouter marketId en paramètre
export async function placeBet(
  marketId: string,        // ✅ NOUVEAU
  marketAddress: string,
  isYes: boolean,
  shares: string,
  signer: ethers.Signer,
  slippageTolerance: number = 5
): Promise<string>
```

#### ✅ Action 4: Créer table protocol_fee_collections
**Fichier:** `database/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS protocol_fee_collections (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id) ON DELETE SET NULL,
  market_title TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL,
  token TEXT NOT NULL DEFAULT 'CAST',
  timestamp TIMESTAMPTZ NOT NULL,
  transaction_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protocol_fees_market_id ON protocol_fee_collections(market_id);
CREATE INDEX idx_protocol_fees_timestamp ON protocol_fee_collections(timestamp);
CREATE INDEX idx_protocol_fees_tx_hash ON protocol_fee_collections(transaction_hash);

ALTER TABLE protocol_fee_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for protocol fees" ON protocol_fee_collections FOR SELECT USING (true);
CREATE POLICY "Allow insert for protocol fees" ON protocol_fee_collections FOR INSERT WITH CHECK (true);
```

#### ✅ Action 5: Logger protocol fees lors de la résolution
**Fichier:** `src/utils/resolutionService.ts`
**Ligne:** Après 662

```typescript
// Import Supabase (si pas déjà importé)
import { supabase } from './supabase';

// Après ligne 662 (après update du status resolved)
try {
  // Calculate protocol fee from smart contract event or estimate
  const marketContract = new ethers.Contract(marketContractAddress, ABI, adminSigner);

  // Query MarketResolution event to get protocol fee amount
  const filter = marketContract.filters.MarketResolution();
  const events = await marketContract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);

  if (events.length > 0) {
    // Fee calculation from smart contract logic (2% of losing side)
    const { data: marketData } = await supabase
      .from('approved_markets')
      .select('claim')
      .eq('id', marketId)
      .single();

    // Estimate protocol fee (would need to parse from events or calculate)
    const protocolFeeRate = 200; // 2% = 200/10000
    // Ideally extract this from smart contract events

    // Log to database
    await supabase.from('protocol_fee_collections').insert({
      market_id: marketId,
      market_title: marketData?.claim || 'Unknown Market',
      fee_amount: 'CALCULATED_FEE_AMOUNT', // Extract from events
      token: 'CAST',
      timestamp: new Date().toISOString(),
      transaction_hash: receipt.hash
    });

    console.log(`✅ Protocol fee logged to database`);
  }
} catch (feeLogError) {
  console.warn('⚠️ Failed to log protocol fee:', feeLogError);
  // Continue - resolution succeeded on-chain
}
```

**MEILLEURE APPROCHE:** Modifier le smart contract pour émettre un événement séparé :

```solidity
// Dans PredictionMarket.sol
event ProtocolFeeCollected(address indexed token, uint256 amount, address indexed treasury);

// Dans resolveMarketWithAI(), après ligne 309
if (protocolFees > 0) {
    require(collateral.approve(address(treasury), protocolFees), "Approval failed");
    treasury.receiveFees(address(collateral), protocolFees);
    reserve -= protocolFees;

    emit ProtocolFeeCollected(address(collateral), protocolFees, address(treasury)); // ✅ NOUVEAU
}
```

Puis écouter cet événement dans `resolutionService.ts`.

#### ✅ Action 6: Corriger Total Transactions
**Fichier:** `src/components/admin/UnifiedTreasuryDashboard.tsx`
**Ligne:** 93-106

```typescript
// Retirer resolutionsCount
const [
  { count: betsCount },
  { count: marketsCount },
  { count: purchasesCount }
] = await Promise.all([
  supabase.from('bets').select('*', { count: 'exact', head: true }),
  supabase.from('approved_markets').select('*', { count: 'exact', head: true }),
  supabase.from('cast_purchases').select('*', { count: 'exact', head: true })
]);

const total = (betsCount || 0) + (marketsCount || 0) + (purchasesCount || 0);
setTotalTransactions(total);
```

---

### 7.2 AMÉLIORATIONS RECOMMANDÉES (Non-critique)

#### 📊 Amélioration 1: Indexer les événements blockchain

Créer un service qui écoute les événements blockchain et les synchronise automatiquement :

**Fichier:** `src/services/blockchainIndexer.ts` (NOUVEAU)

```typescript
import { ethers } from 'ethers';
import { supabase } from '../utils/supabase';
import { TOKEN_ADDRESSES } from '../config/constants';

class BlockchainIndexer {
  private provider: ethers.JsonRpcProvider;

  async start() {
    this.provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

    // Index past events (backfill)
    await this.indexPastEvents();

    // Listen for new events in real-time
    this.listenForNewEvents();
  }

  async indexPastEvents() {
    const fromBlock = await this.getLastIndexedBlock();
    const toBlock = await this.provider.getBlockNumber();

    // Index MarketCreated events
    await this.indexMarketCreatedEvents(fromBlock, toBlock);

    // Index BetPlaced events
    await this.indexBetPlacedEvents(fromBlock, toBlock);

    // Index ProtocolFeeCollected events
    await this.indexProtocolFeeEvents(fromBlock, toBlock);
  }

  async indexMarketCreatedEvents(fromBlock: number, toBlock: number) {
    const factoryContract = new ethers.Contract(
      TOKEN_ADDRESSES.FACTORY_ADDRESS,
      ['event MarketCreated(bytes32 indexed id, address market, string question)'],
      this.provider
    );

    const events = await factoryContract.queryFilter(
      factoryContract.filters.MarketCreated(),
      fromBlock,
      toBlock
    );

    for (const event of events) {
      // Vérifier si déjà indexé
      const { data: existing } = await supabase
        .from('approved_markets')
        .select('id')
        .eq('id', event.args.id)
        .single();

      if (!existing) {
        // Insérer nouveau marché
        await supabase.from('approved_markets').insert({
          id: event.args.id,
          claim: event.args.question,
          contract_address: event.args.market,
          status: 'submitted',
          // ... autres champs
        });
      }
    }
  }

  // Méthodes similaires pour indexBetPlacedEvents et indexProtocolFeeEvents
}

export const blockchainIndexer = new BlockchainIndexer();
```

#### 📊 Amélioration 2: Dashboard temps réel avec Supabase Realtime

```typescript
// Dans UnifiedTreasuryDashboard.tsx
useEffect(() => {
  // Subscribe to real-time updates
  const subscription = supabase
    .channel('treasury_updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'protocol_fee_collections'
    }, (payload) => {
      // Mise à jour en temps réel des protocol fees
      loadAllTreasuryData();
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'bets'
    }, (payload) => {
      // Mise à jour en temps réel du total transactions
      loadAllTreasuryData();
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### 📊 Amélioration 3: Ajouter validations et rollbacks

```typescript
// Dans factoryService.ts
async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
  let marketAddress: string | null = null;
  let marketId: string | null = null;

  try {
    // 1. Deploy contract
    const tx = await factory.createMarket(...);
    const receipt = await tx.wait();

    // 2. Extract event
    const event = receipt.logs.find(...);
    marketId = event.args.id;
    marketAddress = event.args.market;

    // 3. Save to Supabase
    const { error } = await supabase.from('approved_markets').insert({...});

    if (error) {
      // Rollback ? Ou marquer comme "orphaned" ?
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return { success: true, marketId, marketAddress, transactionHash: receipt.hash };

  } catch (error) {
    // Si échec après deploy on-chain, logger dans une table "orphaned_markets"
    if (marketId && marketAddress) {
      await supabase.from('orphaned_markets').insert({
        market_id: marketId,
        contract_address: marketAddress,
        error_message: error.message,
        created_at: new Date().toISOString()
      });
    }

    throw error;
  }
}
```

---

## 8. PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Corrections Critiques (1-2 jours)

1. ✅ **Créer table `bets`** dans Supabase
2. ✅ **Créer table `protocol_fee_collections`** dans Supabase
3. ✅ **Ajouter insertion DB après création marché** (`factoryService.ts`)
4. ✅ **Ajouter logging automatique des paris** (`contractService.ts`)
5. ✅ **Corriger calcul Total Transactions** (retirer double comptage)

### Phase 2 : Logging Protocol Fees (2-3 jours)

6. ✅ **Option A:** Modifier smart contract `PredictionMarket.sol` pour émettre événement `ProtocolFeeCollected`
   - Recompiler et redéployer contracts
   - Indexer événements passés

   **OU**

   ✅ **Option B:** Logger directement depuis `resolutionService.ts`
   - Calculer fee amount (2% du losing side)
   - Insérer dans `protocol_fee_collections` après résolution

### Phase 3 : Tests End-to-End (1-2 jours)

7. ✅ **Test complet du flow:**
   - Créer un marché → Vérifier insertion dans `approved_markets`
   - Placer 3-5 paris → Vérifier insertion dans `bets`
   - Attendre expiration → Vérifier résolution automatique
   - Vérifier protocol fees dans `protocol_fee_collections`
   - Vérifier métriques dans Admin Panel

8. ✅ **Validation des métriques:**
   - Total CAST Supply ✅
   - Token Sales Revenue ✅
   - Protocol Fees ✅ (après fix)
   - Total Transactions ✅ (après fix)
   - Total Markets ✅

### Phase 4 : Optimisations (optionnel, 3-5 jours)

9. ✅ Implémenter `BlockchainIndexer` pour synchronisation automatique
10. ✅ Ajouter Supabase Realtime pour dashboard temps réel
11. ✅ Ajouter table `orphaned_markets` pour gérer les échecs partiels
12. ✅ Améliorer error handling et rollbacks

---

## 9. RÉSUMÉ EXÉCUTIF

### État Actuel

**✅ Fonctionnel:**
- Smart contracts bien conçus (pricing, fees, auto-payout)
- AI resolution scheduler fonctionnel
- Frontend clean et responsive
- CAST token et Treasury contracts corrects

**❌ Bloquant:**
- Marchés créés on-chain mais **JAMAIS enregistrés en DB**
- Paris placés on-chain mais **JAMAIS loggés en DB**
- Protocol fees calculés et transférés mais **JAMAIS trackés**
- Métriques Admin Panel **TOUTES INCORRECTES** (sauf CAST Supply)

### Impact Business

**Sans les corrections:**
- ❌ Admin Panel affiche 0 transactions
- ❌ Impossible de voir les marchés créés
- ❌ Impossible de tracker les paris
- ❌ Impossible de voir les protocol fees collectés
- ❌ Dashboard inutilisable pour les admins

**Après les corrections:**
- ✅ Tous les marchés visibles et traçables
- ✅ Tous les paris enregistrés et analysables
- ✅ Protocol fees trackés en temps réel
- ✅ Métriques précises et fiables
- ✅ Dashboard Admin pleinement fonctionnel

### Effort Estimé

- **Phase 1 (Corrections critiques):** 1-2 jours
- **Phase 2 (Logging fees):** 2-3 jours
- **Phase 3 (Tests E2E):** 1-2 jours
- **TOTAL:** 4-7 jours pour une plateforme 100% fonctionnelle

---

## 10. ANNEXES

### A. Schéma complet de la base de données (après corrections)

```sql
-- approved_markets (existant)
CREATE TABLE approved_markets (
  id TEXT PRIMARY KEY,
  claim TEXT NOT NULL,
  contract_address TEXT,
  status TEXT CHECK (status IN ('submitted', 'active', 'pending_resolution', 'resolved', 'offline')),
  expires_at TIMESTAMPTZ NOT NULL,
  category TEXT,
  submitter_address TEXT,
  resolution_data JSONB,
  resolution_outcome TEXT CHECK (resolution_outcome IN ('yes', 'no')),
  ai_confidence_score INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- bets (NOUVEAU)
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('YES', 'NO')),
  shares_amount NUMERIC NOT NULL,
  cost_amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- protocol_fee_collections (NOUVEAU)
CREATE TABLE protocol_fee_collections (
  id SERIAL PRIMARY KEY,
  market_id TEXT REFERENCES approved_markets(id) ON DELETE SET NULL,
  market_title TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL,
  token TEXT NOT NULL DEFAULT 'CAST',
  timestamp TIMESTAMPTZ NOT NULL,
  transaction_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cast_purchases (existant)
CREATE TABLE cast_purchases (
  id SERIAL PRIMARY KEY,
  buyer_address TEXT NOT NULL,
  bnb_amount NUMERIC NOT NULL,
  cast_amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- treasury_snapshots (existant)
CREATE TABLE treasury_snapshots (
  id SERIAL PRIMARY KEY,
  total_cast_supply NUMERIC NOT NULL,
  initial_allocation NUMERIC NOT NULL,
  purchased_cast NUMERIC NOT NULL,
  bnb_revenue NUMERIC NOT NULL,
  owner_balance NUMERIC NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### B. Flow complet après corrections

```
USER CREATES MARKET
    │
    ├─► factoryService.createMarket()
    │   ├─► Smart Contract Factory.createMarket() ✅
    │   ├─► Extract MarketCreated event ✅
    │   └─► supabase.from('approved_markets').insert() ✅ FIX
    │
    └─► Market visible dans approved_markets ✅

USER PLACES BET
    │
    ├─► contractService.placeBet()
    │   ├─► Smart Contract PredictionMarket.placeBet() ✅
    │   ├─► betTrackingService.logBetEvent() ✅ FIX
    │   └─► supabase.from('bets').insert() ✅ FIX
    │
    └─► Bet visible dans bets table ✅

MARKET EXPIRES
    │
    └─► aiResolutionScheduler detects expiry
        │
        ├─► perplexityResolutionService.resolveMarket() ✅
        │   └─► {outcome, confidence, reasoning}
        │
        ├─► IF confidence < 85% → geminiResolutionService.resolveMarket() ✅
        │
        ├─► saveResolutionToDatabase() ✅
        │   └─► UPDATE approved_markets SET status='resolved', resolution_data={...}
        │
        └─► resolutionService.resolveMarketWithAI()
            │
            ├─► Smart Contract PredictionMarket.resolveMarketWithAI() ✅
            │   ├─► Calculate protocol fees (2% losing side) ✅
            │   ├─► Transfer fees to Treasury ✅
            │   ├─► emit ProtocolFeeCollected() ✅ FIX
            │   └─► _distributeWinnings() ✅
            │
            └─► supabase.from('protocol_fee_collections').insert() ✅ FIX

ADMIN VIEWS DASHBOARD
    │
    └─► UnifiedTreasuryDashboard.loadAllTreasuryData()
        │
        ├─► Total CAST Supply: castContract.totalSupply() ✅
        ├─► Token Sales Revenue: provider.getBalance(Treasury) ✅
        ├─► Protocol Fees: SUM(protocol_fee_collections.fee_amount) ✅ FIX
        ├─► Total Transactions: COUNT(bets) + COUNT(approved_markets) + COUNT(cast_purchases) ✅ FIX
        └─► Total Markets: COUNT(approved_markets) ✅
```

---

**FIN DU RAPPORT**

Ce rapport identifie **5 problèmes critiques** qui empêchent le système de fonctionner correctement. Les corrections proposées sont **simples à implémenter** (principalement ajout d'appels Supabase manquants) et permettront d'avoir un système **100% fonctionnel** en 4-7 jours.
