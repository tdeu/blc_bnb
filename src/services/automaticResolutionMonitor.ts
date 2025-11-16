import { supabase } from '../utils/supabase';
import { resolutionService } from '../utils/resolutionService';
import { getCurrentUnixTimestamp } from '../utils/timeUtils';
import { perplexityResolutionService } from './perplexityResolutionService';
import { geminiResolutionService } from './geminiResolutionService';
import { toast } from 'sonner';

/**
 * Automatic Resolution Monitor
 *
 * Automated lifecycle for markets:
 * 1. Detects expired markets (endTime passed)
 * 2. Calls Perplexity AI + Gemini fallback for resolution
 * 3. If confidence >= 85% and AIs agree: resolves directly
 * 4. If confidence < 85% or AIs disagree: starts 48h evidence collection
 *
 * Uses same dual-AI system as aiResolutionScheduler for consistency.
 *
 * IMPORTANT: Only processes markets that have ACTUALLY expired (expires_at < NOW)
 */

export class AutomaticResolutionMonitor {
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  // Configuration - Check every 5 minutes for more responsive expiration detection
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Start the automatic resolution monitor
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️  AutomaticResolutionMonitor is already running');
      return;
    }

    console.log('🚀 Starting AutomaticResolutionMonitor...');
    console.log(`   - Checking for expired markets every ${this.CHECK_INTERVAL_MS / 60000} minutes`);
    console.log(`   - Monitoring evidence collection periods (48h)`);

    this.isRunning = true;

    // Run immediately on start
    this.checkAndResolveExpiredMarkets();
    this.checkEvidenceCollectionPeriods();

    // Then run on interval
    this.checkInterval = setInterval(
      () => {
        this.checkAndResolveExpiredMarkets();
        this.checkEvidenceCollectionPeriods();
      },
      this.CHECK_INTERVAL_MS
    );

    console.log('✅ AutomaticResolutionMonitor started successfully');
  }

  /**
   * Stop the automatic resolution monitor
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('⚠️  AutomaticResolutionMonitor is not running');
      return;
    }

    console.log('🛑 Stopping AutomaticResolutionMonitor...');

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    console.log('✅ AutomaticResolutionMonitor stopped');
  }

  /**
   * Check for markets that have expired and automatically resolve them with AI
   */
  private async checkAndResolveExpiredMarkets(): Promise<void> {
    try {
      console.log('\n🔍 Checking for expired markets to resolve...');

      if (!supabase) {
        console.warn('⚠️  Supabase not initialized, skipping check');
        return;
      }

      const now = new Date();
      const nowISO = now.toISOString();

      // Find markets that are expired but not yet resolved
      // Status should be 'active' or 'expired' (but not 'resolved', 'pending_payout', or 'evidence_collection')
      const { data: expiredMarkets, error } = await supabase
        .from('approved_markets')
        .select('*')
        .in('status', ['active', 'expired'])
        .lt('expires_at', nowISO)
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        return;
      }

      if (!expiredMarkets || expiredMarkets.length === 0) {
        console.log('✅ No expired markets to resolve');
        return;
      }

      console.log(`📊 Found ${expiredMarkets.length} expired market(s) to resolve`);

      // Process each expired market
      let processedCount = 0;
      let skippedCount = 0;

      for (const market of expiredMarkets) {
        try {
          console.log(`\n🎯 Processing market: ${market.id}`);
          console.log(`   Question: ${market.claim}`);
          console.log(`   Expires at: ${market.expires_at}`);
          console.log(`   Current status: ${market.status}`);

          // CRITICAL SAFETY CHECK: Double-verify expiration in JavaScript (not just SQL)
          const marketExpiresAt = new Date(market.expires_at);
          const currentTime = new Date();
          const timeDiffMs = currentTime.getTime() - marketExpiresAt.getTime();
          const timeDiffMinutes = Math.round(timeDiffMs / (1000 * 60));

          console.log(`   ⏰ Time check: Current=${currentTime.toISOString()}, Expires=${marketExpiresAt.toISOString()}`);
          console.log(`   ⏰ Time difference: ${timeDiffMinutes} minutes (${timeDiffMs > 0 ? 'EXPIRED' : 'NOT YET EXPIRED'})`);

          // GUARD: Skip if market is NOT actually expired
          if (marketExpiresAt > currentTime) {
            console.warn(`   ⚠️ SKIPPING: Market has NOT expired yet! expires_at (${marketExpiresAt.toISOString()}) > now (${currentTime.toISOString()})`);
            console.warn(`   ⚠️ This market should NOT have been in the query results. Possible database timezone issue.`);
            skippedCount++;
            continue;
          }

          // GUARD: Skip if market expired less than 1 minute ago (avoid race conditions)
          if (timeDiffMs < 60000) {
            console.log(`   ⏳ WAITING: Market just expired (${timeDiffMinutes} min ago). Waiting for at least 1 minute after expiration.`);
            skippedCount++;
            continue;
          }

          console.log(`   ✅ Market confirmed expired ${timeDiffMinutes} minutes ago. Proceeding with AI resolution...`);

          // Call dual-AI resolution (Perplexity + Gemini fallback)
          await this.resolveMarketWithDualAI(market);
          processedCount++;

          // Show toast notification for user visibility
          toast.info(`Market "${market.claim.substring(0, 50)}..." expired - AI resolution in progress`, { duration: 5000 });

        } catch (marketError) {
          console.error(`   ❌ Error processing market ${market.id}:`, marketError);
          // Continue with next market
        }
      }

      console.log(`\n✅ Finished processing markets:`);
      console.log(`   - Processed: ${processedCount}`);
      console.log(`   - Skipped: ${skippedCount}`);
      console.log(`   - Total checked: ${expiredMarkets.length}`);

    } catch (error) {
      console.error('❌ Error in checkAndResolveExpiredMarkets:', error);
    }
  }

  /**
   * Resolve market using dual-AI system (Perplexity + Gemini fallback)
   * Same logic as aiResolutionScheduler for consistency
   */
  private async resolveMarketWithDualAI(market: any): Promise<void> {
    try {
      console.log('🤖 ============================================');
      console.log('🤖 TRIGGERING DUAL-AI RESOLUTION');
      console.log(`📋 Market: ${market.claim}`);
      console.log(`⏰ Expired at: ${market.expires_at}`);
      console.log('🤖 ============================================');

      // Call Perplexity AI to get resolution
      const perplexityResolution = await perplexityResolutionService.resolveMarket(
        market.claim,
        market.description
      );

      console.log('📊 Perplexity Resolution Result:', perplexityResolution);

      // Check if confidence is below 85% - trigger Gemini fallback
      let geminiResolution = null;
      if (perplexityResolution.confidence < 85) {
        console.log('⚠️ Perplexity confidence below 85% - triggering Gemini fallback...');

        geminiResolution = await geminiResolutionService.resolveMarket(
          market.claim,
          market.description
        );

        console.log('📊 Gemini Fallback Result:', geminiResolution);
      }

      // Determine if evidence collection is needed
      let needsEvidenceCollection = false;
      let finalResolution = perplexityResolution;
      let resolutionSource = 'Perplexity AI';

      if (geminiResolution) {
        // Check if AIs disagree
        if (perplexityResolution.outcome !== geminiResolution.outcome) {
          console.warn('⚠️ Perplexity and Gemini disagree - needs evidence collection');
          needsEvidenceCollection = true;
          resolutionSource = 'Perplexity AI vs Gemini (CONFLICT)';
        } else {
          // AIs agree - check if both are below 85%
          const maxConfidence = Math.max(perplexityResolution.confidence, geminiResolution.confidence);

          if (maxConfidence < 85) {
            console.warn(`⚠️ Both AIs below 85% (max: ${maxConfidence}%) - triggering 48h evidence collection`);
            needsEvidenceCollection = true;
            resolutionSource = `Both AIs agree but low confidence (${maxConfidence}%)`;
          } else {
            // AIs agree and at least one is >= 85%
            if (geminiResolution.confidence > perplexityResolution.confidence) {
              finalResolution = geminiResolution;
              resolutionSource = 'Gemini AI (fallback - higher confidence)';
            } else {
              resolutionSource = 'Perplexity AI (confirmed by Gemini)';
            }
          }
        }
      }

      // If needs evidence collection or AIs need review
      if (perplexityResolution.needsReview || (geminiResolution && geminiResolution.needsReview) || needsEvidenceCollection) {
        console.warn('⚠️ Resolution needs evidence collection period (48h)');

        // Start 48h evidence collection period
        await this.startEvidenceCollectionPeriod(market.id, perplexityResolution, geminiResolution, resolutionSource);

        console.log(`📋 Market "${market.claim}" entered 48h evidence collection period`);

        // Show toast notification for user visibility
        toast.warning(`Market "${market.claim.substring(0, 50)}..." entered 48h evidence collection period`, {
          duration: 8000,
          description: 'AI confidence was below 85% or AIs disagreed. Users can submit evidence during this period.'
        });
        return;
      }

      // High confidence resolution - save to database and trigger payout
      await this.saveResolutionToDatabase(market.id, finalResolution, resolutionSource, geminiResolution ? 'yes' : 'no');

      // Trigger payout automatically
      await this.triggerPayout(market.id, market.contract_address, finalResolution.outcome);

      console.log('✅ Market resolved and payout triggered successfully');

    } catch (error) {
      console.error('❌ Error in resolveMarketWithDualAI:', error);
      throw error;
    }
  }

  /**
   * Save AI resolution to database
   */
  private async saveResolutionToDatabase(marketId: string, resolution: any, source: string, geminiUsed: string) {
    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('approved_markets')
        .update({
          status: 'pending_payout',
          resolution_data: {
            final_outcome: resolution.outcome,
            outcome: resolution.outcome,
            confidence: resolution.confidence,
            admin_notes: resolution.reasoning,
            source: source,
            resolved_by: 'api',
            timestamp: new Date().toISOString(),
            gemini_fallback_used: geminiUsed,
            sources: resolution.sources || [] // Include Perplexity citations
          }
        })
        .eq('id', marketId);

      if (error) {
        console.error('Error saving resolution to database:', error);
        throw error;
      }

      console.log('✅ Resolution saved to database (pending blockchain)');
    } catch (error) {
      console.error('Error in saveResolutionToDatabase:', error);
      throw error;
    }
  }

  /**
   * Start 48h evidence collection period
   */
  private async startEvidenceCollectionPeriod(marketId: string, perplexityResolution: any, geminiResolution: any = null, source: string) {
    try {
      if (!supabase) return;

      const now = new Date();
      const evidencePeriodEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

      // Build admin notes with both AI opinions
      let adminNotes = `🕐 EVIDENCE COLLECTION PERIOD (48h)\n\nOriginal AI Analysis:\n\nPerplexity AI: ${perplexityResolution.outcome.toUpperCase()} (${perplexityResolution.confidence}% confidence)\n${perplexityResolution.reasoning}`;

      if (geminiResolution) {
        adminNotes += `\n\nGemini AI: ${geminiResolution.outcome.toUpperCase()} (${geminiResolution.confidence}% confidence)\n${geminiResolution.reasoning}`;

        if (perplexityResolution.outcome !== geminiResolution.outcome) {
          adminNotes = `⚠️ AI CONFLICT - Evidence collection required\n\n` + adminNotes;
        } else {
          adminNotes = `⚠️ LOW CONFIDENCE (< 85%) - Evidence collection required\n\n` + adminNotes;
        }
      }

      adminNotes += `\n\n📅 Evidence Period Ends: ${evidencePeriodEnd.toLocaleString()}`;
      adminNotes += `\nUsers can submit evidences via IPFS during this period.`;
      adminNotes += `\nAdmin can re-run AI with evidence context after period ends.`;

      const { error } = await supabase
        .from('approved_markets')
        .update({
          status: 'evidence_collection',
          evidence_period_start: now.toISOString(),
          evidence_period_end: evidencePeriodEnd.toISOString(),
          resolution_data: {
            outcome: perplexityResolution.outcome,
            confidence: perplexityResolution.confidence,
            admin_notes: adminNotes,
            source: source,
            resolved_by: 'pending',
            timestamp: now.toISOString(),
            needs_manual_review: true,
            evidence_collection_active: true,
            perplexity_result: perplexityResolution,
            gemini_result: geminiResolution
          }
        })
        .eq('id', marketId);

      if (error) {
        console.error('Error starting evidence collection period:', error);
        throw error;
      }

      console.log(`✅ Evidence collection period started for market ${marketId}`);
      console.log(`   Period ends: ${evidencePeriodEnd.toLocaleString()}`);

    } catch (error) {
      console.error('Error in startEvidenceCollectionPeriod:', error);
      throw error;
    }
  }

  /**
   * Trigger payout on the blockchain
   */
  private async triggerPayout(marketId: string, contractAddress: string | undefined, outcome: 'yes' | 'no') {
    try {
      console.log('💰 Triggering payout...');
      console.log(`   Contract: ${contractAddress}`);
      console.log(`   Outcome: ${outcome}`);

      if (!contractAddress) {
        console.warn('⚠️ No contract address, skipping blockchain payout');
        return;
      }

      const confidence = 80;
      console.log(`🔐 Calling resolveMarketWithAI on blockchain...`);
      const result = await resolutionService.resolveMarketWithAI(marketId, outcome, confidence);

      console.log('✅ Market resolved on blockchain!');
      console.log(`   Transaction: ${result.transactionId || 'N/A'}`);

      // Mark as fully resolved in database
      await this.markMarketAsResolved(marketId);

    } catch (error) {
      console.error('Error triggering payout:', error);
      throw error;
    }
  }

  /**
   * Mark market as fully resolved after blockchain confirmation
   */
  private async markMarketAsResolved(marketId: string) {
    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('approved_markets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', marketId);

      if (error) {
        console.error('Error marking market as resolved:', error);
      } else {
        console.log('✅ Market marked as resolved in database');
      }
    } catch (error) {
      console.error('Error in markMarketAsResolved:', error);
    }
  }

  /**
   * Manual trigger to check and resolve expired markets (useful for testing)
   */
  async triggerCheck(): Promise<void> {
    console.log('🔧 Manual trigger: checking and resolving expired markets...');
    await this.checkAndResolveExpiredMarkets();
  }

  /**
   * Check for markets in evidence_collection status with expired 48h periods
   * Notifies admin that these markets are ready for final resolution
   */
  private async checkEvidenceCollectionPeriods(): Promise<void> {
    try {
      console.log('\n🔍 Checking for expired evidence collection periods...');

      if (!supabase) {
        console.warn('⚠️  Supabase not initialized, skipping check');
        return;
      }

      const now = new Date();
      const nowISO = now.toISOString();

      // Find markets where evidence collection period has ended
      const { data: expiredPeriods, error } = await supabase
        .from('approved_markets')
        .select('id, claim, evidence_period_end, resolution_data')
        .eq('status', 'evidence_collection')
        .lt('evidence_period_end', nowISO)
        .order('evidence_period_end', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        return;
      }

      if (!expiredPeriods || expiredPeriods.length === 0) {
        console.log('✅ No evidence collection periods have expired');
        return;
      }

      console.log(`\n⚠️  ADMIN ACTION REQUIRED: ${expiredPeriods.length} market(s) need resolution`);
      console.log('   These markets have completed their 48h evidence collection period.');
      console.log('   Please use the Admin Panel → Pending Resolution Manager to:');
      console.log('   1. Review submitted evidences');
      console.log('   2. Re-run AI resolution with evidence context');
      console.log('\n   Markets awaiting resolution:');

      for (const market of expiredPeriods) {
        const periodEndDate = new Date(market.evidence_period_end);
        const hoursOverdue = Math.round((now.getTime() - periodEndDate.getTime()) / (1000 * 60 * 60));

        console.log(`   📋 Market: ${market.id}`);
        console.log(`      Claim: ${market.claim}`);
        console.log(`      Period ended: ${periodEndDate.toLocaleString()}`);
        console.log(`      Overdue by: ${hoursOverdue} hours`);

        if (market.resolution_data?.perplexity_result && market.resolution_data?.gemini_result) {
          console.log(`      Original AI conflict detected - needs evidence review`);
        }
        console.log('');
      }

      // Log summary for monitoring dashboards
      console.log(`📊 Summary: ${expiredPeriods.length} markets waiting for admin resolution`);
      console.log('   Use POST /api/resolve-with-evidence to trigger resolution');

    } catch (error) {
      console.error('❌ Error in checkEvidenceCollectionPeriods:', error);
    }
  }

  /**
   * Get markets currently in evidence collection period
   */
  async getMarketsInEvidenceCollection(): Promise<any[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('approved_markets')
      .select('id, claim, evidence_period_start, evidence_period_end, resolution_data')
      .eq('status', 'evidence_collection')
      .order('evidence_period_end', { ascending: true });

    if (error) {
      console.error('Error fetching evidence collection markets:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get summary stats for monitoring
   */
  async getMonitoringStats(): Promise<{
    activeMarkets: number;
    evidenceCollectionMarkets: number;
    expiredEvidencePeriods: number;
    resolvedMarkets: number;
  }> {
    if (!supabase) {
      return {
        activeMarkets: 0,
        evidenceCollectionMarkets: 0,
        expiredEvidencePeriods: 0,
        resolvedMarkets: 0
      };
    }

    const now = new Date().toISOString();

    const [active, evidenceCollection, expiredPeriods, resolved] = await Promise.all([
      supabase.from('approved_markets').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('approved_markets').select('id', { count: 'exact', head: true }).eq('status', 'evidence_collection'),
      supabase.from('approved_markets').select('id', { count: 'exact', head: true })
        .eq('status', 'evidence_collection')
        .lt('evidence_period_end', now),
      supabase.from('approved_markets').select('id', { count: 'exact', head: true }).eq('status', 'resolved')
    ]);

    return {
      activeMarkets: active.count || 0,
      evidenceCollectionMarkets: evidenceCollection.count || 0,
      expiredEvidencePeriods: expiredPeriods.count || 0,
      resolvedMarkets: resolved.count || 0
    };
  }
}

// Export singleton instance
export const automaticResolutionMonitor = new AutomaticResolutionMonitor();
