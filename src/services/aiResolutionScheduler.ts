/**
 * AI Resolution Scheduler
 *
 * Smart scheduler that monitors market expiry times and automatically
 * triggers AI resolution exactly when markets expire.
 */

import { supabase } from '../utils/supabase';
import { perplexityResolutionService } from './perplexityResolutionService';
import { geminiResolutionService } from './geminiResolutionService';
import { resolutionService } from '../utils/resolutionService';
import { toast } from 'sonner';

interface ScheduledMarket {
  id: string;
  claim: string;
  description?: string;
  expiresAt: Date;
  timerId?: NodeJS.Timeout;
  contractAddress?: string;
}

class AIResolutionScheduler {
  private scheduledMarkets: Map<string, ScheduledMarket> = new Map();
  private isRunning: boolean = false;
  private checkInterval?: NodeJS.Timeout;

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('⏰ AI Resolution Scheduler already running');
      return;
    }

    console.log('🚀 Starting AI Resolution Scheduler...');
    this.isRunning = true;

    // Load all active markets and schedule them
    await this.loadAndScheduleMarkets();

    // Check for new markets every 5 minutes
    this.checkInterval = setInterval(() => {
      this.loadAndScheduleMarkets();
    }, 5 * 60 * 1000);

    console.log('✅ AI Resolution Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    console.log('🛑 Stopping AI Resolution Scheduler...');

    // Clear all scheduled timers
    this.scheduledMarkets.forEach(market => {
      if (market.timerId) {
        clearTimeout(market.timerId);
      }
    });

    this.scheduledMarkets.clear();

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.isRunning = false;
    console.log('✅ AI Resolution Scheduler stopped');
  }

  /**
   * Load active markets from database and schedule resolution
   */
  private async loadAndScheduleMarkets() {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not configured');
        return;
      }

      console.log('📊 Loading active markets for scheduling...');

      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('status', 'active')
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error loading markets:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📭 No active markets to schedule');
        return;
      }

      console.log(`📋 Found ${data.length} active markets`);

      // Schedule each market
      for (const market of data) {
        // Skip if already scheduled
        if (this.scheduledMarkets.has(market.id)) {
          continue;
        }

        const expiresAt = new Date(market.expires_at);
        const now = new Date();

        // Skip if already expired (should be handled by existing monitor)
        if (expiresAt <= now) {
          console.log(`⏭️ Market ${market.id} already expired, skipping scheduler`);
          continue;
        }

        this.scheduleMarketResolution({
          id: market.id,
          claim: market.claim,
          description: market.description,
          expiresAt,
          contractAddress: market.contract_address
        });
      }

    } catch (error) {
      console.error('Error in loadAndScheduleMarkets:', error);
    }
  }

  /**
   * Schedule a specific market for AI resolution
   */
  private scheduleMarketResolution(market: ScheduledMarket) {
    const now = new Date();
    const timeUntilExpiry = market.expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry <= 0) {
      console.log(`⏭️ Market ${market.id} already expired`);
      return;
    }

    console.log(`⏰ Scheduling market ${market.id} for resolution in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
    console.log(`   Expires at: ${market.expiresAt.toLocaleString()}`);

    // Set a timeout to trigger resolution at expiry
    const timerId = setTimeout(async () => {
      await this.triggerMarketResolution(market);
      // Remove from scheduled markets after resolution
      this.scheduledMarkets.delete(market.id);
    }, timeUntilExpiry);

    // Store the scheduled market
    this.scheduledMarkets.set(market.id, {
      ...market,
      timerId
    });

    console.log(`✅ Market ${market.id} scheduled successfully`);
  }

  /**
   * Trigger AI resolution for an expired market
   */
  private async triggerMarketResolution(market: ScheduledMarket) {
    try {
      console.log('🤖 ============================================');
      console.log('🤖 TRIGGERING AI RESOLUTION');
      console.log(`📋 Market: ${market.claim}`);
      console.log(`⏰ Expired at: ${market.expiresAt.toLocaleString()}`);
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

      // Determine if manual review is needed
      let needsManualReview = false;
      let finalResolution = perplexityResolution;
      let resolutionSource = 'Perplexity AI';

      if (geminiResolution) {
        // Check if AIs disagree
        if (perplexityResolution.outcome !== geminiResolution.outcome) {
          console.warn('⚠️ Perplexity and Gemini disagree - marking for manual review');
          needsManualReview = true;
          resolutionSource = 'Perplexity AI vs Gemini (CONFLICT)';
        } else {
          // AIs agree - use the one with higher confidence
          if (geminiResolution.confidence > perplexityResolution.confidence) {
            finalResolution = geminiResolution;
            resolutionSource = 'Gemini AI (fallback - higher confidence)';
          } else {
            resolutionSource = 'Perplexity AI (confirmed by Gemini)';
          }
        }
      }

      // If either AI needs review or they conflict, mark for manual review
      if (perplexityResolution.needsReview || (geminiResolution && geminiResolution.needsReview) || needsManualReview) {
        console.warn('⚠️ Resolution needs manual review');

        // Update market with "needs review" status, including both AI opinions if available
        await this.markMarketForReview(market.id, perplexityResolution, geminiResolution, resolutionSource);

        toast.warning(`Market "${market.claim}" needs manual review`);
        return;
      }

      // Update database with AI resolution
      await this.saveResolutionToDatabase(market.id, finalResolution, resolutionSource, geminiResolution ? 'yes' : 'no');

      // Trigger payout automatically
      await this.triggerPayout(market.id, market.contractAddress, finalResolution.outcome);

      console.log('✅ Market resolved and payout triggered successfully');
      toast.success(`Market resolved: ${finalResolution.outcome.toUpperCase()}`);

    } catch (error) {
      console.error('❌ Error in triggerMarketResolution:', error);
      toast.error('Failed to resolve market automatically');
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
          status: 'resolved',
          resolution_data: {
            final_outcome: resolution.outcome,
            outcome: resolution.outcome,
            confidence: resolution.confidence,
            admin_notes: resolution.reasoning,
            source: source,
            resolved_by: 'api',
            timestamp: new Date().toISOString(),
            gemini_fallback_used: geminiUsed
          }
        })
        .eq('id', marketId);

      if (error) {
        console.error('Error saving resolution to database:', error);
        throw error;
      }

      console.log('✅ Resolution saved to database');
    } catch (error) {
      console.error('Error in saveResolutionToDatabase:', error);
      throw error;
    }
  }

  /**
   * Mark market for manual review
   */
  private async markMarketForReview(marketId: string, perplexityResolution: any, geminiResolution: any = null, source: string) {
    try {
      if (!supabase) return;

      // Build admin notes with both AI opinions if available
      let adminNotes = `AI NEEDS REVIEW:\n\nPerplexity AI: ${perplexityResolution.outcome.toUpperCase()} (${perplexityResolution.confidence}% confidence)\n${perplexityResolution.reasoning}`;

      if (geminiResolution) {
        adminNotes += `\n\nGemini AI: ${geminiResolution.outcome.toUpperCase()} (${geminiResolution.confidence}% confidence)\n${geminiResolution.reasoning}`;

        if (perplexityResolution.outcome !== geminiResolution.outcome) {
          adminNotes = `⚠️ AI CONFLICT DETECTED - MANUAL REVIEW REQUIRED\n\n` + adminNotes;
        }
      }

      const { error } = await supabase
        .from('approved_markets')
        .update({
          status: 'pending_resolution',
          resolution_data: {
            outcome: perplexityResolution.outcome,
            confidence: perplexityResolution.confidence,
            admin_notes: adminNotes,
            source: source,
            resolved_by: 'api',
            timestamp: new Date().toISOString(),
            needs_manual_review: true,
            perplexity_result: perplexityResolution,
            gemini_result: geminiResolution
          }
        })
        .eq('id', marketId);

      if (error) {
        console.error('Error marking market for review:', error);
      }
    } catch (error) {
      console.error('Error in markMarketForReview:', error);
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

      // Call resolveMarketWithAI on the blockchain
      // This enables users to call redeem() to claim their winnings
      const confidence = 80; // Default confidence for automated resolution

      console.log(`🔐 Calling resolveMarketWithAI on blockchain...`);
      const result = await resolutionService.resolveMarketWithAI(marketId, outcome, confidence);

      console.log('✅ Market resolved on blockchain!');
      console.log(`   Transaction: ${result.transactionId || 'N/A'}`);
      console.log(`   Users can now claim winnings via redeem()`);

    } catch (error) {
      console.error('Error triggering payout:', error);
      throw error;
    }
  }

  /**
   * Manually trigger resolution for a specific market (for admin use)
   */
  async manuallyResolveMarket(marketId: string, claim: string, description?: string, contractAddress?: string) {
    console.log(`🔧 Manually triggering resolution for market: ${marketId}`);

    await this.triggerMarketResolution({
      id: marketId,
      claim,
      description,
      expiresAt: new Date(), // Already expired
      contractAddress
    });
  }

  /**
   * Get status of scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledMarketsCount: this.scheduledMarkets.size,
      scheduledMarkets: Array.from(this.scheduledMarkets.values()).map(m => ({
        id: m.id,
        claim: m.claim,
        expiresAt: m.expiresAt.toISOString()
      }))
    };
  }
}

// Export singleton instance
export const aiResolutionScheduler = new AIResolutionScheduler();
