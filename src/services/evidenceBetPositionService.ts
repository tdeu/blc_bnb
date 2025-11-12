/**
 * Evidence Bet Position Service
 * Tracks user's bet position when they submit evidence for credibility weighting
 */

import { ethers } from 'ethers';
// HEDERA_CONFIG removed - using BSC configuration

const PREDICTION_MARKET_ABI = [
  "function yesBalance(address) external view returns (uint256)",
  "function noBalance(address) external view returns (uint256)",
  "function yesShares() external view returns (uint256)",
  "function noShares() external view returns (uint256)"
];

export type BetPosition = 'YES' | 'NO' | 'NONE';

export interface UserBetInfo {
  position: BetPosition;
  yesAmount: string;
  noAmount: string;
  totalAmount: string;
}

/**
 * Get user's bet position on a market
 * Returns YES if they bet YES, NO if they bet NO, NONE if they didn't bet
 */
export async function getUserBetPosition(
  marketContractAddress: string,
  userWalletAddress: string
): Promise<UserBetInfo> {
  try {
    // Use BSC testnet RPC (Hedera config removed)
    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const marketContract = new ethers.Contract(
      marketContractAddress,
      PREDICTION_MARKET_ABI,
      provider
    );

    // Query smart contract for user's balances
    const [yesBalance, noBalance] = await Promise.all([
      marketContract.yesBalance(userWalletAddress),
      marketContract.noBalance(userWalletAddress)
    ]);

    const yesAmount = ethers.formatEther(yesBalance);
    const noAmount = ethers.formatEther(noBalance);
    const totalAmount = ethers.formatEther(yesBalance + noBalance);

    // Determine position
    let position: BetPosition = 'NONE';

    if (yesBalance > 0n && noBalance === 0n) {
      position = 'YES';
    } else if (noBalance > 0n && yesBalance === 0n) {
      position = 'NO';
    } else if (yesBalance > 0n && noBalance > 0n) {
      // User bet both sides - use the larger position
      position = yesBalance > noBalance ? 'YES' : 'NO';
    }

    console.log(`📊 User ${userWalletAddress} bet position on ${marketContractAddress}:
      Position: ${position}
      YES: ${yesAmount} CAST
      NO: ${noAmount} CAST
      Total: ${totalAmount} CAST
    `);

    return {
      position,
      yesAmount,
      noAmount,
      totalAmount
    };

  } catch (error) {
    console.error('❌ Failed to get user bet position:', error);
    return {
      position: 'NONE',
      yesAmount: '0',
      noAmount: '0',
      totalAmount: '0'
    };
  }
}

/**
 * Calculate credibility multiplier based on bet position vs evidence position
 * Contrarian evidence (bet NO but submit YES evidence) gets 2.5x weight - highly credible!
 */
export function calculateCredibilityMultiplier(
  userBetPosition: BetPosition,
  evidencePosition: 'YES' | 'NO' | 'NEUTRAL'
): number {
  // No bet = neutral credibility
  if (userBetPosition === 'NONE') {
    return 1.0;
  }

  // Neutral evidence = standard credibility
  if (evidencePosition === 'NEUTRAL') {
    return 1.0;
  }

  // Contrarian evidence = HIGH credibility (2.5x)
  if (
    (userBetPosition === 'YES' && evidencePosition === 'NO') ||
    (userBetPosition === 'NO' && evidencePosition === 'YES')
  ) {
    return 2.5;
  }

  // Supporting evidence = standard credibility (1.0x)
  return 1.0;
}

/**
 * Detect evidence position from text using keyword analysis
 * This is a simple implementation - could be enhanced with AI
 */
export function detectEvidencePosition(evidenceText: string): 'YES' | 'NO' | 'NEUTRAL' {
  const text = evidenceText.toLowerCase();

  const yesKeywords = [
    'confirmed', 'confirm', 'yes', 'true', 'happened', 'occurred', 'completed', 'achieved',
    'successful', 'success', 'won', 'passed', 'approved', 'correct', 'verified'
  ];

  const noKeywords = [
    'denied', 'deny', 'no', 'false', 'did not happen', 'not occurred', 'incomplete', 'failed',
    'unsuccessful', 'lost', 'rejected', 'incorrect', 'unverified', 'fake'
  ];

  const yesCount = yesKeywords.filter(keyword => text.includes(keyword)).length;
  const noCount = noKeywords.filter(keyword => text.includes(keyword)).length;

  if (yesCount > noCount && yesCount >= 2) {
    return 'YES';
  } else if (noCount > yesCount && noCount >= 2) {
    return 'NO';
  }

  return 'NEUTRAL';
}

/**
 * Get wallet age in days (for Sybil detection)
 * Queries Hedera mirror node for account creation date
 */
export async function getWalletAge(walletAddress: string): Promise<number> {
  try {
    // Query Hedera mirror node
    const response = await fetch(
      `${HEDERA_CONFIG.TESTNET_MIRROR_NODE}/api/v1/accounts/${walletAddress}`
    );

    if (!response.ok) {
      console.warn(`⚠️ Failed to get wallet age for ${walletAddress}`);
      return 999; // Assume old wallet if can't determine
    }

    const data = await response.json();

    if (data.created_timestamp) {
      const createdAt = new Date(parseFloat(data.created_timestamp) * 1000);
      const ageMs = Date.now() - createdAt.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      console.log(`📅 Wallet ${walletAddress} age: ${ageDays} days`);
      return ageDays;
    }

    return 999; // Default to old wallet
  } catch (error) {
    console.error('❌ Failed to get wallet age:', error);
    return 999; // Assume old wallet on error
  }
}

/**
 * THREE-SIGNAL SYSTEM: Calculate evidence score (0-45 points)
 * Based on weighted evidence submissions
 */
export async function calculateEvidenceSignalScore(
  evidenceSubmissions: Array<{
    user_id: string;
    evidence_text: string;
    evidence_position?: 'YES' | 'NO' | 'NEUTRAL';
    user_bet_position?: BetPosition;
    credibility_multiplier?: number;
    wallet_age_days?: number;
  }>
): Promise<{
  score: number;
  percentage: number;
  weightedYes: number;
  weightedNo: number;
  submissions: { yes: number; no: number };
  warnings: string[];
}> {
  const MAX_POINTS = 45;
  const warnings: string[] = [];

  if (evidenceSubmissions.length === 0) {
    warnings.push('No evidence submitted');
    return {
      score: 22.5, // Neutral score
      percentage: 50,
      weightedYes: 0,
      weightedNo: 0,
      submissions: { yes: 0, no: 0 },
      warnings
    };
  }

  // Calculate weighted scores
  let weightedYes = 0;
  let weightedNo = 0;
  let yesCount = 0;
  let noCount = 0;
  let suspiciousCount = 0;

  evidenceSubmissions.forEach(evidence => {
    const multiplier = evidence.credibility_multiplier || 1.0;
    const walletAge = evidence.wallet_age_days || 999;

    // Sybil detection: new wallets get reduced weight
    let walletAgeFactor = 1.0;
    if (walletAge < 7) {
      walletAgeFactor = 0.5;
      suspiciousCount++;
    }

    const finalWeight = multiplier * walletAgeFactor;

    if (evidence.evidence_position === 'YES') {
      weightedYes += finalWeight;
      yesCount++;
    } else if (evidence.evidence_position === 'NO') {
      weightedNo += finalWeight;
      noCount++;
    }
  });

  const totalWeight = weightedYes + weightedNo;
  const yesPercentage = totalWeight > 0 ? (weightedYes / totalWeight) * 100 : 50;
  const evidenceConsensus = Math.abs(yesPercentage - 50);

  // Base score from evidence ratio (0-30 points)
  let score = (evidenceConsensus / 50) * 30;

  // Quality bonus based on total submissions (0-15 points)
  const submissionBonus = Math.min(15, evidenceSubmissions.length);
  score += submissionBonus;

  // Sybil attack penalty
  if (suspiciousCount > evidenceSubmissions.length * 0.2) {
    score *= 0.5; // 50% penalty if >20% suspicious
    warnings.push(`Sybil attack detected: ${suspiciousCount} suspicious submissions`);
  }

  score = Math.max(0, Math.min(MAX_POINTS, score));

  console.log(`📊 Evidence Signal Score:
    Score: ${score.toFixed(2)}/45
    Percentage: ${yesPercentage.toFixed(1)}% YES
    Weighted YES: ${weightedYes.toFixed(2)}
    Weighted NO: ${weightedNo.toFixed(2)}
    Submissions: ${yesCount} YES, ${noCount} NO
    Suspicious: ${suspiciousCount}
  `);

  return {
    score,
    percentage: yesPercentage,
    weightedYes,
    weightedNo,
    submissions: { yes: yesCount, no: noCount },
    warnings
  };
}
