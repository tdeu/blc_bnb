import { supabase } from './supabase';
import { UserBettingHistory } from './userDataService';

/**
 * Bet Resolution Service
 *
 * Handles updating user bets when markets are resolved.
 * Updates bet status ('won' or 'lost') and calculates actual winnings.
 */

export class BetResolutionService {
  /**
   * Update all bets for a specific market when it gets resolved
   */
  async updateBetsForResolvedMarket(
    marketId: string,
    marketOutcome: 'yes' | 'no'
  ): Promise<number> {
    try {
      console.log(`🎯 Updating bets for resolved market ${marketId} (outcome: ${marketOutcome})`);

      let updatedCount = 0;

      // Get all wallet addresses that have bets (from localStorage keys)
      const allWallets = this.getAllWalletAddresses();
      console.log(`   Found ${allWallets.length} wallet(s) to check`);

      for (const walletAddress of allWallets) {
        const updated = this.updateBetsForWallet(walletAddress, marketId, marketOutcome);
        updatedCount += updated;
      }

      console.log(`✅ Updated ${updatedCount} bet(s) for market ${marketId}`);
      return updatedCount;

    } catch (error) {
      console.error('❌ Error updating bets for resolved market:', error);
      throw error;
    }
  }

  /**
   * Update bets for a specific wallet and market
   */
  private updateBetsForWallet(
    walletAddress: string,
    marketId: string,
    marketOutcome: 'yes' | 'no'
  ): number {
    try {
      const storageKey = `user_bets_${walletAddress.toLowerCase()}`;
      const data = localStorage.getItem(storageKey);
      if (!data) return 0;

      const bets: UserBettingHistory[] = JSON.parse(data);
      let updatedCount = 0;

      // Update bets for this market
      const updatedBets = bets.map(bet => {
        // Only update active bets for this market
        if (bet.marketId === marketId && bet.status === 'active') {
          const didWin = bet.position === marketOutcome;

          // Calculate actual winnings
          let actualWinning = 0;
          if (didWin) {
            // Winner gets their stake back plus profit
            actualWinning = bet.potentialReturn || (bet.amount * (bet.odds || 2.0));
          } else {
            // Loser gets nothing
            actualWinning = 0;
          }

          updatedCount++;
          console.log(`   📝 ${walletAddress.substring(0, 8)}... bet ${bet.id}: ${bet.position} → ${didWin ? 'WON' : 'LOST'} (${actualWinning.toFixed(3)} CAST)`);

          return {
            ...bet,
            status: didWin ? ('won' as const) : ('lost' as const),
            actualWinning,
            marketStatus: 'resolved' as const,
            marketResolution: marketOutcome
          };
        }
        return bet;
      });

      // Save updated bets back to localStorage
      if (updatedCount > 0) {
        localStorage.setItem(storageKey, JSON.stringify(updatedBets));
      }

      return updatedCount;

    } catch (error) {
      console.error(`Error updating bets for wallet ${walletAddress}:`, error);
      return 0;
    }
  }

  /**
   * Sync bets for a wallet by checking market statuses
   * This catches any bets that missed resolution updates
   */
  async syncBetsWithMarketStatus(walletAddress: string): Promise<number> {
    try {
      console.log(`🔄 Syncing bets for wallet ${walletAddress.substring(0, 8)}...`);

      const storageKey = `user_bets_${walletAddress.toLowerCase()}`;
      const data = localStorage.getItem(storageKey);
      if (!data) return 0;

      const bets: UserBettingHistory[] = JSON.parse(data);
      let updatedCount = 0;

      // Get unique market IDs with active bets
      const activeMarketIds = [...new Set(
        bets
          .filter(bet => bet.status === 'active')
          .map(bet => bet.marketId)
      )];

      if (activeMarketIds.length === 0) {
        console.log('   No active bets to sync');
        return 0;
      }

      console.log(`   Checking ${activeMarketIds.length} market(s) for resolution status...`);

      // Check each market's status in database
      if (!supabase) {
        console.warn('   Supabase not available, skipping sync');
        return 0;
      }

      for (const marketId of activeMarketIds) {
        try {
          const { data: market, error } = await supabase
            .from('approved_markets')
            .select('id, status, resolution_data')
            .eq('id', marketId)
            .single();

          if (error || !market) continue;

          // If market is resolved, update the bets
          if (market.status === 'resolved' && market.resolution_data?.outcome) {
            const outcome = market.resolution_data.outcome as 'yes' | 'no';
            const updated = this.updateBetsForWallet(walletAddress, marketId, outcome);
            updatedCount += updated;
          }
        } catch (marketError) {
          console.warn(`   Error checking market ${marketId}:`, marketError);
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ Synced ${updatedCount} bet(s) for wallet ${walletAddress.substring(0, 8)}...`);
      }

      return updatedCount;

    } catch (error) {
      console.error('Error syncing bets with market status:', error);
      return 0;
    }
  }

  /**
   * Get all wallet addresses that have stored bets
   */
  private getAllWalletAddresses(): string[] {
    const wallets: string[] = [];

    // Scan localStorage for user_bets_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_bets_')) {
        const walletAddress = key.replace('user_bets_', '');
        wallets.push(walletAddress);
      }
    }

    return wallets;
  }

  /**
   * Get P&L summary for a wallet
   */
  getPnLSummary(walletAddress: string): {
    totalPnL: number;
    totalWinnings: number;
    totalLosses: number;
    winCount: number;
    lossCount: number;
    winRate: number;
  } {
    try {
      const storageKey = `user_bets_${walletAddress.toLowerCase()}`;
      const data = localStorage.getItem(storageKey);
      if (!data) {
        return {
          totalPnL: 0,
          totalWinnings: 0,
          totalLosses: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0
        };
      }

      const bets: UserBettingHistory[] = JSON.parse(data);

      const wonBets = bets.filter(bet => bet.status === 'won');
      const lostBets = bets.filter(bet => bet.status === 'lost');

      const totalWinnings = wonBets.reduce((sum, bet) => sum + (bet.actualWinning || 0), 0);
      const totalLosses = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalPnL = totalWinnings - totalLosses;

      const resolvedCount = wonBets.length + lostBets.length;
      const winRate = resolvedCount > 0 ? (wonBets.length / resolvedCount) * 100 : 0;

      return {
        totalPnL,
        totalWinnings,
        totalLosses,
        winCount: wonBets.length,
        lossCount: lostBets.length,
        winRate
      };

    } catch (error) {
      console.error('Error calculating P&L summary:', error);
      return {
        totalPnL: 0,
        totalWinnings: 0,
        totalLosses: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0
      };
    }
  }
}

// Export singleton instance
export const betResolutionService = new BetResolutionService();
