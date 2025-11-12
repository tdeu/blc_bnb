import { BettingMarket } from '../components/betting/BettingMarkets';

export interface PendingMarketSubmission {
  id: string;
  market: BettingMarket;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  adminAction?: {
    adminAddress: string;
    action: 'approved' | 'rejected';
    reason?: string;
    timestamp: Date;
  };
}

class PendingMarketsService {
  private readonly STORAGE_KEY = 'blockcast_pending_markets';

  /**
   * Submit a new market for admin approval
   */
  submitMarket(market: BettingMarket, submitterAddress: string): void {
    const pendingMarket: PendingMarketSubmission = {
      id: market.id,
      market: {
        ...market,
        status: 'pending' // Override status to pending
      },
      submittedBy: submitterAddress,
      submittedAt: new Date(),
      status: 'pending'
    };

    const existingMarkets = this.getPendingMarkets();
    existingMarkets.push(pendingMarket);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingMarkets));
    
    console.log(`📝 Market submitted for approval: ${market.claim}`);
  }

  /**
   * Add a pending market submission
   */
  addPendingMarket(submission: PendingMarketSubmission): void {
    console.log('🔍 DEBUG: Adding pending market with imageUrl:', submission.market.imageUrl);
    
    const markets = this.getPendingMarkets();
    markets.push(submission);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(markets));
    
    console.log('🔍 DEBUG: Stored market data:', JSON.stringify(submission, null, 2));
  }

  /**
   * Get all pending markets for admin review
   */
  getPendingMarkets(): PendingMarketSubmission[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const markets = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return markets.map((market: any) => ({
        ...market,
        submittedAt: new Date(market.submittedAt),
        market: {
          ...market.market,
          expiresAt: new Date(market.market.expiresAt)
        },
        adminAction: market.adminAction ? {
          ...market.adminAction,
          timestamp: new Date(market.adminAction.timestamp)
        } : undefined
      }));
    } catch (error) {
      console.error('Error loading pending markets:', error);
      return [];
    }
  }

  /**
   * Get only markets that are still pending approval
   */
  getActivePendingMarkets(): PendingMarketSubmission[] {
    return this.getPendingMarkets().filter(market => market.status === 'pending');
  }

  /**
   * Approve a pending market
   */
  approveMarket(marketId: string, adminAddress: string, reason?: string): BettingMarket | null {
    const markets = this.getPendingMarkets();
    const marketIndex = markets.findIndex(m => m.id === marketId);
    
    if (marketIndex === -1) {
      console.error('Market not found for approval:', marketId);
      return null;
    }

    const market = markets[marketIndex];
    
    // Update market status
    markets[marketIndex] = {
      ...market,
      status: 'approved',
      market: {
        ...market.market,
        status: 'active' // Now it becomes active for users
      },
      adminAction: {
        adminAddress,
        action: 'approved',
        reason,
        timestamp: new Date()
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(markets));

    console.log(`✅ Market approved by admin: ${market.market.claim}`);

    // Return the market with contract address preserved
    const approvedMarket = {
      ...markets[marketIndex].market,
      contractAddress: (markets[marketIndex] as any).contractAddress // Preserve contract address from top level
    };

    console.log(`🔍 APPROVAL DEBUG: contractAddress from pending market:`, (markets[marketIndex] as any).contractAddress);
    console.log(`🔍 APPROVAL DEBUG: final approved market contractAddress:`, approvedMarket.contractAddress);

    return approvedMarket;
  }

  /**
   * Reject a pending market
   */
  rejectMarket(marketId: string, adminAddress: string, reason: string): boolean {
    const markets = this.getPendingMarkets();
    const marketIndex = markets.findIndex(m => m.id === marketId);
    
    if (marketIndex === -1) {
      console.error('Market not found for rejection:', marketId);
      return false;
    }

    const market = markets[marketIndex];
    
    // Update market status
    markets[marketIndex] = {
      ...market,
      status: 'rejected',
      adminAction: {
        adminAddress,
        action: 'rejected',
        reason,
        timestamp: new Date()
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(markets));
    
    console.log(`❌ Market rejected by admin: ${market.market.claim} - Reason: ${reason}`);
    return true;
  }

  /**
   * Get approved markets that should be added to the main markets list
   */
  getApprovedMarkets(): BettingMarket[] {
    return this.getPendingMarkets()
      .filter(market => market.status === 'approved')
      .map(market => market.market);
  }

  /**
   * Clear processed markets (optional cleanup)
   */
  clearProcessedMarkets(): void {
    const markets = this.getPendingMarkets();
    const stillPending = markets.filter(market => market.status === 'pending');
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stillPending));
  }

  /**
   * Get statistics for admin dashboard
   */
  getStats() {
    const markets = this.getPendingMarkets();
    return {
      totalSubmitted: markets.length,
      pending: markets.filter(m => m.status === 'pending').length,
      approved: markets.filter(m => m.status === 'approved').length,
      rejected: markets.filter(m => m.status === 'rejected').length
    };
  }

  /**
   * Convert PendingMarketSubmission to the format expected by admin components
   */
  toPendingMarketFormat(submission: PendingMarketSubmission): import('./adminService').PendingMarket {
    console.log('🔍 DEBUG: Converting submission with imageUrl:', submission.market.imageUrl);
    
    const result = {
      id: submission.id,
      question: submission.market.claim,
      description: submission.market.description,
      category: submission.market.category,
      source: submission.market.source,
      country: submission.market.country,
      region: submission.market.region,
      confidenceLevel: submission.market.confidenceLevel,
      marketType: submission.market.marketType,
      expiresAt: submission.market.expiresAt,
      submittedAt: submission.submittedAt,
      submitterAddress: submission.submittedBy,
      transactionHash: submission.id, // Using ID as transaction hash for now
      imageUrl: submission.market.imageUrl, // Make sure this line exists
      creator: submission.submittedBy,
      createdAt: submission.submittedAt,
      endTime: submission.market.expiresAt,
      tags: [
        submission.market.country,
        submission.market.region,
        submission.market.marketType,
        submission.market.confidenceLevel
      ].filter(Boolean) as string[],
      status: submission.status as any
    };
    
    console.log('🔍 DEBUG: Converted to pending market format with imageUrl:', result.imageUrl);
    return result;
  }
}

// Export singleton instance
export const pendingMarketsService = new PendingMarketsService();