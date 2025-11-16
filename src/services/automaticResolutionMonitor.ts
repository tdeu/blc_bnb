import { supabase } from '../utils/supabase';
import { resolutionService } from '../utils/resolutionService';
import { getCurrentUnixTimestamp } from '../utils/timeUtils';

/**
 * Automatic Resolution Monitor
 *
 * Simplified automated lifecycle for markets:
 * 1. Detects expired markets (endTime passed)
 * 2. Calls AI to get resolution outcome + confidence
 * 3. Directly resolves market with resolveMarketWithAI()
 *
 * No more dispute periods or evidence submission.
 */

export class AutomaticResolutionMonitor {
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour (check every hour for expired markets)

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
      // Status should be 'open' or 'expired' (but not 'resolved' or 'pending_resolution')
      const { data: expiredMarkets, error } = await supabase
        .from('approved_markets')
        .select('*')
        .in('status', ['open', 'expired'])
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
      for (const market of expiredMarkets) {
        try {
          console.log(`\n🎯 Processing market: ${market.id}`);
          console.log(`   Question: ${market.claim}`);
          console.log(`   Expired at: ${market.expires_at}`);
          console.log(`   Current status: ${market.status}`);

          // First update status to pending_resolution
          await supabase
            .from('approved_markets')
            .update({ status: 'pending_resolution' })
            .eq('id', market.id);

          console.log(`   Status updated to: pending_resolution`);

          // Call AI to get resolution outcome
          console.log(`   🤖 Calling AI for resolution...`);
          const aiResult = await this.getAIResolution(market);

          if (!aiResult) {
            console.log(`   ⚠️  AI resolution failed, skipping market`);
            // Revert status back to expired
            await supabase
              .from('approved_markets')
              .update({ status: 'expired' })
              .eq('id', market.id);
            continue;
          }

          console.log(`   AI Result: ${aiResult.outcome.toUpperCase()} (${aiResult.confidence}% confidence)`);

          // Resolve market on blockchain with AI outcome
          console.log(`   📞 Calling resolveMarketWithAI()...`);
          const result = await resolutionService.resolveMarketWithAI(
            market.id,
            aiResult.outcome,
            aiResult.confidence
          );

          console.log(`   ✅ Market resolved successfully!`);
          console.log(`      TX: ${result.transactionId}`);
          console.log(`      Outcome: ${aiResult.outcome.toUpperCase()}`);
          console.log(`      Confidence: ${aiResult.confidence}%`);

        } catch (marketError) {
          console.error(`   ❌ Error processing market ${market.id}:`, marketError);
          // Continue with next market
        }
      }

      console.log(`\n✅ Finished processing ${expiredMarkets.length} market(s)`);

    } catch (error) {
      console.error('❌ Error in checkAndResolveExpiredMarkets:', error);
    }
  }

  /**
   * Get AI resolution for a market using Perplexity API
   */
  private async getAIResolution(market: any): Promise<{ outcome: 'yes' | 'no'; confidence: number } | null> {
    try {
      console.log(`   🧠 Querying Perplexity AI...`);

      // Call your AI resolution API
      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: market.claim,
          marketId: market.id,
          category: market.category,
          description: market.description
        })
      });

      if (!response.ok) {
        console.error(`   ❌ AI API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      // Parse AI response
      // Expected format: { outcome: 'yes'|'no', confidence: 0-100, reasoning: string }
      if (!data.outcome || !data.confidence) {
        console.error(`   ❌ Invalid AI response format:`, data);
        return null;
      }

      return {
        outcome: data.outcome.toLowerCase() as 'yes' | 'no',
        confidence: Math.min(100, Math.max(0, data.confidence))
      };

    } catch (error) {
      console.error(`   ❌ Error calling AI:`, error);
      return null;
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
