import { supabase, ApprovedMarket } from './supabase';
import { DISPUTE_PERIOD } from '../config/constants';

/**
 * Service to automatically update market statuses based on expiration and dispute periods
 */
export class MarketStatusService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start automatic status monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ MarketStatusService already running');
      return;
    }

    console.log('🚀 Starting MarketStatusService...');
    this.isRunning = true;

    // Check every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkAndUpdateStatuses();
    }, 30000);

    // Run initial check
    this.checkAndUpdateStatuses();
  }

  /**
   * Stop automatic status monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping MarketStatusService...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check and update market statuses
   */
  private async checkAndUpdateStatuses(): Promise<void> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available for status updates');
        return;
      }

      const now = new Date();

      // Get all markets that might need status updates
      const { data: markets, error } = await supabase
        .from('approved_markets')
        .select('*')
        .in('status', ['active', 'expired', 'disputable']);

      if (error) {
        console.error('❌ Error fetching markets for status update:', error);
        return;
      }

      if (!markets || markets.length === 0) {
        console.log('📊 No markets need status updates');
        return;
      }

      console.log(`🔍 Checking ${markets.length} markets for status updates...`);

      for (const market of markets) {
        await this.updateSingleMarketStatus(market, now);
      }

    } catch (error) {
      console.error('❌ Error in checkAndUpdateStatuses:', error);
    }
  }

  /**
   * Update status for a single market
   */
  private async updateSingleMarketStatus(market: ApprovedMarket, now: Date): Promise<void> {
    try {
      const expiresAt = new Date(market.expires_at);
      const isExpired = expiresAt <= now;

      // Case 1: Active market that has expired → Flag as expired (don't change to disputable yet)
      // The AutomaticResolutionMonitor will call preliminaryResolve() and then set to 'disputable'
      if (market.status === 'active' && isExpired) {
        console.log(`⏰ Market ${market.id} expired - flagging for preliminary resolution`);

        // Set to 'expired' status temporarily until preliminaryResolve() is called
        // This prevents the market from accepting new bets but doesn't set it to disputable yet
        await supabase!
          .from('approved_markets')
          .update({
            status: 'expired',
            // Don't set dispute_period_end yet - that happens after preliminaryResolve()
          })
          .eq('id', market.id);

        console.log(`✅ Market ${market.id} updated to expired status - waiting for preliminary resolution`);
      }

      // Case 2: Disputable market with expired dispute period → Ready for final resolution
      else if (market.status === 'disputable' && market.dispute_period_end) {
        const disputePeriodEnd = new Date(market.dispute_period_end);
        const disputePeriodExpired = now > disputePeriodEnd;

        if (disputePeriodExpired) {
          console.log(`📋 Market ${market.id} dispute period expired - ready for admin final resolution`);
          // Don't change status automatically - admin should handle final resolution
          // Just log that it's ready
        }
      }

    } catch (error) {
      console.error(`❌ Error updating status for market ${market.id}:`, error);
    }
  }

  /**
   * Force update a specific market status
   */
  async forceUpdateMarket(marketId: string): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: market, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (error || !market) {
        throw new Error(`Market ${marketId} not found`);
      }

      await this.updateSingleMarketStatus(market, new Date());
      console.log(`✅ Force updated market ${marketId} status`);

    } catch (error) {
      console.error(`❌ Error force updating market ${marketId}:`, error);
      throw error;
    }
  }

  /**
   * Get markets that need admin action
   */
  async getMarketsNeedingAdminAction(): Promise<{
    expiredPending: ApprovedMarket[];
    disputeExpired: ApprovedMarket[];
  }> {
    try {
      if (!supabase) {
        return { expiredPending: [], disputeExpired: [] };
      }

      const now = new Date();

      // Get disputable markets with expired dispute periods
      const { data: disputeExpired, error: disputeError } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('status', 'disputable')
        .not('dispute_period_end', 'is', null);

      if (disputeError) {
        console.error('Error fetching dispute expired markets:', disputeError);
      }

      const disputeExpiredFiltered = (disputeExpired || []).filter(market =>
        market.dispute_period_end && new Date(market.dispute_period_end) <= now
      );

      // Get active markets that should be expired
      const { data: expiredPending, error: expiredError } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('status', 'active');

      if (expiredError) {
        console.error('Error fetching expired pending markets:', expiredError);
      }

      const expiredPendingFiltered = (expiredPending || []).filter(market =>
        new Date(market.expires_at) <= now
      );

      return {
        expiredPending: expiredPendingFiltered,
        disputeExpired: disputeExpiredFiltered
      };

    } catch (error) {
      console.error('Error getting markets needing admin action:', error);
      return { expiredPending: [], disputeExpired: [] };
    }
  }
}

// Export singleton instance
export const marketStatusService = new MarketStatusService();