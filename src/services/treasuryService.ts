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
}

// Export singleton instance
export const treasuryService = new TreasuryService();
