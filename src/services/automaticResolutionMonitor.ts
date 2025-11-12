import { supabase } from '../utils/supabase';
import { resolutionService } from '../utils/resolutionService';
import { DISPUTE_PERIOD } from '../config/constants';
import { getCurrentUnixTimestamp, unixTimestampToDate } from '../utils/timeUtils';

/**
 * Automatic Resolution Monitor
 *
 * Handles the automated lifecycle of markets:
 * 1. Detects expired markets (endTime passed)
 * 2. Calls AI to get resolution outcome
 * 3. Calls preliminaryResolveMarket() to start dispute period
 * 4. Monitors dispute periods
 * 5. Calls finalResolveMarket() when dispute period ends (if no disputes)
 */

export class AutomaticResolutionMonitor {
  private isRunning: boolean = false;
  private preliminaryCheckInterval: NodeJS.Timeout | null = null;
  private finalCheckInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly PRELIMINARY_CHECK_INTERVAL_MS = 15 * 1000; // 15 seconds
  private readonly FINAL_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Start the automatic resolution monitor
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️  AutomaticResolutionMonitor is already running');
      return;
    }

    console.log('🚀 Starting AutomaticResolutionMonitor...');
    console.log(`   - Preliminary checks every ${this.PRELIMINARY_CHECK_INTERVAL_MS / 60000} minutes`);
    console.log(`   - Final checks every ${this.FINAL_CHECK_INTERVAL_MS / 60000} minutes`);

    this.isRunning = true;

    // Run immediately on start
    this.checkExpiredMarkets();
    this.checkDisputePeriodsEnded();

    // Then run on intervals
    this.preliminaryCheckInterval = setInterval(
      () => this.checkExpiredMarkets(),
      this.PRELIMINARY_CHECK_INTERVAL_MS
    );

    this.finalCheckInterval = setInterval(
      () => this.checkDisputePeriodsEnded(),
      this.FINAL_CHECK_INTERVAL_MS
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

    if (this.preliminaryCheckInterval) {
      clearInterval(this.preliminaryCheckInterval);
      this.preliminaryCheckInterval = null;
    }

    if (this.finalCheckInterval) {
      clearInterval(this.finalCheckInterval);
      this.finalCheckInterval = null;
    }

    this.isRunning = false;
    console.log('✅ AutomaticResolutionMonitor stopped');
  }

  /**
   * Check for markets that have expired but haven't been preliminarily resolved
   */
  private async checkExpiredMarkets(): Promise<void> {
    try {
      console.log('\n🔍 [Preliminary] Checking for expired markets...');

      // Try database first, but fallback to blockchain-based detection
      let expiredMarkets: any[] = [];

      // Method 1: Try database-based detection
      if (supabase) {
        try {
          const now = new Date();
          const nowISO = now.toISOString();
          
          // First try to find markets with status 'expired'
          let { data: dbMarkets, error } = await supabase
            .from('approved_markets')
            .select('id, claim, expires_at, contract_address, category, resolution_data, status')
            .eq('status', 'expired')
            .is('resolution_data', null)
            .not('contract_address', 'is', null)
            .order('expires_at', { ascending: true })
            .limit(10);
          
          // If no expired markets found, try to find active markets that are past expiry
          if (!error && (!dbMarkets || dbMarkets.length === 0)) {
            const { data: activeMarkets, error: activeError } = await supabase
              .from('approved_markets')
              .select('id, claim, expires_at, contract_address, category, resolution_data, status')
              .eq('status', 'active')
              .is('resolution_data', null)
              .not('contract_address', 'is', null)
              .order('expires_at', { ascending: true })
              .limit(10);
            
            if (!activeError && activeMarkets) {
              // Filter active markets that are actually expired
              dbMarkets = activeMarkets.filter(market => {
                const expiresAt = new Date(market.expires_at);
                return expiresAt <= now;
              });
            }
          }

          if (!error && dbMarkets) {
            expiredMarkets = dbMarkets;
            console.log(`📊 Database method: Found ${expiredMarkets.length} expired market(s)`);
          } else {
            console.warn('⚠️  Database query failed, trying blockchain method:', error?.message);
          }
        } catch (dbError) {
          console.warn('⚠️  Database connection failed, trying blockchain method:', dbError);
        }
      } else {
        console.log('📊 Supabase not available, using blockchain method');
      }

      // Method 2: Blockchain-based detection (fallback)
      if (expiredMarkets.length === 0) {
        console.log('🔗 Using blockchain-based market detection...');
        expiredMarkets = await this.findExpiredMarketsFromBlockchain();
        console.log(`📊 Blockchain method: Found ${expiredMarkets.length} expired market(s)`);
      }

      if (expiredMarkets.length === 0) {
        console.log('✅ No expired markets found needing preliminary resolution');
        return;
      }

      console.log(`📋 Processing ${expiredMarkets.length} expired market(s) needing resolution`);

      for (const market of expiredMarkets) {
        try {
          console.log(`\n🤖 Processing market: ${market.id || market.contractAddress}`);
          console.log(`   Claim: ${market.claim ? market.claim.substring(0, 60) + '...' : 'Unknown'}`);
          console.log(`   Contract: ${market.contract_address || market.contractAddress}`);

          // Get bet majority resolution outcome
          console.log(`   Analyzing bet majority to determine outcome...`);
          const betOutcome = await this.getBetMajorityResolution(market);

          console.log(`   Bet majority outcome: ${betOutcome.toUpperCase()}`);

          // Call preliminary resolution
          console.log(`   Calling preliminaryResolveMarket()...`);
          const result = await resolutionService.preliminaryResolveMarket(market.id || market.contractAddress, betOutcome);

          console.log(`   ✅ Preliminary resolution successful!`);
          console.log(`      TX: ${result.transactionId}`);
          console.log(`      Market is now disputable for 7 days`);

        } catch (marketError) {
          console.error(`   ❌ Failed to resolve market ${market.id || market.contractAddress}:`, marketError);
          // Continue with next market
        }
      }

    } catch (error) {
      console.error('❌ Error in checkExpiredMarkets:', error);
    }
  }

  /**
   * Check for markets where dispute period has ended
   */
  private async checkDisputePeriodsEnded(): Promise<void> {
    try {
      console.log('\n🔍 [Final] Checking for markets with ended dispute periods...');

      if (!supabase) {
        console.warn('⚠️  Supabase not available, skipping check');
        return;
      }

      const now = new Date();

      // Find markets where:
      // - status is 'disputable'
      // - dispute_period_end has passed
      // - contract_address exists
      const { data: disputeEndedMarkets, error } = await supabase
        .from('approved_markets')
        .select('id, claim, dispute_period_end, contract_address, resolution_data')
        .eq('status', 'disputable')
        .lt('dispute_period_end', now.toISOString())
        .not('contract_address', 'is', null)
        .order('dispute_period_end', { ascending: true })
        .limit(10); // Process max 10 at a time

      if (error) {
        console.error('❌ Error fetching markets with ended dispute periods:', error);
        return;
      }

      if (!disputeEndedMarkets || disputeEndedMarkets.length === 0) {
        console.log('✅ No markets found with ended dispute periods');
        return;
      }

      console.log(`📋 Found ${disputeEndedMarkets.length} market(s) with ended dispute periods`);

      for (const market of disputeEndedMarkets) {
        try {
          console.log(`\n🏁 Processing market: ${market.id}`);
          console.log(`   Claim: ${market.claim.substring(0, 60)}...`);
          console.log(`   Dispute period ended: ${new Date(market.dispute_period_end).toLocaleString()}`);

          // Check if there are active disputes for this market
          const hasActiveDisputes = await this.checkForActiveDisputes(market.contract_address);

          if (hasActiveDisputes) {
            console.log(`   ⚠️  Market has active disputes - flagging for admin review`);
            await this.flagForAdminReview(market.id, 'Has active disputes after dispute period ended');
            continue;
          }

          // Get preliminary outcome from resolution_data
          const preliminaryOutcome = market.resolution_data?.preliminary_outcome || market.resolution_data?.outcome;

          if (!preliminaryOutcome) {
            console.warn(`   ⚠️  No preliminary outcome found - skipping`);
            continue;
          }

          console.log(`   No disputes found - proceeding with final resolution`);
          console.log(`   Outcome: ${preliminaryOutcome.toUpperCase()}`);

          // Use AI confidence or default to 85%
          const confidence = 85; // TODO: Get actual AI confidence from resolution_data

          // Call final resolution
          console.log(`   Calling finalResolveMarket()...`);
          const result = await resolutionService.finalResolveMarket(market.id, preliminaryOutcome as 'yes' | 'no', confidence);

          console.log(`   ✅ Final resolution successful!`);
          console.log(`      TX: ${result.transactionId}`);
          console.log(`      Market is now resolved - payouts available`);

        } catch (marketError) {
          console.error(`   ❌ Failed to finalize market ${market.id}:`, marketError);
          // Continue with next market
        }
      }

    } catch (error) {
      console.error('❌ Error in checkDisputePeriodsEnded:', error);
    }
  }

  /**
   * Find expired markets directly from blockchain (fallback when database is unavailable)
   */
  private async findExpiredMarketsFromBlockchain(): Promise<any[]> {
    try {
      console.log('🔗 Scanning blockchain for expired markets...');
      
      // For now, return empty array since the manual trigger in MarketPage works
      // The automatic system will rely on database queries, and manual triggers
      // will handle edge cases when users try to submit evidence
      console.log('   ℹ️  Using database + manual trigger approach for market detection');
      return [];
      
    } catch (error) {
      console.error('❌ Error in blockchain market detection:', error);
      return [];
    }
  }

  /**
   * Get preliminary resolution outcome based on majority of user bets
   */
  private async getBetMajorityResolution(market: any): Promise<'yes' | 'no'> {
    try {
      console.log(`   📊 Analyzing bet majority for market: ${market.id}`);

      // Get bet history from blockchain (Hedera service removed - using BSC)
      // TODO: Implement BSC bet history fetching
      const marketAddress = market.contract_address || market.contractAddress;
      console.log('⚠️ Bet history fetching not implemented for BSC yet');
      const bets: any[] = []; // Empty for now
      
      if (!bets || bets.length === 0) {
        console.log(`   ⚠️  No bets found for market ${market.id} - defaulting to 'no'`);
        return 'no';
      }
      
      // Count YES vs NO bets
      const yesBets = bets.filter(bet => bet.position === 'yes').length;
      const noBets = bets.filter(bet => bet.position === 'no').length;
      
      console.log(`   📈 Bet analysis: ${yesBets} YES bets, ${noBets} NO bets`);
      
      // Use majority outcome, default to 'no' if tie
      const majorityOutcome = yesBets > noBets ? 'yes' : 'no';
      
      console.log(`   🎯 Majority outcome: ${majorityOutcome.toUpperCase()}`);
      
      return majorityOutcome;

    } catch (error) {
      console.warn('⚠️  Bet analysis failed, using fallback logic:', error);

      // Fallback: Default to 'no' for safety (less likely to distribute funds incorrectly)
      console.log(`   🔄 Fallback: Using 'no' as default outcome`);
      return 'no';
    }
  }

  /**
   * Check if a market has active disputes
   */
  private async checkForActiveDisputes(marketAddress: string): Promise<boolean> {
    try {
      const { disputeManagerService } = await import('../utils/disputeManagerService');

      // Initialize with a dummy wallet connection (will use provider only for reading)
      await disputeManagerService.initialize({ isConnected: true, signer: null });

      return await disputeManagerService.hasActiveDisputes(marketAddress);

    } catch (error) {
      console.error('❌ Error checking for active disputes:', error);
      // Err on the side of caution - assume there might be disputes
      return true;
    }
  }

  /**
   * Flag a market for manual admin review
   */
  private async flagForAdminReview(marketId: string, reason: string): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from('approved_markets')
        .update({
          resolution_data: {
            requires_manual_review: true,
            review_reason: reason,
            flagged_at: new Date().toISOString()
          }
        })
        .eq('id', marketId);

      console.log(`   🚩 Market ${marketId} flagged for admin review: ${reason}`);

    } catch (error) {
      console.error(`   ❌ Failed to flag market for review:`, error);
    }
  }

  /**
   * Call preliminaryResolve directly on blockchain (bypass database)
   */
  private async callPreliminaryResolveDirectly(marketAddress: string, outcome: 'yes' | 'no'): Promise<{ transactionId: string }> {
    try {
      console.log(`   🔐 Calling preliminaryResolve(${outcome}) directly on blockchain...`);
      
      // Import admin signer
      const { getAdminSigner } = await import('../utils/adminSigner');
      const adminSigner = await getAdminSigner();
      
      // Import ethers
      const ethers = await import('ethers');
      const PREDICTION_MARKET_ABI = [
        "function preliminaryResolve(uint8 outcome) external",
        "event PreliminaryResolution(uint8 outcome, uint256 timestamp)"
      ];
      
      const marketContract = new ethers.Contract(marketAddress, PREDICTION_MARKET_ABI, adminSigner);
      
      // Convert outcome to contract format (0=Unset, 1=Yes, 2=No)
      const contractOutcome = outcome === 'yes' ? 1 : 2;
      
      // Call preliminaryResolve on blockchain
      const tx = await marketContract.preliminaryResolve(contractOutcome);
      
      console.log(`   ⏳ Waiting for transaction confirmation... TX: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      return { transactionId: receipt.hash };
      
    } catch (error) {
      console.error(`   ❌ Error calling preliminaryResolve:`, error);
      throw error;
    }
  }

  /**
   * Resolve a specific market immediately (called when user tries to submit evidence)
   */
  async resolveSpecificMarket(marketAddress: string): Promise<void> {
    try {
      console.log(`🚀 Resolving specific market: ${marketAddress}`);
      
      // Create a mock market object for the resolution logic
      const market = {
        id: marketAddress,
        contractAddress: marketAddress,
        contract_address: marketAddress,
        claim: 'Unknown market'
      };

      // Get bet majority resolution outcome
      console.log(`   📊 Analyzing bet majority for market: ${marketAddress}`);
      const betOutcome = await this.getBetMajorityResolution(market);

      console.log(`   🎯 Bet majority outcome: ${betOutcome.toUpperCase()}`);

      // Call preliminary resolution directly on blockchain (bypass database)
      console.log(`   🔐 Calling preliminaryResolve() directly on blockchain...`);
      const result = await this.callPreliminaryResolveDirectly(marketAddress, betOutcome);

      console.log(`   ✅ Preliminary resolution successful!`);
      console.log(`      TX: ${result.transactionId}`);
      console.log(`      Market is now disputable for 7 days`);

    } catch (error) {
      console.error(`❌ Failed to resolve market ${marketAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): { running: boolean; nextPreliminaryCheck: Date | null; nextFinalCheck: Date | null } {
    return {
      running: this.isRunning,
      nextPreliminaryCheck: this.isRunning ? new Date(Date.now() + this.PRELIMINARY_CHECK_INTERVAL_MS) : null,
      nextFinalCheck: this.isRunning ? new Date(Date.now() + this.FINAL_CHECK_INTERVAL_MS) : null
    };
  }
}

// Export singleton instance
export const automaticResolutionMonitor = new AutomaticResolutionMonitor();

// Note: Monitor is now started manually in App.tsx to ensure proper initialization order
