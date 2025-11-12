// Evidence Aggregation Service - Phase 2 Implementation
// Combines AI analysis with user evidence using intelligent weighting

export interface EvidenceItem {
  id: string;
  stance: 'supporting' | 'disputing' | 'neutral';
  quality_score: number; // 0-5.0
  source_credibility_score: number; // 0-1.0
  source_type: 'academic' | 'government' | 'news' | 'expert_opinion' | 'social_media' | 'blog' | 'anonymous' | 'other';
  admin_stance_verified: boolean;
  user_reputation_score?: number; // 0-2.0
  submission_fee: number; // HBAR amount
  evidence_text: string;
}

export interface AIAnalysis {
  recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
  confidence: number; // 0-1.0
  dataSourceUsed: 'NEWS' | 'HISTORICAL' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE';
  reasoning: string;
  keyFactors?: string[];
  sourceAnalysis?: Record<string, { position: string; summary: string }>;
}

export interface AggregationResult {
  finalConfidence: number; // 0-100 percentage
  recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
  aiContribution: {
    weight: number;
    confidence: number;
    points: number; // How many points AI contributes to final score
  };
  evidenceContribution: {
    weight: number;
    confidence: number;
    points: number; // How many points evidence contributes to final score
    supportingCount: number;
    disputingCount: number;
    neutralCount: number;
    totalQualityScore: number;
  };
  hasConflicts: boolean;
  confidenceFactors: {
    highConfidenceReasons: string[];
    lowConfidenceReasons: string[];
    riskFlags: string[];
  };
  transparencyBreakdown: {
    calculation: string;
    evidenceBreakdown: Array<{
      evidenceId: string;
      stance: string;
      contribution: number;
      weightedScore: number;
    }>;
  };
}

export class EvidenceAggregationService {

  // Configuration constants based on action plan
  private static readonly CONFIG = {
    AI_WEIGHT_DEFAULT: 0.65,
    AI_WEIGHT_NEWS: 0.70,
    AI_WEIGHT_ACADEMIC: 0.75,
    AI_WEIGHT_HISTORICAL: 0.60,
    AI_WEIGHT_GENERAL: 0.65,
    EVIDENCE_WEIGHT_DEFAULT: 0.35,
    CONFLICT_THRESHOLD: 0.30, // 30% difference triggers conflict flag
    MIN_CONFIDENCE_THRESHOLD: 0.60, // 60% minimum for auto-resolution
    REPUTATION_WEIGHT_MULTIPLIER: 0.2,
  };

  // Source credibility multipliers based on source type
  private static readonly SOURCE_MULTIPLIERS = {
    academic: 1.0,
    government: 1.0,
    expert_opinion: 0.9,
    news: 0.8,
    blog: 0.5,
    social_media: 0.5,
    anonymous: 0.3,
    other: 0.7,
  };

  /**
   * Main aggregation function - combines AI analysis with user evidence
   */
  public static aggregateEvidence(
    aiAnalysis: AIAnalysis,
    evidence: EvidenceItem[]
  ): AggregationResult {

    // Step 1: Determine AI weight based on data source
    const aiWeight = this.getAIWeight(aiAnalysis.dataSourceUsed);
    const evidenceWeight = 1 - aiWeight;

    // Step 2: Calculate evidence contribution
    const evidenceAnalysis = this.analyzeEvidence(evidence);

    // Step 3: Calculate weighted final confidence
    const aiPoints = aiWeight * aiAnalysis.confidence * 100;
    const evidencePoints = evidenceWeight * evidenceAnalysis.confidence * 100;
    const finalConfidence = aiPoints + evidencePoints;

    // Step 4: Determine final recommendation
    const recommendation = this.getFinalRecommendation(finalConfidence, aiAnalysis, evidenceAnalysis);

    // Step 5: Detect conflicts
    const hasConflicts = this.detectConflicts(aiAnalysis, evidenceAnalysis);

    // Step 6: Generate confidence factors and transparency
    const confidenceFactors = this.generateConfidenceFactors(
      aiAnalysis, evidenceAnalysis, finalConfidence, hasConflicts
    );

    const transparencyBreakdown = this.generateTransparencyBreakdown(
      evidence, aiAnalysis, aiWeight, evidenceWeight, aiPoints, evidencePoints
    );

    return {
      finalConfidence: Math.round(finalConfidence * 10) / 10, // Round to 1 decimal
      recommendation,
      aiContribution: {
        weight: aiWeight,
        confidence: aiAnalysis.confidence,
        points: Math.round(aiPoints * 10) / 10,
      },
      evidenceContribution: {
        weight: evidenceWeight,
        confidence: evidenceAnalysis.confidence,
        points: Math.round(evidencePoints * 10) / 10,
        supportingCount: evidenceAnalysis.supportingCount,
        disputingCount: evidenceAnalysis.disputingCount,
        neutralCount: evidenceAnalysis.neutralCount,
        totalQualityScore: evidenceAnalysis.totalQualityScore,
      },
      hasConflicts,
      confidenceFactors,
      transparencyBreakdown,
    };
  }

  /**
   * Determine AI weight based on data source type
   */
  private static getAIWeight(dataSource: AIAnalysis['dataSourceUsed']): number {
    switch (dataSource) {
      case 'NEWS':
        return this.CONFIG.AI_WEIGHT_NEWS;
      case 'ACADEMIC':
        return this.CONFIG.AI_WEIGHT_ACADEMIC;
      case 'HISTORICAL':
        return this.CONFIG.AI_WEIGHT_HISTORICAL;
      case 'GENERAL_KNOWLEDGE':
        return this.CONFIG.AI_WEIGHT_GENERAL;
      default:
        return this.CONFIG.AI_WEIGHT_DEFAULT;
    }
  }

  /**
   * Analyze user evidence and calculate evidence-based confidence
   */
  private static analyzeEvidence(evidence: EvidenceItem[]) {
    if (evidence.length === 0) {
      return {
        confidence: 0.5, // Neutral when no evidence
        supportingCount: 0,
        disputingCount: 0,
        neutralCount: 0,
        totalQualityScore: 0,
        weightedScores: [],
      };
    }

    let supportingScore = 0;
    let disputingScore = 0;
    let neutralScore = 0;
    const weightedScores: Array<{ evidenceId: string; stance: string; score: number }> = [];

    // Calculate weighted score for each evidence item
    evidence.forEach(item => {
      const baseScore = this.calculateEvidenceScore(item);
      weightedScores.push({
        evidenceId: item.id,
        stance: item.stance,
        score: baseScore,
      });

      // Accumulate scores by stance
      switch (item.stance) {
        case 'supporting':
          supportingScore += baseScore;
          break;
        case 'disputing':
          disputingScore += baseScore;
          break;
        case 'neutral':
          neutralScore += baseScore;
          break;
      }
    });

    // Calculate confidence based on supporting vs disputing evidence
    // Strong supporting evidence = high confidence (towards YES)
    // Strong disputing evidence = high confidence (towards NO)
    // Balanced evidence = lower confidence (INCONCLUSIVE)
    const totalScore = supportingScore + disputingScore + neutralScore;
    const supportingRatio = totalScore > 0 ? supportingScore / totalScore : 0;
    const disputingRatio = totalScore > 0 ? disputingScore / totalScore : 0;

    let evidenceConfidence: number;
    if (supportingScore > disputingScore) {
      // Evidence leans supporting - confidence based on strength of support
      evidenceConfidence = 0.5 + (supportingRatio * 0.5);
    } else if (disputingScore > supportingScore) {
      // Evidence leans disputing - confidence based on strength of dispute
      evidenceConfidence = 0.5 - (disputingRatio * 0.5);
    } else {
      // Balanced evidence - reduce confidence
      evidenceConfidence = 0.5;
    }

    return {
      confidence: Math.max(0, Math.min(1, evidenceConfidence)),
      supportingCount: evidence.filter(e => e.stance === 'supporting').length,
      disputingCount: evidence.filter(e => e.stance === 'disputing').length,
      neutralCount: evidence.filter(e => e.stance === 'neutral').length,
      totalQualityScore: evidence.reduce((sum, e) => sum + e.quality_score, 0),
      weightedScores,
    };
  }

  /**
   * Calculate weighted score for individual evidence item
   */
  private static calculateEvidenceScore(evidence: EvidenceItem): number {
    // Base score from quality rating (0-5.0 scale)
    let score = evidence.quality_score;

    // Apply source credibility multiplier
    const credibilityMultiplier = this.SOURCE_MULTIPLIERS[evidence.source_type];
    score *= credibilityMultiplier;

    // Apply manual source credibility score (0-1.0)
    score *= evidence.source_credibility_score;

    // Apply user reputation bonus/penalty (if available)
    if (evidence.user_reputation_score) {
      const reputationMultiplier = 1 + ((evidence.user_reputation_score - 1.0) * this.CONFIG.REPUTATION_WEIGHT_MULTIPLIER);
      score *= reputationMultiplier;
    }

    // Small bonus for higher HBAR stakes (shows commitment)
    const stakeBonus = Math.min(0.2, evidence.submission_fee * 0.05); // Cap bonus at 0.2
    score += stakeBonus;

    // Bonus for admin verification
    if (evidence.admin_stance_verified) {
      score *= 1.1; // 10% bonus
    }

    return Math.max(0, score); // Ensure non-negative
  }

  /**
   * Determine final recommendation based on confidence score
   */
  private static getFinalRecommendation(
    finalConfidence: number,
    aiAnalysis: AIAnalysis,
    evidenceAnalysis: any
  ): 'YES' | 'NO' | 'INCONCLUSIVE' {
    // Convert to 0-1 scale for comparison
    const confidence = finalConfidence / 100;

    // High confidence thresholds
    if (confidence >= 0.75) {
      return 'YES';
    } else if (confidence <= 0.25) {
      return 'NO';
    } else if (confidence >= 0.6) {
      // Medium-high confidence - lean towards AI recommendation if strong
      return aiAnalysis.confidence >= 0.7 ? aiAnalysis.recommendation : 'INCONCLUSIVE';
    } else if (confidence <= 0.4) {
      // Medium-low confidence - lean towards opposite of AI if evidence disputes strongly
      return aiAnalysis.confidence >= 0.7 ?
        (aiAnalysis.recommendation === 'YES' ? 'NO' : 'YES') : 'INCONCLUSIVE';
    } else {
      // Middle range - inconclusive
      return 'INCONCLUSIVE';
    }
  }

  /**
   * Detect conflicts between AI and evidence
   */
  private static detectConflicts(aiAnalysis: AIAnalysis, evidenceAnalysis: any): boolean {
    // No conflicts if no evidence
    if (evidenceAnalysis.supportingCount + evidenceAnalysis.disputingCount === 0) {
      return false;
    }

    // Calculate AI position confidence
    const aiConfidence = aiAnalysis.confidence;
    const aiPosition = aiAnalysis.recommendation === 'YES' ? 1.0 : 0.0;

    // Calculate evidence position
    const evidencePosition = evidenceAnalysis.confidence;

    // Check for major disagreement (>30% difference)
    const disagreement = Math.abs(aiPosition - evidencePosition);

    return disagreement >= this.CONFIG.CONFLICT_THRESHOLD;
  }

  /**
   * Generate confidence factors for admin review
   */
  private static generateConfidenceFactors(
    aiAnalysis: AIAnalysis,
    evidenceAnalysis: any,
    finalConfidence: number,
    hasConflicts: boolean
  ) {
    const highConfidenceReasons: string[] = [];
    const lowConfidenceReasons: string[] = [];
    const riskFlags: string[] = [];

    // High confidence factors
    if (aiAnalysis.confidence >= 0.8) {
      highConfidenceReasons.push(`Strong AI analysis (${(aiAnalysis.confidence * 100).toFixed(0)}% confidence)`);
    }

    if (evidenceAnalysis.supportingCount > evidenceAnalysis.disputingCount * 2) {
      highConfidenceReasons.push(`Strong supporting evidence (${evidenceAnalysis.supportingCount} supporting vs ${evidenceAnalysis.disputingCount} disputing)`);
    }

    if (evidenceAnalysis.totalQualityScore > evidenceAnalysis.supportingCount * 3) {
      highConfidenceReasons.push('High quality evidence submissions');
    }

    // Low confidence factors
    if (aiAnalysis.confidence <= 0.6) {
      lowConfidenceReasons.push(`Uncertain AI analysis (${(aiAnalysis.confidence * 100).toFixed(0)}% confidence)`);
    }

    if (evidenceAnalysis.supportingCount === evidenceAnalysis.disputingCount) {
      lowConfidenceReasons.push('Balanced evidence - equal supporting and disputing submissions');
    }

    if (evidenceAnalysis.supportingCount + evidenceAnalysis.disputingCount < 3) {
      lowConfidenceReasons.push('Limited evidence submissions available');
    }

    // Risk flags
    if (hasConflicts) {
      riskFlags.push('Major conflict detected between AI analysis and user evidence');
    }

    if (finalConfidence > 80 && evidenceAnalysis.disputingCount > 2) {
      riskFlags.push('High confidence despite significant disputing evidence');
    }

    if (aiAnalysis.recommendation === 'INCONCLUSIVE') {
      riskFlags.push('AI analysis was inconclusive - additional review recommended');
    }

    return {
      highConfidenceReasons,
      lowConfidenceReasons,
      riskFlags,
    };
  }

  /**
   * Generate detailed transparency breakdown
   */
  private static generateTransparencyBreakdown(
    evidence: EvidenceItem[],
    aiAnalysis: AIAnalysis,
    aiWeight: number,
    evidenceWeight: number,
    aiPoints: number,
    evidencePoints: number
  ) {
    const calculation = `Final Confidence = (AI Weight × AI Confidence × 100) + (Evidence Weight × Evidence Confidence × 100)
= (${aiWeight.toFixed(2)} × ${(aiAnalysis.confidence * 100).toFixed(0)}%) + (${evidenceWeight.toFixed(2)} × Evidence Score)
= ${aiPoints.toFixed(1)} + ${evidencePoints.toFixed(1)} = ${(aiPoints + evidencePoints).toFixed(1)}%`;

    const evidenceBreakdown = evidence.map(item => {
      const weightedScore = this.calculateEvidenceScore(item);
      return {
        evidenceId: item.id,
        stance: item.stance,
        contribution: weightedScore,
        weightedScore,
      };
    });

    return {
      calculation,
      evidenceBreakdown,
    };
  }

  /**
   * Utility function to get human-readable confidence level
   */
  public static getConfidenceLevel(confidence: number): string {
    if (confidence >= 80) return 'Very High';
    if (confidence >= 70) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  }

  /**
   * Utility function to check if confidence meets auto-resolution threshold
   */
  public static shouldAutoResolve(confidence: number): boolean {
    return confidence >= (this.CONFIG.MIN_CONFIDENCE_THRESHOLD * 100);
  }

  /**
   * Calculate and store aggregation results for a market
   */
  public static async calculateMarketAggregation(
    marketId: string,
    aiAnalysis: AIAnalysis,
    evidence: EvidenceItem[],
    supabaseClient: any
  ): Promise<AggregationResult> {

    // Calculate aggregation
    const result = this.aggregateEvidence(aiAnalysis, evidence);

    // Store in database
    try {
      const aggregationData = {
        market_id: marketId,
        ai_confidence: aiAnalysis.confidence * 100,
        ai_weight: result.aiContribution.weight,
        evidence_confidence: result.evidenceContribution.confidence * 100,
        evidence_weight: result.evidenceContribution.weight,
        final_confidence: result.finalConfidence,
        supporting_evidence_count: result.evidenceContribution.supportingCount,
        disputing_evidence_count: result.evidenceContribution.disputingCount,
        neutral_evidence_count: result.evidenceContribution.neutralCount,
        total_evidence_quality_score: result.evidenceContribution.totalQualityScore,
        has_conflicts: result.hasConflicts,
        confidence_factors: result.confidenceFactors,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert aggregation result
      const { error } = await supabaseClient
        .from('evidence_aggregation')
        .upsert(aggregationData, {
          onConflict: 'market_id'
        });

      if (error) {
        console.warn('Failed to store aggregation result:', error);
      }

    } catch (error) {
      console.error('Error storing aggregation result:', error);
    }

    return result;
  }

  /**
   * Load existing aggregation result for a market
   */
  public static async loadMarketAggregation(
    marketId: string,
    supabaseClient: any
  ): Promise<AggregationResult | null> {
    try {
      const { data, error } = await supabaseClient
        .from('evidence_aggregation')
        .select('*')
        .eq('market_id', marketId)
        .single();

      if (error || !data) {
        return null;
      }

      // Convert database result back to AggregationResult format
      return {
        finalConfidence: data.final_confidence,
        recommendation: data.final_confidence >= 75 ? 'YES' :
                      data.final_confidence <= 25 ? 'NO' : 'INCONCLUSIVE',
        aiContribution: {
          weight: data.ai_weight,
          confidence: data.ai_confidence / 100,
          points: data.ai_weight * data.ai_confidence,
        },
        evidenceContribution: {
          weight: data.evidence_weight,
          confidence: data.evidence_confidence / 100,
          points: data.evidence_weight * data.evidence_confidence,
          supportingCount: data.supporting_evidence_count,
          disputingCount: data.disputing_evidence_count,
          neutralCount: data.neutral_evidence_count,
          totalQualityScore: data.total_evidence_quality_score,
        },
        hasConflicts: data.has_conflicts,
        confidenceFactors: data.confidence_factors || {
          highConfidenceReasons: [],
          lowConfidenceReasons: [],
          riskFlags: [],
        },
        transparencyBreakdown: {
          calculation: `Loaded from database at ${data.last_calculated_at}`,
          evidenceBreakdown: [],
        },
      };

    } catch (error) {
      console.error('Error loading aggregation result:', error);
      return null;
    }
  }
}