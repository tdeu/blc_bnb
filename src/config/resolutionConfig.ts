/**
 * Resolution Configuration
 *
 * Tunable parameters for the adaptive weighting system.
 * Adjust these values based on real-world accuracy data.
 */

export interface ResolutionWeights {
  market: number;
  evidence: number;
  ai: number;
}

export interface ResolutionThresholds {
  marketValidated: number;
  evidenceContradicts: number;
}

export interface EvidenceMultipliers {
  legitimateAndContrarian: number;
  legitimateOnly: number;
  regular: number;
}

export interface TimingThresholds {
  disputePeriodDays: number;
  maxEvidencePeriodDays: number;
  minConfidenceThreshold: number;
}

export interface ResolutionConfigType {
  thresholds: ResolutionThresholds;
  weights: {
    marketValidated: ResolutionWeights;
    evidenceContradicts: ResolutionWeights;
    standard: ResolutionWeights;
  };
  evidenceMultipliers: EvidenceMultipliers;
  timingThresholds: TimingThresholds;
  africanCountries: { [key: string]: string };
}

/**
 * Main configuration object
 */
export const RESOLUTION_CONFIG: ResolutionConfigType = {

  /**
   * Thresholds for strategy selection based on consensusScore
   *
   * consensusScore measures how much evidence agrees with market odds:
   * - 1.0 = Perfect agreement (evidence fully supports market)
   * - 0.5 = Mixed signals (evidence split)
   * - 0.0 = Total disagreement (evidence completely contradicts market)
   */
  thresholds: {
    /**
     * If consensusScore >= 0.8, use MARKET_VALIDATED strategy
     * Reasoning: 80%+ agreement means market is probably correct
     */
    marketValidated: 0.8,

    /**
     * If consensusScore <= 0.2, use EVIDENCE_CONTRADICTS strategy
     * Reasoning: Strong disagreement suggests possible market manipulation
     */
    evidenceContradicts: 0.2
  },

  /**
   * Weight presets for each strategy
   * Each set must sum to 1.0 (100%)
   */
  weights: {
    /**
     * MARKET_VALIDATED: No evidence challenges market
     * Trust market more since no one is disputing it
     */
    marketValidated: {
      market: 0.60,   // 60% - Boosted (validated by lack of challenge)
      evidence: 0.10, // 10% - Reduced (nothing to analyze)
      ai: 0.30        // 30% - Standard
    },

    /**
     * EVIDENCE_CONTRADICTS: Evidence strongly disagrees with market
     * Reduce market trust, boost external validation
     */
    evidenceContradicts: {
      market: 0.20,   // 20% - Reduced (possibly manipulated)
      evidence: 0.30, // 30% - Boosted (challenging groupthink)
      ai: 0.50        // 50% - Boosted (need external validation)
    },

    /**
     * STANDARD: Mixed signals
     * Use balanced approach
     */
    standard: {
      market: 0.35,   // 35% - Standard
      evidence: 0.25, // 25% - Standard
      ai: 0.40        // 40% - Slight boost (tiebreaker)
    }
  },

  /**
   * Evidence quality multipliers
   * Applied when calculating evidence weight
   */
  evidenceMultipliers: {
    /**
     * Evidence marked as BOTH "legitimate" AND "against community"
     * This is high-value contrarian evidence that challenges consensus
     */
    legitimateAndContrarian: 3,

    /**
     * Evidence marked as "legitimate" only
     * Higher quality than regular evidence
     */
    legitimateOnly: 1.5,

    /**
     * Regular evidence with no special validation
     */
    regular: 1
  },

  /**
   * Timing thresholds for market resolution lifecycle
   */
  timingThresholds: {
    /**
     * Dispute period after preliminary resolution
     * Users have 7 days to submit disputes/evidence
     */
    disputePeriodDays: 7,

    /**
     * Maximum evidence collection period
     * After 30 days, markets with <80% confidence are eligible for refund
     */
    maxEvidencePeriodDays: 30,

    /**
     * Minimum confidence threshold for resolution
     * Markets need ≥80% confidence to be resolved
     * Markets with <80% after max period get refunded
     */
    minConfidenceThreshold: 80
  },

  /**
   * African country name to NewsAPI country code mapping
   * Used for detecting and filtering African markets
   */
  africanCountries: {
    'nigeria': 'ng',
    'nigerian': 'ng',
    'lagos': 'ng',
    'abuja': 'ng',

    'south africa': 'za',
    'south african': 'za',
    'cape town': 'za',
    'johannesburg': 'za',

    'kenya': 'ke',
    'kenyan': 'ke',
    'nairobi': 'ke',

    'ghana': 'gh',
    'ghanaian': 'gh',
    'accra': 'gh',

    'egypt': 'eg',
    'egyptian': 'eg',
    'cairo': 'eg',

    'morocco': 'ma',
    'moroccan': 'ma',
    'casablanca': 'ma',

    'ethiopia': 'et',
    'ethiopian': 'et',
    'addis ababa': 'et',

    'tanzania': 'tz',
    'tanzanian': 'tz',
    'dar es salaam': 'tz',

    'uganda': 'ug',
    'ugandan': 'ug',
    'kampala': 'ug'
  }
};

/**
 * Helper function to validate configuration on startup
 */
export function validateResolutionConfig(): boolean {
  const { weights, thresholds } = RESOLUTION_CONFIG;

  // Check that all weight sets sum to 1.0
  const weightSets = [
    weights.marketValidated,
    weights.evidenceContradicts,
    weights.standard
  ];

  for (const weightSet of weightSets) {
    const sum = weightSet.market + weightSet.evidence + weightSet.ai;
    if (Math.abs(sum - 1.0) > 0.001) {
      console.error(`❌ Invalid weights - sum is ${sum}, should be 1.0`);
      return false;
    }
  }

  // Check thresholds are in valid range
  if (thresholds.marketValidated < 0 || thresholds.marketValidated > 1) {
    console.error(`❌ Invalid marketValidated threshold: ${thresholds.marketValidated}`);
    return false;
  }

  if (thresholds.evidenceContradicts < 0 || thresholds.evidenceContradicts > 1) {
    console.error(`❌ Invalid evidenceContradicts threshold: ${thresholds.evidenceContradicts}`);
    return false;
  }

  // Thresholds should be in correct order
  if (thresholds.evidenceContradicts >= thresholds.marketValidated) {
    console.error(`❌ Threshold order invalid: evidenceContradicts should be < marketValidated`);
    return false;
  }

  console.log('✅ Resolution configuration validated');
  return true;
}

// Validate on module load (development only)
if (import.meta.env.DEV) {
  validateResolutionConfig();
}
