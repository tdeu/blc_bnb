/**
 * Adaptive Resolution Service
 *
 * Implements dynamic weighting system that adjusts based on evidence-market alignment.
 * This catches potential market manipulation by reducing market weight when high-quality
 * evidence contradicts the market consensus.
 */

import { RESOLUTION_CONFIG, ResolutionWeights } from '../config/resolutionConfig';

export type WeightingStrategy = 'STANDARD' | 'MARKET_VALIDATED' | 'EVIDENCE_CONTRADICTS';

export interface SignalBreakdown {
  score: number;
  weight: number;
  contribution: number;
  reasoning: string;
}

export interface AdaptiveResolution {
  finalDecision: 'YES' | 'NO';
  confidence: number;
  strategy: WeightingStrategy;
  explanation: string;
  breakdown: {
    market: SignalBreakdown;
    evidence: SignalBreakdown;
    ai: SignalBreakdown;
  };
  metadata: {
    evidenceCount: number;
    evidenceConsensusScore: number;
    suspectManipulation: boolean;
    weightsUsed: ResolutionWeights;
  };
}

interface Evidence {
  id: string;
  stance: 'supporting_yes' | 'supporting_no';
  status: string;
  admin_validated_legitimate?: boolean | null;
  admin_validated_against_community?: boolean | null;
}

interface Market {
  id: string;
  claim: string;
  yesOdds: number;
  ai_resolution?: {
    recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
    confidence: number;
    reasoning?: string;
  };
}

interface EvidenceAlignment {
  consensusScore: number;
  evidenceScore: number;
  suspectManipulation: boolean;
}

/**
 * Main function: Calculate adaptive resolution for a market
 */
export async function calculateAdaptiveResolution(
  market: Market,
  evidence: Evidence[]
): Promise<AdaptiveResolution> {

  console.log(`🎯 Calculating adaptive resolution for market: ${market.id}`);

  // 1. Get signal values
  const marketOdds = market.yesOdds;
  const aiAnalysis = market.ai_resolution;

  if (!aiAnalysis) {
    throw new Error('AI analysis required for adaptive resolution');
  }

  // 2. Analyze evidence-market alignment
  const evidenceAlignment = analyzeEvidenceAlignment(marketOdds, evidence);

  console.log(`📊 Evidence alignment: consensusScore=${evidenceAlignment.consensusScore.toFixed(2)}, evidenceScore=${evidenceAlignment.evidenceScore.toFixed(2)}`);

  // 3. Select weighting strategy
  const { strategy, weights, explanation } = selectWeightingStrategy(
    evidenceAlignment.consensusScore,
    evidence.length,
    marketOdds,
    evidenceAlignment.evidenceScore
  );

  console.log(`⚖️  Selected strategy: ${strategy}`);
  console.log(`⚖️  Weights: Market ${weights.market * 100}% | Evidence ${weights.evidence * 100}% | AI ${weights.ai * 100}%`);

  // 4. Calculate weighted confidence
  const marketContribution = marketOdds * weights.market * 100;

  const evidenceScore = evidenceAlignment.evidenceScore;
  const evidenceContribution = evidenceScore * weights.evidence * 100;

  // Convert AI recommendation to score (YES=confidence, NO=1-confidence, INCONCLUSIVE=0.5)
  const aiScore = aiAnalysis.recommendation === 'YES'
    ? aiAnalysis.confidence
    : aiAnalysis.recommendation === 'NO'
      ? (1 - aiAnalysis.confidence)
      : 0.5;

  const aiContribution = aiScore * weights.ai * 100;

  const finalConfidence = marketContribution + evidenceContribution + aiContribution;

  // 5. Determine final decision
  const finalDecision = finalConfidence > 50 ? 'YES' : 'NO';

  console.log(`✅ Final decision: ${finalDecision} with ${finalConfidence.toFixed(1)}% confidence`);

  return {
    finalDecision,
    confidence: finalConfidence,
    strategy,
    explanation,
    breakdown: {
      market: {
        score: marketOdds,
        weight: weights.market,
        contribution: marketContribution,
        reasoning: `Current market odds: ${(marketOdds * 100).toFixed(1)}% YES`
      },
      evidence: {
        score: evidenceScore,
        weight: weights.evidence,
        contribution: evidenceContribution,
        reasoning: evidence.length === 0
          ? "No evidence submitted"
          : `${evidence.length} evidence submission(s) analyzed - ${(evidenceScore * 100).toFixed(1)}% YES`
      },
      ai: {
        score: aiScore,
        weight: weights.ai,
        contribution: aiContribution,
        reasoning: `AI recommendation: ${aiAnalysis.recommendation} with ${(aiAnalysis.confidence * 100).toFixed(0)}% confidence`
      }
    },
    metadata: {
      evidenceCount: evidence.length,
      evidenceConsensusScore: evidenceAlignment.consensusScore,
      suspectManipulation: evidenceAlignment.suspectManipulation,
      weightsUsed: weights
    }
  };
}

/**
 * Analyze how much evidence aligns with market odds
 */
function analyzeEvidenceAlignment(
  marketOdds: number,
  evidence: Evidence[]
): EvidenceAlignment {

  if (evidence.length === 0) {
    return {
      consensusScore: 1.0, // No challenge = perfect consensus
      evidenceScore: marketOdds, // Default to market odds
      suspectManipulation: false
    };
  }

  // Calculate weighted evidence direction
  let yesWeight = 0;
  let noWeight = 0;

  evidence.forEach(e => {
    // Only count accepted evidence
    if (e.status !== 'accepted') {
      return;
    }

    // Apply multipliers for quality evidence
    const multiplier = getEvidenceMultiplier(e);

    if (e.stance === 'supporting_yes') {
      yesWeight += multiplier;
    } else if (e.stance === 'supporting_no') {
      noWeight += multiplier;
    }
  });

  const totalWeight = yesWeight + noWeight;

  if (totalWeight === 0) {
    // All evidence rejected or no valid stance
    return {
      consensusScore: 1.0,
      evidenceScore: marketOdds,
      suspectManipulation: false
    };
  }

  // Calculate evidence score (what % of evidence supports YES)
  const evidenceScore = yesWeight / totalWeight;

  // Does evidence agree with market?
  const evidenceSaysYes = yesWeight > noWeight;
  const marketSaysYes = marketOdds > 0.5;

  let consensusScore: number;

  if (evidenceSaysYes === marketSaysYes) {
    // Agreement - calculate how strong
    const strongerWeight = Math.max(yesWeight, noWeight);
    const agreementStrength = strongerWeight / totalWeight;
    consensusScore = agreementStrength;
  } else {
    // Disagreement - calculate how strong
    const weakerWeight = Math.min(yesWeight, noWeight);
    const disagreementStrength = weakerWeight / totalWeight;
    consensusScore = disagreementStrength;
  }

  // Flag potential manipulation if evidence strongly contradicts market
  const suspectManipulation = consensusScore < RESOLUTION_CONFIG.thresholds.evidenceContradicts;

  return {
    consensusScore,
    evidenceScore,
    suspectManipulation
  };
}

/**
 * Get evidence multiplier based on admin validation
 */
function getEvidenceMultiplier(evidence: Evidence): number {
  const { evidenceMultipliers } = RESOLUTION_CONFIG;

  const isLegitimate = evidence.admin_validated_legitimate === true;
  const isAgainstCommunity = evidence.admin_validated_against_community === true;

  if (isLegitimate && isAgainstCommunity) {
    return evidenceMultipliers.legitimateAndContrarian;
  } else if (isLegitimate) {
    return evidenceMultipliers.legitimateOnly;
  } else {
    return evidenceMultipliers.regular;
  }
}

/**
 * Select appropriate weighting strategy based on evidence-market alignment
 */
function selectWeightingStrategy(
  consensusScore: number,
  evidenceCount: number,
  marketOdds: number,
  evidenceScore: number
): {
  strategy: WeightingStrategy;
  weights: ResolutionWeights;
  explanation: string;
} {

  const { thresholds, weights } = RESOLUTION_CONFIG;

  // Strategy 1: MARKET_VALIDATED
  // When: No evidence OR evidence strongly agrees with market (consensusScore >= 0.8)
  if (consensusScore >= thresholds.marketValidated) {
    return {
      strategy: 'MARKET_VALIDATED',
      weights: weights.marketValidated,
      explanation: evidenceCount === 0
        ? "No contradicting evidence submitted. Market consensus appears reliable. Market weight increased to 60%."
        : `Evidence strongly supports market direction (${(consensusScore * 100).toFixed(0)}% alignment). Market weight increased to 60%.`
    };
  }

  // Strategy 2: EVIDENCE_CONTRADICTS
  // When: Evidence strongly contradicts market (consensusScore <= 0.2)
  if (consensusScore <= thresholds.evidenceContradicts) {
    const marketYesPercent = (marketOdds * 100).toFixed(0);
    const evidenceYesPercent = (evidenceScore * 100).toFixed(0);

    return {
      strategy: 'EVIDENCE_CONTRADICTS',
      weights: weights.evidenceContradicts,
      explanation: `High-quality evidence strongly contradicts market odds (market: ${marketYesPercent}% YES, evidence: ${evidenceYesPercent}% YES). Market weight reduced to 20% to account for possible manipulation.`
    };
  }

  // Strategy 3: STANDARD
  // When: Mixed signals (consensusScore between 0.2 and 0.8)
  return {
    strategy: 'STANDARD',
    weights: weights.standard,
    explanation: "Evidence partially aligns with market. Using balanced weighting across all signals."
  };
}

/**
 * Helper: Get confidence level label based on percentage
 */
export function getConfidenceLevel(confidence: number): {
  label: string;
  color: 'green' | 'blue' | 'yellow' | 'red';
} {
  if (confidence >= 80) {
    return { label: 'HIGH', color: 'green' };
  } else if (confidence >= 60) {
    return { label: 'MODERATE', color: 'blue' };
  } else if (confidence >= 40) {
    return { label: 'LOW', color: 'yellow' };
  } else {
    return { label: 'VERY LOW', color: 'red' };
  }
}

/**
 * Helper: Format strategy name for display
 */
export function formatStrategyName(strategy: WeightingStrategy): string {
  switch (strategy) {
    case 'MARKET_VALIDATED':
      return 'Market Validated';
    case 'EVIDENCE_CONTRADICTS':
      return 'Evidence Contradicts Market';
    case 'STANDARD':
      return 'Standard (Mixed Signals)';
  }
}

/**
 * Helper: Get strategy emoji/icon
 */
export function getStrategyIcon(strategy: WeightingStrategy): string {
  switch (strategy) {
    case 'MARKET_VALIDATED':
      return '✅';
    case 'EVIDENCE_CONTRADICTS':
      return '⚠️';
    case 'STANDARD':
      return '⚖️';
  }
}
