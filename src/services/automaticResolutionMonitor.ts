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

    this.isRunning = true;

    // Run immediately on start
    this.checkAndResolveExpiredMarkets();

    // Then run on interval
    this.checkInterval = setInterval(
      () => this.checkAndResolveExpiredMarkets(),
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
}

// Export singleton instance
export const automaticResolutionMonitor = new AutomaticResolutionMonitor();
