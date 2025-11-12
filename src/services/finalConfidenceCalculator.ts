/**
 * Final Confidence Calculator Service
 *
 * Calculates the final confidence score for market resolution using adaptive weighting:
 * - MARKET_VALIDATED: 60% Market / 10% Evidence / 30% AI (when evidence agrees with market)
 * - EVIDENCE_CONTRADICTS: 20% Market / 30% Evidence / 50% AI (when evidence contradicts market)
 * - STANDARD: 35% Market / 25% Evidence / 40% AI (mixed signals)
 *
 * This catches market manipulation by reducing market weight when high-quality evidence contradicts it.
 */

import { calculateAdaptiveResolution, WeightingStrategy } from './adaptiveResolutionService';

export interface EvidenceForCalculation {
  id: string;
  stance?: 'supporting' | 'disputing' | 'neutral' | 'supporting_yes' | 'supporting_no';
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  admin_validated_legitimate?: boolean | null;
  admin_validated_against_community?: boolean | null;
  quality_score?: number;
  source_credibility_score?: number;
}

export interface ConfidenceInput {
  // Market Odds
  yesOdds: number;
  noOdds: number;

  // Evidence
  evidences: EvidenceForCalculation[];

  // External API
  aiRecommendation: 'YES' | 'NO' | 'NEUTRAL' | 'INCONCLUSIVE';
  aiConfidence: number; // 0-1
  apiSourceType?: string;
}

export interface ConfidenceBreakdown {
  finalConfidence: number; // 0-100
  finalRecommendation: 'YES' | 'NO';

  // Adaptive weighting strategy
  strategy: WeightingStrategy;
  strategyExplanation: string;
  suspectManipulation: boolean;

  // Component scores (now with adaptive weights)
  marketOddsScore: number; // 0-100
  marketOddsWeight: number; // Adaptive: 20-60
  marketOddsContribution: number; // score * weight / 100

  evidenceScore: number; // 0-100
  evidenceWeight: number; // Adaptive: 10-30
  evidenceContribution: number; // score * weight / 100

  apiScore: number; // 0-100
  apiWeight: number; // Adaptive: 30-50
  apiContribution: number; // score * weight / 100

  // Detailed breakdown
  marketOddsDetails: {
    yesOdds: number;
    noOdds: number;
    yesImpliedProbability: number;
    noImpliedProbability: number;
    confidenceFromOdds: number;
  };

  evidenceDetails: {
    totalEvidences: number;
    acceptedEvidences: number;
    legitimateCount: number;
    againstCommunityCount: number;
    legitimateAndAgainstCommunity: number;
    yesSupporting: number;
    noSupporting: number;
    neutralCount: number;
    weightedYesScore: number;
    weightedNoScore: number;
    evidenceConsensusScore?: number; // New: how much evidence agrees with market
  };

  apiDetails: {
    recommendation: 'YES' | 'NO' | 'NEUTRAL';
    rawConfidence: number;
    sourceType?: string;
  };
}

export class FinalConfidenceCalculator {
  /**
   * Calculate the final confidence score using ADAPTIVE WEIGHTING
   *
   * Weights adjust dynamically based on evidence-market alignment:
   * - If evidence agrees with market → boost market weight (MARKET_VALIDATED)
   * - If evidence contradicts market → reduce market weight (EVIDENCE_CONTRADICTS)
   * - If mixed signals → balanced weights (STANDARD)
   */
  async calculate(input: ConfidenceInput): Promise<ConfidenceBreakdown> {
    console.log('🎯 [FinalConfidenceCalculator] Starting adaptive calculation...');

    // 1. Calculate Market Odds component
    const marketOddsDetails = this.calculateMarketOddsScore(input.yesOdds, input.noOdds);

    // 2. Normalize evidence format for adaptive service
    const normalizedEvidence = this.normalizeEvidence(input.evidences);

    // 3. Run ADAPTIVE RESOLUTION to get dynamic weights
    const adaptiveResult = await calculateAdaptiveResolution(
      {
        id: 'temp',
        claim: '',
        yesOdds: marketOddsDetails.yesImpliedProbability,
        ai_resolution: {
          recommendation: input.aiRecommendation as 'YES' | 'NO' | 'INCONCLUSIVE',
          confidence: input.aiConfidence,
          reasoning: input.apiSourceType
        }
      },
      normalizedEvidence
    );

    console.log(`⚖️  [FinalConfidenceCalculator] Strategy: ${adaptiveResult.strategy}`);
    console.log(`⚖️  [FinalConfidenceCalculator] Weights: Market ${adaptiveResult.metadata.weightsUsed.market * 100}% | Evidence ${adaptiveResult.metadata.weightsUsed.evidence * 100}% | AI ${adaptiveResult.metadata.weightsUsed.ai * 100}%`);

    // 4. Calculate Evidence component with detailed breakdown
    const evidenceDetails = this.calculateEvidenceScore(input.evidences, marketOddsDetails.yesImpliedProbability);
    evidenceDetails.evidenceConsensusScore = adaptiveResult.metadata.evidenceConsensusScore;

    // 5. Calculate API component
    const apiDetails = this.calculateAPIScore(input.aiRecommendation, input.aiConfidence, input.apiSourceType);

    // 6. Use adaptive weights (convert from 0-1 to 0-100 scale)
    const marketWeight = adaptiveResult.metadata.weightsUsed.market * 100;
    const evidenceWeight = adaptiveResult.metadata.weightsUsed.evidence * 100;
    const apiWeight = adaptiveResult.metadata.weightsUsed.ai * 100;

    // 7. Combine weighted scores
    const marketOddsContribution = (marketOddsDetails.confidenceFromOdds * marketWeight) / 100;
    const evidenceContribution = (evidenceDetails.weightedYesScore * evidenceWeight) / 100;
    const apiContribution = (apiDetails.rawConfidence * apiWeight) / 100;

    const finalConfidence = marketOddsContribution + evidenceContribution + apiContribution;

    // 8. Determine final recommendation
    const finalRecommendation: 'YES' | 'NO' = finalConfidence >= 50 ? 'YES' : 'NO';

    console.log(`✅ [FinalConfidenceCalculator] Final decision: ${finalRecommendation} with ${finalConfidence.toFixed(1)}% confidence`);

    return {
      finalConfidence: Math.round(finalConfidence * 100) / 100,
      finalRecommendation,

      // Adaptive strategy info
      strategy: adaptiveResult.strategy,
      strategyExplanation: adaptiveResult.explanation,
      suspectManipulation: adaptiveResult.metadata.suspectManipulation,

      // Component scores with ADAPTIVE weights
      marketOddsScore: marketOddsDetails.confidenceFromOdds,
      marketOddsWeight: Math.round(marketWeight),
      marketOddsContribution,

      evidenceScore: evidenceDetails.weightedYesScore,
      evidenceWeight: Math.round(evidenceWeight),
      evidenceContribution,

      apiScore: apiDetails.rawConfidence,
      apiWeight: Math.round(apiWeight),
      apiContribution,

      marketOddsDetails,
      evidenceDetails,
      apiDetails
    };
  }

  /**
   * Normalize evidence format for adaptive resolution service
   * Handles both old format ('supporting'/'disputing') and new format ('supporting_yes'/'supporting_no')
   */
  private normalizeEvidence(evidences: EvidenceForCalculation[]): Array<{
    id: string;
    stance: 'supporting_yes' | 'supporting_no';
    status: string;
    admin_validated_legitimate?: boolean | null;
    admin_validated_against_community?: boolean | null;
  }> {
    return evidences
      .filter(e => e.status === 'accepted' || e.status === 'reviewed')
      .map(e => ({
        id: e.id,
        stance: this.normalizeStance(e.stance),
        status: e.status || 'accepted',
        admin_validated_legitimate: e.admin_validated_legitimate,
        admin_validated_against_community: e.admin_validated_against_community
      }))
      .filter(e => e.stance !== null) as Array<{
        id: string;
        stance: 'supporting_yes' | 'supporting_no';
        status: string;
        admin_validated_legitimate?: boolean | null;
        admin_validated_against_community?: boolean | null;
      }>;
  }

  /**
   * Convert old stance format to new format
   */
  private normalizeStance(stance?: string): 'supporting_yes' | 'supporting_no' | null {
    if (!stance) return null;

    switch (stance) {
      case 'supporting':
      case 'supporting_yes':
        return 'supporting_yes';
      case 'disputing':
      case 'supporting_no':
        return 'supporting_no';
      case 'neutral':
      default:
        return null;
    }
  }

  /**
   * Calculate score from market odds (0-100)
   * Higher odds for YES = higher score
   */
  private calculateMarketOddsScore(yesOdds: number, noOdds: number) {
    // Convert odds to implied probabilities
    // Implied probability = 1 / odds
    const yesImpliedProb = 1 / yesOdds;
    const noImpliedProb = 1 / noOdds;

    // Normalize to ensure they sum to 1
    const total = yesImpliedProb + noImpliedProb;
    const yesProb = yesImpliedProb / total;
    const noProb = noImpliedProb / total;

    // Convert to 0-100 scale
    // YES probability directly translates to confidence score
    const confidenceFromOdds = yesProb * 100;

    return {
      yesOdds,
      noOdds,
      yesImpliedProbability: yesProb,
      noImpliedProbability: noProb,
      confidenceFromOdds
    };
  }

  /**
   * Calculate score from evidence (0-100)
   * Evidence multipliers (from RESOLUTION_CONFIG):
   * - Legitimate + Against Community: 3x (challenges groupthink)
   * - Legitimate only: 1.5x
   * - Regular: 1x
   */
  private calculateEvidenceScore(evidences: EvidenceForCalculation[], marketYesProbability: number) {
    const acceptedEvidences = evidences.filter(e => e.status === 'accepted' || e.status === 'reviewed');

    let legitimateCount = 0;
    let againstCommunityCount = 0;
    let legitimateAndAgainstCommunity = 0;

    let weightedYesScore = 0;
    let weightedNoScore = 0;
    let totalWeight = 0;

    let yesSupporting = 0;
    let noSupporting = 0;
    let neutralCount = 0;

    for (const evidence of acceptedEvidences) {
      const isLegitimate = evidence.admin_validated_legitimate === true;
      const isAgainstCommunity = evidence.admin_validated_against_community === true;

      if (isLegitimate) legitimateCount++;
      if (isAgainstCommunity) againstCommunityCount++;
      if (isLegitimate && isAgainstCommunity) legitimateAndAgainstCommunity++;

      // Determine weight based on validation flags (matching resolutionConfig.ts)
      let weight = 1; // Regular evidence baseline
      if (isLegitimate && isAgainstCommunity) {
        weight = 3; // High value - challenges groupthink
      } else if (isLegitimate) {
        weight = 1.5; // Legitimate quality boost
      }

      // Apply quality score if available (0-100)
      const qualityMultiplier = evidence.quality_score ? evidence.quality_score / 100 : 1.0;
      weight *= qualityMultiplier;

      // Count stance - handle both old and new formats
      const normalizedStance = this.normalizeStance(evidence.stance);
      if (normalizedStance === 'supporting_yes') {
        weightedYesScore += weight;
        yesSupporting++;
      } else if (normalizedStance === 'supporting_no') {
        weightedNoScore += weight;
        noSupporting++;
      } else {
        neutralCount++;
        // Neutral evidence doesn't contribute to either side
      }

      totalWeight += Math.abs(weight);
    }

    // Calculate final evidence score (0-100)
    // If no evidence, return 50 (neutral)
    let finalEvidenceScore = 50;

    if (totalWeight > 0) {
      // Net score: positive = YES, negative = NO
      const netScore = weightedYesScore - weightedNoScore;

      // Normalize to 0-100 scale
      // netScore / totalWeight gives us -1 to +1
      // Convert to 0-100 scale
      finalEvidenceScore = 50 + (netScore / totalWeight) * 50;

      // Clamp to 0-100
      finalEvidenceScore = Math.max(0, Math.min(100, finalEvidenceScore));
    }

    return {
      totalEvidences: evidences.length,
      acceptedEvidences: acceptedEvidences.length,
      legitimateCount,
      againstCommunityCount,
      legitimateAndAgainstCommunity,
      yesSupporting,
      noSupporting,
      neutralCount,
      weightedYesScore: finalEvidenceScore,
      weightedNoScore: 100 - finalEvidenceScore
    };
  }

  /**
   * Calculate score from external API (0-100)
   */
  private calculateAPIScore(recommendation: 'YES' | 'NO' | 'NEUTRAL' | 'INCONCLUSIVE', confidence: number, sourceType?: string) {
    // Confidence is already 0-1, convert to 0-100
    let score = confidence * 100;

    // If recommendation is NO, invert the score
    // YES with 80% confidence = 80
    // NO with 80% confidence = 20
    if (recommendation === 'NO') {
      score = 100 - score;
    } else if (recommendation === 'NEUTRAL' || recommendation === 'INCONCLUSIVE') {
      // Neutral/inconclusive recommendation always returns 50
      score = 50;
    }

    return {
      recommendation: recommendation === 'INCONCLUSIVE' ? 'NEUTRAL' : recommendation,
      rawConfidence: score,
      sourceType
    };
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (confidence >= 90) return 'VERY_HIGH';
    if (confidence >= 70) return 'HIGH';
    if (confidence >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get color for confidence level (for UI)
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-blue-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }
}

export const finalConfidenceCalculator = new FinalConfidenceCalculator();
