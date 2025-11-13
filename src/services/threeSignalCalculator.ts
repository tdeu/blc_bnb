/**
 * Three-Signal Resolution Calculator
 * Combines betting volumes, evidence submissions, and external APIs to determine market outcome
 */

import { ethers } from 'ethers';
import { supabase } from '../utils/supabase';
// HEDERA_CONFIG removed - using BSC configuration
import { newsApiService } from './newsApiService';
// Evidence system removed - using automated AI resolution
// import { calculateEvidenceSignalScore, getUserBetPosition, detectEvidencePosition, getWalletAge } from './evidenceBetPositionService';
import { betTrackingService } from './betTrackingService';

// BSC Testnet RPC
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

const PREDICTION_MARKET_ABI = [
  "function yesShares() external view returns (uint256)",
  "function noShares() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export interface SignalScores {
  betting: {
    score: number;
    percentage: number;
    volume: { yes: string; no: string };
    warnings: string[];
  };
  evidence: {
    score: number;
    percentage: number;
    weightedYes: number;
    weightedNo: number;
    submissions: { yes: number; no: number };
    warnings: string[];
  };
  api: {
    score: number;
    percentage: number;
    articleCount: number;
    warnings: string[];
  };
  combined: {
    totalScore: number;
    confidence: number;
    recommendedOutcome: 'YES' | 'NO' | 'UNCERTAIN';
    allSignalsAligned: boolean;
    alignmentBonus: number;
  };
}

/**
 * Get unique bettor count using betTrackingService
 */
async function getUniqueBettorCount(
  marketContractAddress: string
): Promise<number> {
  try {
    const count = await betTrackingService.getUniqueBettorCount(marketContractAddress);

    // If no bets tracked yet, default to full bonus
    // This prevents penalizing markets where tracking wasn't set up from day 1
    if (count === 0) {
      console.warn('⚠️ No bet events tracked, using fallback bonus');
      return 10;
    }

    return count;

  } catch (error) {
    console.warn('⚠️ Failed to get bettor count:', error);
    return 10; // Default to full bonus on error
  }
}

/**
 * Calculate Signal #1: Betting Volumes (0-25 points)
 */
async function calculateBettingSignal(
  marketContractAddress: string
): Promise<{
  score: number;
  percentage: number;
  volume: { yes: string; no: string };
  warnings: string[];
}> {
  const MAX_POINTS = 25;
  const warnings: string[] = [];

  try {
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    const contract = new ethers.Contract(
      marketContractAddress,
      PREDICTION_MARKET_ABI,
      provider
    );

    const [yesShares, noShares] = await Promise.all([
      contract.yesShares(),
      contract.noShares()
    ]);

    const totalShares = yesShares + noShares;

    if (totalShares === 0n) {
      warnings.push('No bets placed on this market');
      return {
        score: 12.5, // Neutral
        percentage: 50,
        volume: { yes: '0', no: '0' },
        warnings
      };
    }

    const yesPercentage = Number((yesShares * 10000n) / totalShares) / 100;
    const noPercentage = 100 - yesPercentage;
    const strongConsensus = Math.abs(yesPercentage - 50);

    // Base score from betting consensus (0-15 points)
    let score = (strongConsensus / 50) * 15;

    // Participation bonus (0-10 points) based on unique bettor count
    const uniqueBettors = await getUniqueBettorCount(marketContractAddress);

    // Scale: 1 bettor = 1 point, 10+ bettors = 10 points
    const participationBonus = Math.min(10, uniqueBettors);
    score += participationBonus;

    score = Math.max(0, Math.min(MAX_POINTS, score));

    console.log(`📊 Betting Signal:
      Score: ${score.toFixed(2)}/25
      YES: ${yesPercentage.toFixed(1)}%
      NO: ${noPercentage.toFixed(1)}%
      Volume YES: ${ethers.formatEther(yesShares)} CAST
      Volume NO: ${ethers.formatEther(noShares)} CAST
      Unique Bettors: ${uniqueBettors}
      Participation Bonus: ${participationBonus.toFixed(1)}/10
    `);

    return {
      score,
      percentage: yesPercentage,
      volume: {
        yes: ethers.formatEther(yesShares),
        no: ethers.formatEther(noShares)
      },
      warnings
    };

  } catch (error) {
    console.error('❌ Betting signal calculation failed:', error);
    warnings.push('Failed to fetch betting data');
    return {
      score: 12.5,
      percentage: 50,
      volume: { yes: '0', no: '0' },
      warnings
    };
  }
}

/**
 * Calculate Signal #2: Evidence Submissions (0-45 points)
 * Uses credibility weighting based on user's bet position
 */
async function calculateEvidenceSignal(
  marketId: string,
  marketContractAddress: string
): Promise<{
  score: number;
  percentage: number;
  weightedYes: number;
  weightedNo: number;
  submissions: { yes: number; no: number };
  warnings: string[];
}> {
  try {
    // Fetch evidence from database
    const { data: evidence, error } = await supabase
      .from('evidence_submissions')
      .select('*')
      .eq('market_id', marketId);

    if (error) throw error;

    if (!evidence || evidence.length === 0) {
      return {
        score: 22.5,
        percentage: 50,
        weightedYes: 0,
        weightedNo: 0,
        submissions: { yes: 0, no: 0 },
        warnings: ['No evidence submitted']
      };
    }

    // Enrich evidence with bet positions if not already stored
    const enrichedEvidence = await Promise.all(
      evidence.map(async (ev) => {
        if (!ev.user_bet_position || !ev.evidence_position) {
          // Get user's bet position
          const betInfo = await getUserBetPosition(marketContractAddress, ev.user_id);

          // Detect evidence position from text
          const evidencePos = detectEvidencePosition(ev.evidence_text);

          // Get wallet age
          const walletAge = await getWalletAge(ev.user_id);

          return {
            ...ev,
            user_bet_position: betInfo.position,
            evidence_position: evidencePos,
            wallet_age_days: walletAge,
            credibility_multiplier: ev.credibility_multiplier || 1.0
          };
        }
        return ev;
      })
    );

    // Calculate evidence score using the service
    const result = await calculateEvidenceSignalScore(enrichedEvidence);

    console.log(`📊 Evidence Signal:
      Score: ${result.score.toFixed(2)}/45
      Percentage: ${result.percentage.toFixed(1)}% YES
      Weighted YES: ${result.weightedYes.toFixed(2)}
      Weighted NO: ${result.weightedNo.toFixed(2)}
      Submissions: ${result.submissions.yes} YES, ${result.submissions.no} NO
    `);

    return result;

  } catch (error) {
    console.error('❌ Evidence signal calculation failed:', error);
    return {
      score: 22.5,
      percentage: 50,
      weightedYes: 0,
      weightedNo: 0,
      submissions: { yes: 0, no: 0 },
      warnings: ['Failed to fetch evidence data']
    };
  }
}

/**
 * Calculate Signal #3: External APIs (0-30 points)
 */
async function calculateAPISignal(
  marketClaim: string,
  marketRegion?: string
): Promise<{
  score: number;
  percentage: number;
  articleCount: number;
  warnings: string[];
}> {
  try {
    const result = await newsApiService.calculateAPISignalScore(marketClaim, marketRegion);

    console.log(`📊 API Signal:
      Score: ${result.score.toFixed(2)}/30
      Percentage: ${result.percentage.toFixed(1)}% YES
      Articles: ${result.totalResults}
      Recommendation: ${result.recommendation}
    `);

    return {
      score: result.score,
      percentage: result.percentage,
      articleCount: result.totalResults,
      warnings: result.warnings
    };

  } catch (error) {
    console.error('❌ API signal calculation failed:', error);
    return {
      score: 15,
      percentage: 50,
      articleCount: 0,
      warnings: ['API fetch failed']
    };
  }
}

/**
 * Main function: Calculate all three signals and combine
 */
export async function calculateThreeSignals(marketId: string): Promise<SignalScores> {
  console.log(`\n🎯 THREE-SIGNAL ANALYSIS FOR MARKET: ${marketId}`);
  console.log('='.repeat(60));

  // Get market data from database
  const { data: market, error: marketError } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (marketError || !market) {
    throw new Error(`Market not found: ${marketId}`);
  }

  // Parallel calculation of all three signals
  const [bettingSignal, evidenceSignal, apiSignal] = await Promise.all([
    calculateBettingSignal(market.contract_address),
    calculateEvidenceSignal(marketId, market.contract_address),
    calculateAPISignal(market.claim, market.region)
  ]);

  // Calculate combined score
  const subtotal = bettingSignal.score + evidenceSignal.score + apiSignal.score;

  // Determine signal directions
  const bettingDirection = bettingSignal.percentage > 50 ? 'YES' : 'NO';
  const evidenceDirection = evidenceSignal.percentage > 50 ? 'YES' : 'NO';
  const apiDirection = apiSignal.percentage > 50 ? 'YES' : 'NO';

  // Check if all signals aligned
  const allSignalsAligned =
    bettingDirection === evidenceDirection &&
    evidenceDirection === apiDirection;

  // Alignment bonus: +8 points if all agree
  const alignmentBonus = allSignalsAligned ? 8 : 0;
  const totalScore = subtotal + alignmentBonus;

  // Final confidence (0-100%)
  const confidence = Math.min(100, Math.max(0, totalScore));

  // Determine recommended outcome
  let recommendedOutcome: 'YES' | 'NO' | 'UNCERTAIN' = 'UNCERTAIN';
  if (confidence >= 60) {
    // Use majority signal direction
    const yesVotes = [bettingDirection, evidenceDirection, apiDirection]
      .filter(d => d === 'YES').length;
    recommendedOutcome = yesVotes >= 2 ? 'YES' : 'NO';
  }

  console.log(`\n📊 FINAL THREE-SIGNAL BREAKDOWN:`);
  console.log('='.repeat(60));
  console.log(`Betting:  ${bettingSignal.score.toFixed(2)}/25 (${bettingSignal.percentage.toFixed(1)}% ${bettingDirection})`);
  console.log(`Evidence: ${evidenceSignal.score.toFixed(2)}/45 (${evidenceSignal.percentage.toFixed(1)}% ${evidenceDirection})`);
  console.log(`API:      ${apiSignal.score.toFixed(2)}/30 (${apiSignal.percentage.toFixed(1)}% ${apiDirection})`);
  console.log('-'.repeat(60));
  console.log(`Subtotal: ${subtotal.toFixed(2)}/100`);
  console.log(`Aligned:  ${allSignalsAligned ? 'YES ✅' : 'NO ⚠️'} ${allSignalsAligned ? '(+8 bonus)' : ''}`);
  console.log('='.repeat(60));
  console.log(`FINAL:    ${confidence.toFixed(2)}% confidence`);
  console.log(`OUTCOME:  ${recommendedOutcome}`);
  console.log('='.repeat(60));

  const result: SignalScores = {
    betting: bettingSignal,
    evidence: evidenceSignal,
    api: apiSignal,
    combined: {
      totalScore,
      confidence,
      recommendedOutcome,
      allSignalsAligned,
      alignmentBonus
    }
  };

  // Save to database
  await saveResolutionScore(marketId, result);

  return result;
}

/**
 * Save resolution score to database for audit trail
 */
async function saveResolutionScore(marketId: string, signals: SignalScores): Promise<void> {
  try {
    const { error } = await supabase
      .from('resolution_scores')
      .upsert({
        market_id: marketId,
        betting_score: signals.betting.score,
        betting_percentage: signals.betting.percentage,
        betting_warnings: signals.betting.warnings,
        evidence_score: signals.evidence.score,
        evidence_percentage: signals.evidence.percentage,
        evidence_weighted_yes: signals.evidence.weightedYes,
        evidence_weighted_no: signals.evidence.weightedNo,
        evidence_warnings: signals.evidence.warnings,
        api_score: signals.api.score,
        api_percentage: signals.api.percentage,
        api_article_count: signals.api.articleCount,
        api_warnings: signals.api.warnings,
        total_score: signals.combined.totalScore,
        confidence_percentage: signals.combined.confidence,
        recommended_outcome: signals.combined.recommendedOutcome,
        all_signals_aligned: signals.combined.allSignalsAligned,
        alignment_bonus: signals.combined.alignmentBonus,
        calculated_by: 'auto'
      }, {
        onConflict: 'market_id'
      });

    if (error) {
      console.error('❌ Failed to save resolution score:', error);
    } else {
      console.log('✅ Resolution score saved to database');
    }
  } catch (error) {
    console.error('❌ Error saving resolution score:', error);
  }
}

/**
 * Get saved resolution score from database
 */
export async function getResolutionScore(marketId: string): Promise<SignalScores | null> {
  try {
    const { data, error } = await supabase
      .from('resolution_scores')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      betting: {
        score: data.betting_score,
        percentage: data.betting_percentage,
        volume: { yes: '0', no: '0' }, // Not stored
        warnings: data.betting_warnings || []
      },
      evidence: {
        score: data.evidence_score,
        percentage: data.evidence_percentage,
        weightedYes: data.evidence_weighted_yes || 0,
        weightedNo: data.evidence_weighted_no || 0,
        submissions: { yes: 0, no: 0 }, // Not stored
        warnings: data.evidence_warnings || []
      },
      api: {
        score: data.api_score,
        percentage: data.api_percentage,
        articleCount: data.api_article_count || 0,
        warnings: data.api_warnings || []
      },
      combined: {
        totalScore: data.total_score,
        confidence: data.confidence_percentage,
        recommendedOutcome: data.recommended_outcome,
        allSignalsAligned: data.all_signals_aligned,
        alignmentBonus: data.alignment_bonus || 0
      }
    };
  } catch (error) {
    console.error('❌ Error fetching resolution score:', error);
    return null;
  }
}
