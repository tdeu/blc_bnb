import { supabase, ApprovedMarket } from './supabase';
import { ContractService, MarketInfo, UserPosition } from './contractService';
import { UserBet } from '../components/betting/BettingPortfolio';
import { BettingMarket } from '../components/betting/BettingMarkets';

export interface UserCreatedMarket {
  id: string;
  claim: string;
  description: string;
  category: string;
  country: string;
  region: string;
  marketType: string;
  confidenceLevel: string;
  expiresAt: Date;
  status: 'active' | 'resolving' | 'resolved';
  resolution?: 'yes' | 'no' | null;
  createdAt: Date;
  approvedAt?: Date;
  resolvedAt?: Date;
  approvedBy?: string;
  resolvedBy?: string;
  contractAddress?: string;
  volume?: number;
  participants?: number;
}

export interface UserBettingHistory {
  id: string;
  marketId: string;
  marketClaim: string;
  position: 'yes' | 'no';
  amount: number;
  shares: string;
  transactionHash: string;
  placedAt: Date;
  status: 'active' | 'won' | 'lost' | 'pending';
  marketStatus: 'active' | 'resolved';
  marketResolution?: 'yes' | 'no' | null;
  currentValue?: number;
  potentialReturn?: number;
  actualWinning?: number;
  walletAddress?: string; // Track which wallet placed this bet
  odds?: number; // Store the odds at the time of placing the bet
  marketContractAddress?: string; // Contract address for claiming winnings
}

class UserDataService {
  private contractService?: ContractService;

  constructor() {
    try {
      const config = null;
      this.contractService = new ContractService(config);
    } catch (error) {
      console.warn('Contract service not available:', error);
    }
  }

  /**
   * Get markets created by a specific user from Supabase
   */
  async getUserCreatedMarkets(walletAddress: string): Promise<UserCreatedMarket[]> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not configured');
        return [];
      }

      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('submitter_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user created markets:', error);
        return [];
      }

      if (!data) return [];

      return data.map(this.convertToUserCreatedMarket);
    } catch (error) {
      console.error('Error in getUserCreatedMarkets:', error);
      return [];
    }
  }

  /**
   * Get user's betting history from blockchain data
   * This would typically involve:
   * 1. Querying Hedera mirror node for user transactions
   * 2. Filtering for betting-related transactions
   * 3. Getting current market status for each bet
   */
  async getUserBettingHistory(walletAddress: string): Promise<UserBettingHistory[]> {
    try {
      // For now, we'll simulate this with localStorage data
      // In production, this would query the Hedera mirror node API
      const localBets = this.getLocalBettingHistory(walletAddress);
      
      // If we have contract service, enrich with current market data
      if (this.contractService && localBets.length > 0) {
        return await this.enrichBettingHistory(localBets);
      }

      return localBets;
    } catch (error) {
      console.error('Error in getUserBettingHistory:', error);
      return [];
    }
  }

  /**
   * Get user's current positions (active bets) with current market status
   */
  async getUserCurrentPositions(walletAddress: string): Promise<UserBettingHistory[]> {
    try {
      const allBets = await this.getUserBettingHistory(walletAddress);
      return allBets.filter(bet => bet.status === 'active');
    } catch (error) {
      console.error('Error in getUserCurrentPositions:', error);
      return [];
    }
  }

  /**
   * Get user's resolved betting history (won/lost bets)
   */
  async getUserResolvedBets(walletAddress: string): Promise<UserBettingHistory[]> {
    try {
      const allBets = await this.getUserBettingHistory(walletAddress);
      return allBets.filter(bet => bet.status === 'won' || bet.status === 'lost');
    } catch (error) {
      console.error('Error in getUserResolvedBets:', error);
      return [];
    }
  }

  /**
   * Get all bets for a specific market (from all users)
   */
  getMarketBets(marketId: string): UserBettingHistory[] {
    try {
      const marketBetsKey = `market_bets_${marketId}`;
      const data = localStorage.getItem(marketBetsKey);
      if (!data) return [];

      const bets = JSON.parse(data);
      return bets.map((bet: any) => ({
        ...bet,
        placedAt: new Date(bet.placedAt)
      })).sort((a: UserBettingHistory, b: UserBettingHistory) =>
        b.placedAt.getTime() - a.placedAt.getTime() // Most recent first
      );
    } catch (error) {
      console.error('Error reading market bets:', error);
      return [];
    }
  }

  /**
   * Record a new bet in local storage (called when user places a bet)
   */
  recordBet(
    walletAddress: string,
    marketId: string,
    marketClaim: string,
    position: 'yes' | 'no',
    amount: number,
    shares: string,
    transactionHash: string,
    odds?: number,
    potentialReturn?: number,
    marketContractAddress?: string
  ): void {
    try {
      const bet: UserBettingHistory = {
        id: `${marketId}-${Date.now()}`,
        marketId,
        marketClaim,
        position,
        amount,
        shares,
        transactionHash,
        placedAt: new Date(),
        status: 'active',
        marketStatus: 'active',
        potentialReturn: potentialReturn || amount * 2.0, // Default to 2x if not provided
        currentValue: potentialReturn || amount * 2.0, // Set current value to potential return for active bets
        walletAddress: walletAddress.toLowerCase(),
        odds: odds,
        marketContractAddress: marketContractAddress // Store contract address for claiming
      };

      const storageKey = `user_bets_${walletAddress.toLowerCase()}`;
      const existingBets = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingBets.push(bet);
      localStorage.setItem(storageKey, JSON.stringify(existingBets));

      // Also store in a global market-specific key for market activity timeline
      const marketBetsKey = `market_bets_${marketId}`;
      const existingMarketBets = JSON.parse(localStorage.getItem(marketBetsKey) || '[]');
      existingMarketBets.push(bet);
      localStorage.setItem(marketBetsKey, JSON.stringify(existingMarketBets));

      console.log('✅ Bet recorded locally:', bet);
    } catch (error) {
      console.error('Error recording bet:', error);
    }
  }

  /**
   * Record when user creates a market (called from market creation flow)
   */
  recordMarketCreation(
    walletAddress: string,
    marketId: string,
    claim: string,
    transactionHash: string,
    fullMarketData?: any
  ): void {
    console.log('🚨 RECORD MARKET CREATION CALLED!', {
      walletAddress,
      marketId,
      claim,
      transactionHash,
      fullMarketData,
      imageUrl: fullMarketData?.imageUrl
    });
    try {
      const creation = {
        id: marketId,
        claim,
        createdAt: new Date(),
        transactionHash,
        submitterAddress: walletAddress.toLowerCase(),
        imageUrl: fullMarketData?.imageUrl // Add this line
      };

      const storageKey = `user_created_markets_${walletAddress.toLowerCase()}`;
      const existingMarkets = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingMarkets.push(creation);
      localStorage.setItem(storageKey, JSON.stringify(existingMarkets));

      console.log('🔍 DEBUG: Recording market with imageUrl:', creation.imageUrl);
      console.log('✅ Market creation recorded locally:', creation);
    } catch (error) {
      console.error('Error recording market creation:', error);
    }
  }

  /**
   * Get user statistics for profile display
   */
  async getUserStats(walletAddress: string): Promise<{
    marketsCreated: number;
    totalBetsPlaced: number;
    correctPredictions: number;
    totalWinnings: number;
    reputationScore: number;
  }> {
    try {
      const [createdMarkets, bettingHistory] = await Promise.all([
        this.getUserCreatedMarkets(walletAddress),
        this.getUserBettingHistory(walletAddress)
      ]);

      const resolvedBets = bettingHistory.filter(bet => bet.status === 'won' || bet.status === 'lost');
      const wonBets = bettingHistory.filter(bet => bet.status === 'won');
      const totalWinnings = wonBets.reduce((sum, bet) => sum + (bet.actualWinning || 0), 0);

      // Calculate reputation score based on accuracy and activity
      const accuracy = resolvedBets.length > 0 ? wonBets.length / resolvedBets.length : 0;
      const activityScore = Math.min(100, (createdMarkets.length * 10) + (bettingHistory.length * 2));
      const reputationScore = Math.round((accuracy * 50) + (activityScore * 0.5));

      return {
        marketsCreated: createdMarkets.length,
        totalBetsPlaced: bettingHistory.length,
        correctPredictions: wonBets.length,
        totalWinnings,
        reputationScore
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        marketsCreated: 0,
        totalBetsPlaced: 0,
        correctPredictions: 0,
        totalWinnings: 0,
        reputationScore: 0
      };
    }
  }

  /**
   * Convert UserBettingHistory to UserBet format for BettingPortfolio component
   */
  convertToUserBets(bettingHistory: UserBettingHistory[]): UserBet[] {
    return bettingHistory.map(bet => ({
      id: bet.id,
      marketId: bet.marketId,
      marketClaim: bet.marketClaim,
      position: bet.position,
      amount: bet.amount,
      odds: bet.potentialReturn ? bet.potentialReturn / bet.amount : 2.0,
      potentialWinning: bet.potentialReturn || bet.amount * 2.0, // Use stored value or fallback
      potentialReturn: bet.potentialReturn || bet.amount * 2.0,  // Use stored value or fallback
      placedAt: bet.placedAt,
      status: bet.status,
      resolvedAt: bet.status !== 'active' ? bet.placedAt : undefined, // Simplified
      actualWinning: bet.actualWinning,
      blockchainTxId: bet.transactionHash
    }));
  }

  /**
   * Private helper: Get betting history from localStorage
   */
  private getLocalBettingHistory(walletAddress: string): UserBettingHistory[] {
    try {
      const storageKey = `user_bets_${walletAddress.toLowerCase()}`;
      const data = localStorage.getItem(storageKey);
      if (!data) return [];

      const bets = JSON.parse(data);
      return bets.map((bet: any) => ({
        ...bet,
        placedAt: new Date(bet.placedAt)
      }));
    } catch (error) {
      console.error('Error reading local betting history:', error);
      return [];
    }
  }

  /**
   * Private helper: Enrich betting history with current market data from blockchain
   */
  private async enrichBettingHistory(bets: UserBettingHistory[]): Promise<UserBettingHistory[]> {
    if (!this.contractService) return bets;

    const enrichedBets = [];
    for (const bet of bets) {
      try {
        // In a real implementation, you would:
        // 1. Get market contract address from bet.marketId
        // 2. Query current market status from blockchain
        // 3. Calculate current value of user's position
        // 4. Update bet status based on market resolution
        
        // For now, we'll just return the bet as-is
        enrichedBets.push(bet);
      } catch (error) {
        console.error(`Error enriching bet ${bet.id}:`, error);
        enrichedBets.push(bet);
      }
    }

    return enrichedBets;
  }

  /**
   * Private helper: Convert ApprovedMarket to UserCreatedMarket
   */
  private convertToUserCreatedMarket(approvedMarket: ApprovedMarket): UserCreatedMarket {
    return {
      id: approvedMarket.id,
      claim: approvedMarket.claim,
      description: approvedMarket.description,
      category: approvedMarket.category,
      country: approvedMarket.country,
      region: approvedMarket.region,
      marketType: approvedMarket.market_type,
      confidenceLevel: approvedMarket.confidence_level,
      expiresAt: new Date(approvedMarket.expires_at),
      status: (approvedMarket.status as any) || 'active',
      resolution: approvedMarket.resolution as 'yes' | 'no' | null,
      createdAt: new Date(approvedMarket.created_at),
      approvedAt: approvedMarket.approved_at ? new Date(approvedMarket.approved_at) : undefined,
      resolvedAt: approvedMarket.resolved_at ? new Date(approvedMarket.resolved_at) : undefined,
      approvedBy: approvedMarket.approved_by,
      resolvedBy: approvedMarket.resolved_by
    };
  }
}

// Export singleton instance
export const userDataService = new UserDataService();