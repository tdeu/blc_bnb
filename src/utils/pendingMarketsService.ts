import { BettingMarket } from '../components/betting/BettingMarkets';
import { supabase } from './supabase';

export interface PendingMarketSubmission {
  id: string;
  market: BettingMarket;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  contractAddress?: string;
  adminAction?: {
    adminAddress: string;
    action: 'approved' | 'rejected';
    reason?: string;
    timestamp: Date;
  };
}

// Database row interface
interface PendingMarketRow {
  id: string;
  claim: string;
  description?: string;
  category: string;
  country?: string;
  region?: string;
  market_type: string;
  confidence_level: string;
  expires_at: string;
  submitted_by: string;
  submitted_at: string;
  contract_address?: string;
  transaction_hash?: string;
  image_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_address?: string;
  admin_action?: 'approved' | 'rejected';
  admin_reason?: string;
  admin_action_at?: string;
  created_at: string;
  updated_at: string;
}

class PendingMarketsService {
  private readonly STORAGE_KEY = 'blockcast_pending_markets';
  private readonly FALLBACK_TO_LOCALSTORAGE = true; // Fallback if Supabase is not configured

  /**
   * Submit a new market for admin approval
   */
  async submitMarket(market: BettingMarket, submitterAddress: string, contractAddress?: string): Promise<void> {
    const pendingMarket: PendingMarketSubmission = {
      id: market.id,
      market: {
        ...market,
        status: 'pending' // Override status to pending
      },
      submittedBy: submitterAddress,
      submittedAt: new Date(),
      status: 'pending',
      contractAddress
    };

    // Try Supabase first
    if (supabase) {
      try {
        const row: Omit<PendingMarketRow, 'created_at' | 'updated_at'> = {
          id: market.id,
          claim: market.claim,
          description: market.description,
          category: market.category,
          country: market.country || '',
          region: market.region || '',
          market_type: market.marketType || 'future',
          confidence_level: market.confidenceLevel || 'medium',
          expires_at: market.expiresAt.toISOString(),
          submitted_by: submitterAddress,
          submitted_at: new Date().toISOString(),
          contract_address: contractAddress,
          image_url: market.imageUrl,
          status: 'pending'
        };

        const { error } = await supabase
          .from('pending_markets')
          .insert([row]);

        if (error) {
          console.error('Error submitting market to Supabase:', error);
          if (this.FALLBACK_TO_LOCALSTORAGE) {
            this.submitMarketToLocalStorage(pendingMarket);
          }
          return;
        }

        console.log(`📝 Market submitted to Supabase for approval: ${market.claim}`);
        return;
      } catch (error) {
        console.error('Error in submitMarket:', error);
        if (this.FALLBACK_TO_LOCALSTORAGE) {
          this.submitMarketToLocalStorage(pendingMarket);
        }
        return;
      }
    } else {
      // Supabase not configured, use localStorage
      this.submitMarketToLocalStorage(pendingMarket);
    }
  }

  /**
   * Fallback: Submit to localStorage
   */
  private submitMarketToLocalStorage(pendingMarket: PendingMarketSubmission): void {
    const existingMarkets = this.getLocalStorageMarkets();
    existingMarkets.push(pendingMarket);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingMarkets));
    console.log(`📝 Market submitted to localStorage for approval: ${pendingMarket.market.claim}`);
  }

  /**
   * Add a pending market submission (legacy method for compatibility)
   */
  async addPendingMarket(submission: PendingMarketSubmission): Promise<void> {
    await this.submitMarket(submission.market, submission.submittedBy, submission.contractAddress);
  }

  /**
   * Get all pending markets for admin review
   */
  async getPendingMarkets(): Promise<PendingMarketSubmission[]> {
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('pending_markets')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('Error fetching pending markets from Supabase:', error);
          return this.FALLBACK_TO_LOCALSTORAGE ? this.getLocalStorageMarkets() : [];
        }

        if (!data) return [];

        return data.map(this.convertRowToSubmission);
      } catch (error) {
        console.error('Error in getPendingMarkets:', error);
        return this.FALLBACK_TO_LOCALSTORAGE ? this.getLocalStorageMarkets() : [];
      }
    } else {
      // Supabase not configured, use localStorage
      return this.getLocalStorageMarkets();
    }
  }

  /**
   * Get only markets that are still pending approval
   */
  async getActivePendingMarkets(): Promise<PendingMarketSubmission[]> {
    const allMarkets = await this.getPendingMarkets();
    return allMarkets.filter(market => market.status === 'pending');
  }

  /**
   * Approve a pending market
   */
  async approveMarket(marketId: string, adminAddress: string, reason?: string): Promise<BettingMarket | null> {
    // Try Supabase first
    if (supabase) {
      try {
        // Get the market first
        const { data: market, error: fetchError } = await supabase
          .from('pending_markets')
          .select('*')
          .eq('id', marketId)
          .single();

        if (fetchError || !market) {
          console.error('Market not found for approval:', marketId);
          return this.approveMarketInLocalStorage(marketId, adminAddress, reason);
        }

        // Update the market status
        const { error: updateError } = await supabase
          .from('pending_markets')
          .update({
            status: 'approved',
            admin_address: adminAddress,
            admin_action: 'approved',
            admin_reason: reason,
            admin_action_at: new Date().toISOString()
          })
          .eq('id', marketId);

        if (updateError) {
          console.error('Error approving market in Supabase:', updateError);
          return this.approveMarketInLocalStorage(marketId, adminAddress, reason);
        }

        console.log(`✅ Market approved in Supabase: ${market.claim}`);

        // Convert to BettingMarket format
        const approvedMarket: BettingMarket = {
          id: market.id,
          claim: market.claim,
          description: market.description || '',
          category: market.category,
          country: market.country,
          region: market.region,
          marketType: market.market_type as any,
          confidenceLevel: market.confidence_level as any,
          expiresAt: new Date(market.expires_at),
          status: 'active',
          imageUrl: market.image_url,
          totalPool: 0,
          yesPool: 0,
          noPool: 0,
          yesOdds: 2.0,
          noOdds: 2.0,
          totalCasters: 0,
          trending: false,
          // @ts-ignore - Add contract address at runtime
          contractAddress: market.contract_address
        };

        return approvedMarket;
      } catch (error) {
        console.error('Error in approveMarket:', error);
        return this.approveMarketInLocalStorage(marketId, adminAddress, reason);
      }
    } else {
      // Supabase not configured, use localStorage
      return this.approveMarketInLocalStorage(marketId, adminAddress, reason);
    }
  }

  /**
   * Fallback: Approve market in localStorage
   */
  private approveMarketInLocalStorage(marketId: string, adminAddress: string, reason?: string): BettingMarket | null {
    const markets = this.getLocalStorageMarkets();
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
        status: 'active'
      },
      adminAction: {
        adminAddress,
        action: 'approved',
        reason,
        timestamp: new Date()
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(markets));

    console.log(`✅ Market approved in localStorage: ${market.market.claim}`);

    const approvedMarket = {
      ...markets[marketIndex].market,
      contractAddress: markets[marketIndex].contractAddress
    };

    return approvedMarket;
  }

  /**
   * Reject a pending market
   */
  async rejectMarket(marketId: string, adminAddress: string, reason: string): Promise<boolean> {
    // Try Supabase first
    if (supabase) {
      try {
        const { error } = await supabase
          .from('pending_markets')
          .update({
            status: 'rejected',
            admin_address: adminAddress,
            admin_action: 'rejected',
            admin_reason: reason,
            admin_action_at: new Date().toISOString()
          })
          .eq('id', marketId);

        if (error) {
          console.error('Error rejecting market in Supabase:', error);
          return this.rejectMarketInLocalStorage(marketId, adminAddress, reason);
        }

        console.log(`❌ Market rejected in Supabase - Reason: ${reason}`);
        return true;
      } catch (error) {
        console.error('Error in rejectMarket:', error);
        return this.rejectMarketInLocalStorage(marketId, adminAddress, reason);
      }
    } else {
      // Supabase not configured, use localStorage
      return this.rejectMarketInLocalStorage(marketId, adminAddress, reason);
    }
  }

  /**
   * Fallback: Reject market in localStorage
   */
  private rejectMarketInLocalStorage(marketId: string, adminAddress: string, reason: string): boolean {
    const markets = this.getLocalStorageMarkets();
    const marketIndex = markets.findIndex(m => m.id === marketId);

    if (marketIndex === -1) {
      console.error('Market not found for rejection:', marketId);
      return false;
    }

    const market = markets[marketIndex];

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

    console.log(`❌ Market rejected in localStorage: ${market.market.claim} - Reason: ${reason}`);
    return true;
  }

  /**
   * Get approved markets that should be added to the main markets list
   */
  async getApprovedMarkets(): Promise<BettingMarket[]> {
    const allMarkets = await this.getPendingMarkets();
    return allMarkets
      .filter(market => market.status === 'approved')
      .map(market => market.market);
  }

  /**
   * Clear processed markets (optional cleanup)
   */
  async clearProcessedMarkets(): Promise<void> {
    // For Supabase, we keep the records for audit trail
    // Only clear from localStorage
    if (!supabase) {
      const markets = this.getLocalStorageMarkets();
      const stillPending = markets.filter(market => market.status === 'pending');
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stillPending));
    }
  }

  /**
   * Get statistics for admin dashboard
   */
  async getStats() {
    const markets = await this.getPendingMarkets();
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
    return {
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
      transactionHash: submission.id,
      imageUrl: submission.market.imageUrl,
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
  }

  /**
   * Convert database row to PendingMarketSubmission
   */
  private convertRowToSubmission(row: PendingMarketRow): PendingMarketSubmission {
    return {
      id: row.id,
      market: {
        id: row.id,
        claim: row.claim,
        description: row.description || '',
        category: row.category,
        country: row.country,
        region: row.region,
        marketType: row.market_type as any,
        confidenceLevel: row.confidence_level as any,
        expiresAt: new Date(row.expires_at),
        status: row.status,
        imageUrl: row.image_url,
        totalPool: 0,
        yesPool: 0,
        noPool: 0,
        yesOdds: 2.0,
        noOdds: 2.0,
        totalCasters: 0,
        trending: false
      },
      submittedBy: row.submitted_by,
      submittedAt: new Date(row.submitted_at),
      status: row.status,
      contractAddress: row.contract_address,
      adminAction: row.admin_action ? {
        adminAddress: row.admin_address!,
        action: row.admin_action,
        reason: row.admin_reason,
        timestamp: new Date(row.admin_action_at!)
      } : undefined
    };
  }

  /**
   * Get markets from localStorage (fallback method)
   */
  private getLocalStorageMarkets(): PendingMarketSubmission[] {
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
      console.error('Error loading pending markets from localStorage:', error);
      return [];
    }
  }
}

// Export singleton instance
export const pendingMarketsService = new PendingMarketsService();
