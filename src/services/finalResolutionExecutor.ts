/**
 * Final Resolution Executor Service
 *
 * Automatically executes final resolution on markets after the 7-day dispute period ends.
 * Also handles refund path for markets that never reached 80% confidence threshold.
 *
 * SAFETY: This service operates independently and will not interfere with existing flows.
 */

import { SupabaseService } from './supabaseService';
// Hedera EVM service removed - using BSC implementation
import { RESOLUTION_CONFIG } from '../config/resolutionConfig';

export interface FinalResolutionJob {
  marketId: string;
  contractAddress: string;
  preliminaryOutcome: 'yes' | 'no';
  confidenceScore: number;
  preliminaryResolveTime: Date;
  evidencePeriodStart: Date;
  status: 'pending_resolution';
}

export interface RefundJob {
  marketId: string;
  contractAddress: string;
  evidencePeriodStart: Date;
  confidenceScore: number;
  reason: string;
}

export interface ExecutionResult {
  success: boolean;
  marketId: string;
  action: 'final_resolve' | 'refund' | 'skip';
  transactionHash?: string;
  error?: string;
  reason?: string;
}

export class FinalResolutionExecutor {
  private supabaseService: SupabaseService;
  private dryRunMode: boolean;

  // Configuration constants (from resolutionConfig.ts)
  private readonly DISPUTE_PERIOD_DAYS = RESOLUTION_CONFIG.timingThresholds.disputePeriodDays;
  private readonly MAX_EVIDENCE_PERIOD_DAYS = RESOLUTION_CONFIG.timingThresholds.maxEvidencePeriodDays;
  private readonly MIN_CONFIDENCE_THRESHOLD = RESOLUTION_CONFIG.timingThresholds.minConfidenceThreshold;

  constructor(dryRunMode: boolean = false) {
    this.supabaseService = new SupabaseService();
    this.dryRunMode = dryRunMode;

    if (dryRunMode) {
      console.log('⚠️ FinalResolutionExecutor running in DRY-RUN mode (no blockchain transactions)');
    }
  }

  /**
   * Main execution method - checks all markets and processes accordingly
   */
  async execute(): Promise<ExecutionResult[]> {
    console.log('🔍 [FinalResolutionExecutor] Starting final resolution check...');
    const results: ExecutionResult[] = [];

    try {
      // Step 1: Find markets ready for final resolution (dispute period ended)
      const finalResolutionJobs = await this.findMarketsReadyForFinalResolution();
      console.log(`📊 Found ${finalResolutionJobs.length} markets ready for final resolution`);

      // Step 2: Find markets eligible for refund (>30 days, <80% confidence)
      const refundJobs = await this.findMarketsEligibleForRefund();
      console.log(`💸 Found ${refundJobs.length} markets eligible for refund`);

      // Step 3: Process final resolutions
      for (const job of finalResolutionJobs) {
        const result = await this.processFinalResolution(job);
        results.push(result);
      }

      // Step 4: Process refunds
      for (const job of refundJobs) {
        const result = await this.processRefund(job);
        results.push(result);
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`✅ [FinalResolutionExecutor] Completed: ${successful} successful, ${failed} failed`);

      return results;

    } catch (error) {
      console.error('❌ [FinalResolutionExecutor] Execution failed:', error);
      return results;
    }
  }

  /**
   * Find markets in pending_resolution status where dispute period (7 days) has ended
   */
  private async findMarketsReadyForFinalResolution(): Promise<FinalResolutionJob[]> {
    try {
      const now = new Date();
      const disputePeriodMs = this.DISPUTE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

      // Query markets from database
      const markets = await this.supabaseService.getMarketsInPendingResolution();

      // Filter markets where dispute period has ended
      const readyMarkets: FinalResolutionJob[] = [];

      for (const market of markets) {
        // Skip if no preliminary resolution time (shouldn't happen, but safety check)
        if (!market.preliminary_resolve_time) {
          console.warn(`⚠️ Market ${market.id} in pending_resolution but no preliminary_resolve_time`);
          continue;
        }

        const preliminaryResolveTime = new Date(market.preliminary_resolve_time);
        const timeSincePreliminary = now.getTime() - preliminaryResolveTime.getTime();

        // Check if dispute period has ended
        if (timeSincePreliminary >= disputePeriodMs) {
          readyMarkets.push({
            marketId: market.id,
            contractAddress: market.contract_address,
            preliminaryOutcome: market.ai_recommendation?.toLowerCase() as 'yes' | 'no',
            confidenceScore: market.ai_confidence_score || 0,
            preliminaryResolveTime: preliminaryResolveTime,
            evidencePeriodStart: market.evidence_period_start ? new Date(market.evidence_period_start) : preliminaryResolveTime,
            status: 'pending_resolution'
          });

          const daysElapsed = Math.floor(timeSincePreliminary / (24 * 60 * 60 * 1000));
          console.log(`✅ Market ${market.id} ready: ${daysElapsed} days since preliminary resolution`);
        }
      }

      return readyMarkets;

    } catch (error) {
      console.error('❌ Error finding markets ready for final resolution:', error);
      return [];
    }
  }

  /**
   * Find markets eligible for refund (>30 days in evidence period, <80% confidence)
   */
  private async findMarketsEligibleForRefund(): Promise<RefundJob[]> {
    try {
      const now = new Date();
      const maxEvidencePeriodMs = this.MAX_EVIDENCE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

      // Query markets still in pending_resolution or disputable status
      const markets = await this.supabaseService.getMarketsInPendingResolution();

      const refundEligible: RefundJob[] = [];

      for (const market of markets) {
        // Must have evidence period start date
        if (!market.evidence_period_start) {
          continue;
        }

        const evidencePeriodStart = new Date(market.evidence_period_start);
        const timeSinceEvidenceStart = now.getTime() - evidencePeriodStart.getTime();
        const daysInEvidence = Math.floor(timeSinceEvidenceStart / (24 * 60 * 60 * 1000));

        // Check if exceeded max evidence period AND confidence below threshold
        const confidence = market.ai_confidence_score || 0;
        const exceededPeriod = timeSinceEvidenceStart >= maxEvidencePeriodMs;
        const belowThreshold = confidence < this.MIN_CONFIDENCE_THRESHOLD;

        if (exceededPeriod && belowThreshold) {
          refundEligible.push({
            marketId: market.id,
            contractAddress: market.contract_address,
            evidencePeriodStart: evidencePeriodStart,
            confidenceScore: confidence,
            reason: `Evidence period exceeded ${this.MAX_EVIDENCE_PERIOD_DAYS} days (${daysInEvidence} days) with confidence ${confidence}% (below ${this.MIN_CONFIDENCE_THRESHOLD}% threshold)`
          });

          console.log(`💸 Market ${market.id} eligible for refund: ${daysInEvidence} days, ${confidence}% confidence`);
        }
      }

      return refundEligible;

    } catch (error) {
      console.error('❌ Error finding markets eligible for refund:', error);
      return [];
    }
  }

  /**
   * Process final resolution for a single market
   */
  private async processFinalResolution(job: FinalResolutionJob): Promise<ExecutionResult> {
    console.log(`⚖️ Processing final resolution for market ${job.marketId}...`);
    console.log(`   Outcome: ${job.preliminaryOutcome.toUpperCase()}, Confidence: ${job.confidenceScore}%`);

    try {
      // Validate contract address
      if (!job.contractAddress || job.contractAddress === 'pending') {
        return {
          success: false,
          marketId: job.marketId,
          action: 'skip',
          reason: 'No contract address available'
        };
      }

      // Check for active disputes (future enhancement)
      // For now, we assume no disputes or disputes have been resolved by admin

      // Dry-run mode: skip blockchain transaction
      if (this.dryRunMode) {
        console.log(`🏃 [DRY-RUN] Would execute finalResolve(${job.preliminaryOutcome}, ${job.confidenceScore}) on ${job.contractAddress}`);

        // Still update database in dry-run to test DB logic
        await this.supabaseService.updateMarketStatus(job.marketId, 'resolved', {
          final_resolve_time: new Date().toISOString(),
          resolution_tx_hash: 'DRY_RUN_TX_HASH',
          resolved_at: new Date().toISOString()
        });

        return {
          success: true,
          marketId: job.marketId,
          action: 'final_resolve',
          transactionHash: 'DRY_RUN_TX_HASH',
          reason: 'Dry-run mode - no actual blockchain transaction'
        };
      }

      // Execute final resolution on smart contract
      const hederaService = getHederaEVMServiceInstance();
      const txHash = await hederaService.finalResolve(
        job.contractAddress,
        job.preliminaryOutcome,
        job.confidenceScore
      );

      console.log(`✅ Final resolution transaction confirmed: ${txHash}`);

      // Update database
      await this.supabaseService.updateMarketStatus(job.marketId, 'resolved', {
        final_resolve_time: new Date().toISOString(),
        resolution_tx_hash: txHash,
        resolved_at: new Date().toISOString(),
        final_outcome: job.preliminaryOutcome
      });

      console.log(`✅ Market ${job.marketId} finally resolved successfully`);

      return {
        success: true,
        marketId: job.marketId,
        action: 'final_resolve',
        transactionHash: txHash
      };

    } catch (error) {
      console.error(`❌ Failed to process final resolution for ${job.marketId}:`, error);

      return {
        success: false,
        marketId: job.marketId,
        action: 'final_resolve',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process refund for a single market
   */
  private async processRefund(job: RefundJob): Promise<ExecutionResult> {
    console.log(`💸 Processing refund for market ${job.marketId}...`);
    console.log(`   Reason: ${job.reason}`);

    try {
      // Validate contract address
      if (!job.contractAddress || job.contractAddress === 'pending') {
        return {
          success: false,
          marketId: job.marketId,
          action: 'skip',
          reason: 'No contract address available'
        };
      }

      // Dry-run mode: skip blockchain transaction
      if (this.dryRunMode) {
        console.log(`🏃 [DRY-RUN] Would execute refundAllBets() on ${job.contractAddress}`);

        await this.supabaseService.updateMarketStatus(job.marketId, 'refunded', {
          refunded: true,
          refund_tx_hash: 'DRY_RUN_REFUND_TX_HASH',
          refunded_at: new Date().toISOString(),
          refund_reason: job.reason
        });

        return {
          success: true,
          marketId: job.marketId,
          action: 'refund',
          transactionHash: 'DRY_RUN_REFUND_TX_HASH',
          reason: 'Dry-run mode - no actual blockchain transaction'
        };
      }

      // Execute refund on smart contract
      const hederaService = getHederaEVMServiceInstance();
      const txHash = await hederaService.refundAllBets(job.contractAddress);

      console.log(`✅ Refund transaction confirmed: ${txHash}`);

      // Update database
      await this.supabaseService.updateMarketStatus(job.marketId, 'refunded', {
        refunded: true,
        refund_tx_hash: txHash,
        refunded_at: new Date().toISOString(),
        refund_reason: job.reason
      });

      console.log(`✅ Market ${job.marketId} refunded successfully`);

      return {
        success: true,
        marketId: job.marketId,
        action: 'refund',
        transactionHash: txHash
      };

    } catch (error) {
      console.error(`❌ Failed to process refund for ${job.marketId}:`, error);

      return {
        success: false,
        marketId: job.marketId,
        action: 'refund',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get status report
   */
  getStatus(): string {
    return this.dryRunMode ? 'DRY-RUN' : 'LIVE';
  }
}

// Export singleton instance
let executorInstance: FinalResolutionExecutor | null = null;

export function getFinalResolutionExecutor(dryRunMode: boolean = false): FinalResolutionExecutor {
  if (!executorInstance) {
    executorInstance = new FinalResolutionExecutor(dryRunMode);
  }
  return executorInstance;
}
