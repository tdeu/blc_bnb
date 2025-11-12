/**
 * Bet Tracking Service
 * Monitors on-chain betting activity and logs to database for analytics
 */

import { ethers } from 'ethers';
import { supabase } from '../utils/supabase';
// HEDERA_CONFIG removed - using BSC configuration

// BSC Testnet RPC
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

const PREDICTION_MARKET_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function yesBalance(address) external view returns (uint256)",
  "function noBalance(address) external view returns (uint256)"
];

interface BetEvent {
  marketId: string;
  marketContract: string;
  userAddress: string;
  betType: 'YES' | 'NO';
  sharesAmount: string;
  costAmount: string;
  transactionHash?: string;
  blockNumber?: number;
  timestamp: Date;
}

/**
 * Log a bet event to the database
 */
export async function logBetEvent(bet: BetEvent): Promise<void> {
  try {
    const { error } = await supabase
      .from('bet_events')
      .insert({
        market_id: bet.marketId,
        market_contract: bet.marketContract,
        user_address: bet.userAddress,
        bet_type: bet.betType,
        shares_amount: bet.sharesAmount,
        cost_amount: bet.costAmount,
        transaction_hash: bet.transactionHash,
        block_number: bet.blockNumber,
        timestamp: bet.timestamp.toISOString()
      });

    if (error) {
      console.error('❌ Failed to log bet event:', error);
    } else {
      console.log(`✅ Logged bet: ${bet.userAddress} bet ${bet.betType} on ${bet.marketContract}`);
    }
  } catch (error) {
    console.error('❌ Error logging bet event:', error);
  }
}

/**
 * Get unique bettor count for a market
 */
export async function getUniqueBettorCount(marketContract: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('bet_events')
      .select('user_address')
      .eq('market_contract', marketContract);

    if (error) {
      console.warn('⚠️ Failed to get bettor count:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    // Count unique wallet addresses
    const uniqueBettors = new Set(data.map(b => b.user_address.toLowerCase()));
    return uniqueBettors.size;

  } catch (error) {
    console.error('❌ Error getting bettor count:', error);
    return 0;
  }
}

/**
 * Get betting statistics for a market
 */
export async function getMarketBettingStats(marketContract: string): Promise<{
  uniqueBettors: number;
  totalBets: number;
  totalYesShares: number;
  totalNoShares: number;
  totalVolume: number;
  firstBetAt?: Date;
  lastBetAt?: Date;
} | null> {
  try {
    const { data, error } = await supabase
      .from('market_betting_stats')
      .select('*')
      .eq('market_contract', marketContract)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      uniqueBettors: data.unique_bettors || 0,
      totalBets: data.total_bets || 0,
      totalYesShares: parseFloat(data.total_yes_shares || '0'),
      totalNoShares: parseFloat(data.total_no_shares || '0'),
      totalVolume: parseFloat(data.total_volume || '0'),
      firstBetAt: data.first_bet_at ? new Date(data.first_bet_at) : undefined,
      lastBetAt: data.last_bet_at ? new Date(data.last_bet_at) : undefined
    };

  } catch (error) {
    console.error('❌ Error getting market betting stats:', error);
    return null;
  }
}

/**
 * Monitor a market for new bets (for real-time tracking)
 * This would typically run in a background service
 */
export async function startBetMonitor(
  marketId: string,
  marketContract: string
): Promise<void> {
  console.log(`📊 Starting bet monitor for market ${marketId} at ${marketContract}`);

  try {
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);

    // Note: BSC monitoring can use WebSocket or polling
    // This is a polling-based approach

    // For production, you'd want to:
    // 1. Use BSCScan API to query transactions
    // 2. Set up a cron job to periodically sync bet data
    // 3. Or use WebSocket provider for real-time events

    console.log('⚠️ Note: Bet monitoring requires BSCScan API integration');
    console.log('💡 For now, bets should be logged manually when users place them through the UI');

  } catch (error) {
    console.error('❌ Failed to start bet monitor:', error);
  }
}

/**
 * Sync historical bets from contract to database
 * This can be run once to backfill data
 */
export async function syncHistoricalBets(
  marketId: string,
  marketContract: string
): Promise<void> {
  console.log(`🔄 Syncing historical bets for ${marketContract}...`);

  try {
    // For BSC, we'd query the BSCScan API
    // This is a placeholder for the actual implementation

    console.log('⚠️ Historical sync requires BSCScan API integration');
    console.log('💡 BSCScan endpoint: https://api-testnet.bscscan.com/api');

    // Example BSCScan query (would need actual implementation):
    // GET https://api-testnet.bscscan.com/api?module=logs&action=getLogs&address=${marketContract}
    // Then parse the results to extract bet events

  } catch (error) {
    console.error('❌ Failed to sync historical bets:', error);
  }
}

export const betTrackingService = {
  logBetEvent,
  getUniqueBettorCount,
  getMarketBettingStats,
  startBetMonitor,
  syncHistoricalBets
};
