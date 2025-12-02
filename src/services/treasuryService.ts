import { ethers } from 'ethers';
import { supabase } from '../utils/supabase';
import { TOKEN_ADDRESSES } from '../config/constants';

// ABIs
const CAST_TOKEN_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)"
];

const TREASURY_ABI = [
  "function getBalance() external view returns (uint256)", // SimpleTreasury ABI
  "function withdraw(uint256 amount, address payable to) external"
];

const BUYCAST_ABI = [
  "event CastPurchased(address indexed buyer, uint256 bnbAmount, uint256 castAmount)"
];

// ABI for reading market reserves and participants
const PREDICTION_MARKET_ABI = [
  "function reserve() external view returns (uint256)",
  "function yesShares() external view returns (uint256)",
  "function noShares() external view returns (uint256)",
  "function yesBalance(address) external view returns (uint256)",
  "function noBalance(address) external view returns (uint256)"
];

export interface TreasuryStats {
  // CAST Token Distribution
  maxSupply: string; // 100M max
  totalSupply: string; // Current total minted
  initialAllocation: string; // 10M initial
  purchasedCast: string; // Minted via BuyCAST
  remainingMintable: string; // Max - Total

  // Balance Breakdown
  ownerBalance: string;
  otherHolders: string;

  // Revenue
  bnbRevenue: string; // BNB in treasury
  totalPurchases: number; // Number of purchases

  // Calculated percentages
  supplyUtilization: number; // (totalSupply / maxSupply) * 100
}

export interface CastPurchase {
  id: number;
  buyer_address: string;
  bnb_amount: number;
  cast_amount: number;
  transaction_hash: string;
  block_number: number;
  timestamp: string;
}

export interface TopHolder {
  address: string;
  balance: string;
  percentage: number;
}

class TreasuryService {
  private provider: ethers.JsonRpcProvider | null = null;
  private castContract: ethers.Contract | null = null;
  private treasuryContract: ethers.Contract | null = null;
  private buyCastContract: ethers.Contract | null = null;

  private readonly INITIAL_ALLOCATION = '10000000'; // 10M initial supply
  private readonly OWNER_ADDRESS = '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b'; // Owner address (lowercase)

  /**
   * Initialize contracts with RPC provider
   */
  async initialize(): Promise<void> {
    this.provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

    this.castContract = new ethers.Contract(
      TOKEN_ADDRESSES.CAST_TOKEN,
      CAST_TOKEN_ABI,
      this.provider
    );

    this.treasuryContract = new ethers.Contract(
      TOKEN_ADDRESSES.TREASURY_CONTRACT,
      TREASURY_ABI,
      this.provider
    );

    this.buyCastContract = new ethers.Contract(
      TOKEN_ADDRESSES.BUYCAST_CONTRACT,
      BUYCAST_ABI,
      this.provider
    );
  }

  /**
   * Get comprehensive treasury statistics
   */
  async getTreasuryStats(): Promise<TreasuryStats> {
    if (!this.castContract || !this.treasuryContract) {
      throw new Error('Treasury service not initialized');
    }

    try {
      // Get on-chain data
      const [maxSupply, totalSupply, ownerBalance] = await Promise.all([
        this.castContract.MAX_SUPPLY(),
        this.castContract.totalSupply(),
        this.castContract.balanceOf(this.OWNER_ADDRESS)
      ]);

      // Get BNB balance directly from Treasury address (more reliable)
      const bnbRevenue = await this.provider.getBalance(TOKEN_ADDRESSES.TREASURY_CONTRACT);

      // Calculate purchased CAST (total supply - initial allocation)
      const initialAllocationWei = ethers.parseEther(this.INITIAL_ALLOCATION);
      const purchasedCastWei = totalSupply - initialAllocationWei;

      // Get purchase count from database
      const { count: totalPurchases } = await supabase
        .from('cast_purchases')
        .select('*', { count: 'exact', head: true });

      // Calculate remaining mintable
      const remainingMintable = maxSupply - totalSupply;

      // Calculate supply utilization percentage
      const supplyUtilization = (Number(totalSupply) / Number(maxSupply)) * 100;

      // Calculate other holders balance
      const otherHoldersWei = totalSupply - ownerBalance;

      return {
        maxSupply: ethers.formatEther(maxSupply),
        totalSupply: ethers.formatEther(totalSupply),
        initialAllocation: this.INITIAL_ALLOCATION,
        purchasedCast: ethers.formatEther(purchasedCastWei),
        remainingMintable: ethers.formatEther(remainingMintable),
        ownerBalance: ethers.formatEther(ownerBalance),
        otherHolders: ethers.formatEther(otherHoldersWei),
        bnbRevenue: ethers.formatEther(bnbRevenue),
        totalPurchases: totalPurchases || 0,
        supplyUtilization: Number(supplyUtilization.toFixed(4))
      };
    } catch (error) {
      console.error('Error fetching treasury stats:', error);
      throw new Error('Failed to fetch treasury statistics');
    }
  }

  /**
   * Get recent CAST purchases from database
   */
  async getRecentPurchases(limit: number = 50): Promise<CastPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('cast_purchases')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent purchases:', error);
      throw new Error('Failed to fetch recent purchases');
    }
  }

  /**
   * Get purchases by a specific address
   */
  async getPurchasesByAddress(address: string, limit: number = 20): Promise<CastPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('cast_purchases')
        .select('*')
        .eq('buyer_address', address.toLowerCase())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching purchases by address:', error);
      throw new Error('Failed to fetch purchases for address');
    }
  }

  /**
   * Get top CAST holders (simplified - in production, you'd index this off-chain)
   * For now, we'll show owner and estimate others from purchases
   */
  async getTopHolders(): Promise<TopHolder[]> {
    if (!this.castContract) {
      throw new Error('Treasury service not initialized');
    }

    try {
      const [totalSupply, ownerBalance] = await Promise.all([
        this.castContract.totalSupply(),
        this.castContract.balanceOf(this.OWNER_ADDRESS)
      ]);

      const totalSupplyFormatted = ethers.formatEther(totalSupply);
      const ownerBalanceFormatted = ethers.formatEther(ownerBalance);

      const ownerPercentage = (Number(ownerBalance) / Number(totalSupply)) * 100;

      // Get unique buyers from database
      const { data: purchases, error } = await supabase
        .from('cast_purchases')
        .select('buyer_address, cast_amount')
        .order('cast_amount', { ascending: false });

      if (error) throw error;

      // Aggregate purchases by address
      const buyerBalances = new Map<string, number>();
      purchases?.forEach(purchase => {
        const addr = purchase.buyer_address.toLowerCase();
        const current = buyerBalances.get(addr) || 0;
        buyerBalances.set(addr, current + parseFloat(purchase.cast_amount));
      });

      // Convert to array and sort
      const otherHolders: TopHolder[] = Array.from(buyerBalances.entries())
        .filter(([addr]) => addr.toLowerCase() !== this.OWNER_ADDRESS.toLowerCase())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([address, balance]) => ({
          address,
          balance: balance.toFixed(4),
          percentage: (balance / Number(totalSupplyFormatted)) * 100
        }));

      // Add owner at the top
      return [
        {
          address: this.OWNER_ADDRESS,
          balance: ownerBalanceFormatted,
          percentage: ownerPercentage
        },
        ...otherHolders
      ];
    } catch (error) {
      console.error('Error fetching top holders:', error);
      throw new Error('Failed to fetch top holders');
    }
  }

  /**
   * Create a treasury snapshot
   */
  async createSnapshot(stats: TreasuryStats): Promise<void> {
    try {
      const { error } = await supabase
        .from('treasury_snapshots')
        .insert({
          total_cast_supply: stats.totalSupply,
          initial_allocation: stats.initialAllocation,
          purchased_cast: stats.purchasedCast,
          bnb_revenue: stats.bnbRevenue,
          owner_balance: stats.ownerBalance,
          snapshot_time: new Date().toISOString()
        });

      if (error) throw error;
      console.log('✅ Treasury snapshot created successfully');
    } catch (error) {
      console.error('Error creating treasury snapshot:', error);
      throw new Error('Failed to create treasury snapshot');
    }
  }

  /**
   * Get historical snapshots
   */
  async getHistoricalSnapshots(limit: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('treasury_snapshots')
        .select('*')
        .order('snapshot_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching historical snapshots:', error);
      throw new Error('Failed to fetch historical snapshots');
    }
  }

  /**
   * Get total purchase volume (BNB)
   */
  async getTotalPurchaseVolume(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('cast_purchases')
        .select('bnb_amount');

      if (error) throw error;

      const total = data?.reduce((sum, purchase) => sum + parseFloat(purchase.bnb_amount), 0) || 0;
      return total.toFixed(6);
    } catch (error) {
      console.error('Error calculating total purchase volume:', error);
      return '0';
    }
  }

  /**
   * Get count of unique active bettors (users with positions in open markets)
   */
  async getActiveBettorsCount(): Promise<number> {
    try {
      // Query market_predictions table (where bets are actually stored)
      const { data: allBets, error } = await supabase
        .from('market_predictions')
        .select('user_address');

      if (error) {
        console.warn('Error fetching bets for active bettors count:', error);
        return 0;
      }

      if (!allBets || allBets.length === 0) {
        return 0;
      }

      const uniqueAddresses = new Set(
        allBets
          .filter(b => b.user_address)
          .map(b => b.user_address.toLowerCase())
      );
      return uniqueAddresses.size;
    } catch (error) {
      console.error('Error fetching active bettors count:', error);
      return 0;
    }
  }

  /**
   * Get 24h change statistics for key metrics
   * Calculates changes based on bets and purchases from the last 24 hours
   * Returns both percentage change AND absolute values for better context
   */
  async get24hChangeStats(): Promise<{
    tvlChange: number;
    tvlAdded24h: number;  // Absolute CAST added in last 24h
    revenueChange: number;
    revenueAdded24h: number;  // Absolute BNB revenue in last 24h
    transactionChange: number;
    txCount24h: number;  // Absolute transaction count in last 24h
  }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // Get bets from last 24h and previous 24h to calculate TVL change
      // Note: Bets are stored in market_predictions table
      const [{ data: recentBets }, { data: previousBets }] = await Promise.all([
        supabase
          .from('market_predictions')
          .select('amount, created_at')
          .gte('created_at', twentyFourHoursAgo.toISOString()),
        supabase
          .from('market_predictions')
          .select('amount, created_at')
          .gte('created_at', fortyEightHoursAgo.toISOString())
          .lt('created_at', twentyFourHoursAgo.toISOString())
      ]);

      // Calculate TVL added in last 24h vs previous 24h
      const recentTvlAdded = recentBets?.reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;
      const previousTvlAdded = previousBets?.reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;

      // Calculate percentage change (avoid division by zero)
      let tvlChange = 0;
      if (previousTvlAdded > 0) {
        tvlChange = ((recentTvlAdded - previousTvlAdded) / previousTvlAdded) * 100;
      }
      // Don't show misleading 100% when going from 0 to something

      // Get purchases from last 24h and previous 24h for revenue change
      const [{ data: recentPurchases }, { data: previousPurchases }] = await Promise.all([
        supabase
          .from('cast_purchases')
          .select('bnb_amount, timestamp')
          .gte('timestamp', twentyFourHoursAgo.toISOString()),
        supabase
          .from('cast_purchases')
          .select('bnb_amount, timestamp')
          .gte('timestamp', fortyEightHoursAgo.toISOString())
          .lt('timestamp', twentyFourHoursAgo.toISOString())
      ]);

      const recentRevenue = recentPurchases?.reduce((sum, p) => sum + parseFloat(p.bnb_amount || '0'), 0) || 0;
      const previousRevenue = previousPurchases?.reduce((sum, p) => sum + parseFloat(p.bnb_amount || '0'), 0) || 0;

      let revenueChange = 0;
      if (previousRevenue > 0) {
        revenueChange = ((recentRevenue - previousRevenue) / previousRevenue) * 100;
      }

      // Transaction count change
      const recentTxCount = (recentBets?.length || 0) + (recentPurchases?.length || 0);
      const previousTxCount = (previousBets?.length || 0) + (previousPurchases?.length || 0);

      let transactionChange = 0;
      if (previousTxCount > 0) {
        transactionChange = ((recentTxCount - previousTxCount) / previousTxCount) * 100;
      }

      return {
        tvlChange: Math.round(tvlChange * 10) / 10,
        tvlAdded24h: Math.round(recentTvlAdded * 100) / 100,
        revenueChange: Math.round(revenueChange * 10) / 10,
        revenueAdded24h: Math.round(recentRevenue * 1000000) / 1000000,
        transactionChange: Math.round(transactionChange * 10) / 10,
        txCount24h: recentTxCount
      };
    } catch (error) {
      console.error('Error calculating 24h change stats:', error);
      return { tvlChange: 0, tvlAdded24h: 0, revenueChange: 0, revenueAdded24h: 0, transactionChange: 0, txCount24h: 0 };
    }
  }

  /**
   * Get today's transaction count
   */
  async getTodayTransactionCount(): Promise<number> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('cast_purchases')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', todayStart.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching today transaction count:', error);
      return 0;
    }
  }

  /**
   * Get total CAST locked in all active/unresolved market contracts (TRUE TVL)
   * This is the real liquidity at stake in prediction markets
   * OPTIMIZED: Uses parallel RPC calls with timeout for much faster loading
   */
  async getTotalLockedInMarkets(): Promise<{ totalLocked: string; marketCount: number; marketDetails: Array<{id: string, claim: string, reserve: string}> }> {
    if (!this.provider) {
      await this.initialize();
    }

    try {
      // Get all approved markets with contract addresses that are not yet resolved
      const { data: markets, error } = await supabase
        .from('approved_markets')
        .select('id, claim, contract_address, status')
        .not('contract_address', 'is', null)
        .not('status', 'eq', 'resolved');

      if (error) {
        console.warn('Error fetching markets for TVL:', error);
        return { totalLocked: '0', marketCount: 0, marketDetails: [] };
      }

      if (!markets || markets.length === 0) {
        return { totalLocked: '0', marketCount: 0, marketDetails: [] };
      }

      // Helper function to add timeout to a promise
      const withTimeout = <T>(promise: Promise<T>, ms: number, marketId: string): Promise<T | null> => {
        return Promise.race([
          promise,
          new Promise<null>((resolve) => {
            setTimeout(() => {
              console.warn(`Timeout reading reserve for market ${marketId} after ${ms}ms`);
              resolve(null);
            }, ms);
          })
        ]);
      };

      // Query ALL market contracts in PARALLEL (much faster than sequential)
      const reservePromises = markets
        .filter(market => market.contract_address)
        .map(async (market) => {
          try {
            const marketContract = new ethers.Contract(
              market.contract_address!,
              PREDICTION_MARKET_ABI,
              this.provider!
            );

            // 10 second timeout per contract call
            const reserve = await withTimeout(
              marketContract.reserve(),
              10000,
              market.id
            );

            if (reserve === null) {
              return null; // Timed out
            }

            return {
              id: market.id,
              claim: market.claim?.substring(0, 50) + '...' || 'Unknown',
              reserve: reserve as bigint
            };
          } catch (contractError) {
            console.warn(`Could not read reserve for market ${market.id}:`, contractError);
            return null;
          }
        });

      // Wait for all calls to complete (with their individual timeouts)
      const results = await Promise.all(reservePromises);

      // Filter out failed/timed out calls and aggregate
      let totalLocked = BigInt(0);
      const marketDetails: Array<{id: string, claim: string, reserve: string}> = [];

      for (const result of results) {
        if (result !== null) {
          totalLocked += result.reserve;
          marketDetails.push({
            id: result.id,
            claim: result.claim,
            reserve: ethers.formatEther(result.reserve)
          });
        }
      }

      console.log(`✅ Loaded TVL from ${marketDetails.length}/${markets.length} markets in parallel`);

      return {
        totalLocked: ethers.formatEther(totalLocked),
        marketCount: marketDetails.length,
        marketDetails
      };
    } catch (error) {
      console.error('Error calculating total locked in markets:', error);
      return { totalLocked: '0', marketCount: 0, marketDetails: [] };
    }
  }

  /**
   * Get unique bettors by querying smart contracts for users with positions
   * This queries approved_markets and checks each contract for users with balances
   */
  async getUniqueBettorsFromContracts(): Promise<{ count: number; addresses: string[] }> {
    if (!this.provider) {
      await this.initialize();
    }

    try {
      // Get all approved markets with contract addresses
      const { data: markets, error } = await supabase
        .from('approved_markets')
        .select('id, contract_address')
        .not('contract_address', 'is', null);

      if (error || !markets || markets.length === 0) {
        console.warn('No markets found for bettor count');
        return { count: 0, addresses: [] };
      }

      // Get all known buyer addresses from cast_purchases (these are potential bettors)
      const { data: purchases } = await supabase
        .from('cast_purchases')
        .select('buyer_address');

      const potentialBettors = new Set<string>();
      purchases?.forEach(p => {
        if (p.buyer_address) {
          potentialBettors.add(p.buyer_address.toLowerCase());
        }
      });

      // Also add the owner address as a potential bettor
      potentialBettors.add(this.OWNER_ADDRESS.toLowerCase());

      const uniqueBettors = new Set<string>();

      // Check each market contract for users with positions
      for (const market of markets) {
        if (!market.contract_address) continue;

        try {
          const marketContract = new ethers.Contract(
            market.contract_address,
            PREDICTION_MARKET_ABI,
            this.provider!
          );

          // Check each potential bettor's balance in this market
          for (const address of potentialBettors) {
            try {
              const [yesBalance, noBalance] = await Promise.all([
                marketContract.yesBalance(address),
                marketContract.noBalance(address)
              ]);

              if (yesBalance > 0n || noBalance > 0n) {
                uniqueBettors.add(address);
              }
            } catch {
              // Skip if can't read balance for this address
            }
          }
        } catch {
          // Skip markets with invalid contracts
        }
      }

      return {
        count: uniqueBettors.size,
        addresses: Array.from(uniqueBettors)
      };
    } catch (error) {
      console.error('Error getting unique bettors from contracts:', error);
      return { count: 0, addresses: [] };
    }
  }

  /**
   * Get transaction count for the last 24 hours (rolling window)
   */
  async getLast24hTransactionCount(): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Count both token purchases AND bets placed in last 24h
      const [{ count: purchaseCount }, { count: betCount }] = await Promise.all([
        supabase
          .from('cast_purchases')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', twentyFourHoursAgo.toISOString()),
        supabase
          .from('market_predictions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo.toISOString())
      ]);

      return (purchaseCount || 0) + (betCount || 0);
    } catch (error) {
      console.error('Error fetching 24h transaction count:', error);
      return 0;
    }
  }

  /**
   * Get total transaction count (all time)
   */
  async getTotalTransactionCount(): Promise<number> {
    try {
      // Count both token purchases AND bets
      const [{ count: purchaseCount }, { count: betCount }] = await Promise.all([
        supabase
          .from('cast_purchases')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('market_predictions')
          .select('*', { count: 'exact', head: true })
      ]);

      return (purchaseCount || 0) + (betCount || 0);
    } catch (error) {
      console.error('Error fetching total transaction count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const treasuryService = new TreasuryService();
