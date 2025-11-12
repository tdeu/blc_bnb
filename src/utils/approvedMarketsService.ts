import { supabase, ApprovedMarket } from './supabase';
import { BettingMarket } from '../components/betting/BettingMarkets';

class ApprovedMarketsService {
  /**
   * Store an approved market in Supabase
   */
  async storeApprovedMarket(
    market: BettingMarket, 
    approvedBy: string, 
    submitterAddress: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('⚠️ Supabase not configured, skipping storage');
        return false;
      }
      const approvedMarket: Omit<ApprovedMarket, 'created_at' | 'approved_at'> = {
        id: market.id,
        claim: market.claim,
        description: market.description,
        category: market.category,
        country: market.country,
        region: market.region,
        market_type: market.marketType,
        confidence_level: market.confidenceLevel,
        expires_at: market.expiresAt.toISOString(),
        approved_by: approvedBy,
        approval_reason: reason,
        submitter_address: submitterAddress,
        contract_address: (market as any).contractAddress, // Include the contract address from market creation
        image_url: market.imageUrl, // Include the image URL
        status: market.status, // Include market status
        dispute_period_end: (market as any).dispute_period_end // Include dispute period for disputable markets
      };

      const { error } = await supabase
        .from('approved_markets')
        .insert([approvedMarket]);

      if (error) {
        console.error('Error storing approved market:', error);
        return false;
      }

      console.log(`✅ Market stored in Supabase: ${market.claim}`);
      return true;
    } catch (error) {
      console.error('Error in storeApprovedMarket:', error);
      return false;
    }
  }

  /**
   * Get all approved markets from Supabase
   */
  async getApprovedMarkets(): Promise<BettingMarket[]> {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('⚠️ Supabase not configured, returning empty array');
        return [];
      }
      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .order('approved_at', { ascending: false });

      if (error) {
        console.error('Error fetching approved markets:', error);
        return [];
      }

      if (!data) return [];

      // Convert Supabase data back to BettingMarket format
      return data.map(this.convertToBettingMarket);
    } catch (error) {
      console.error('Error in getApprovedMarkets:', error);
      return [];
    }
  }

  /**
   * Get approved markets by category
   */
  async getApprovedMarketsByCategory(category: string): Promise<BettingMarket[]> {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('category', category)
        .order('approved_at', { ascending: false });

      if (error) {
        console.error('Error fetching markets by category:', error);
        return [];
      }

      if (!data) return [];

      return data.map(this.convertToBettingMarket);
    } catch (error) {
      console.error('Error in getApprovedMarketsByCategory:', error);
      return [];
    }
  }

  /**
   * Get approved markets by admin
   */
  async getMarketsApprovedBy(adminAddress: string): Promise<BettingMarket[]> {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('approved_by', adminAddress.toLowerCase())
        .order('approved_at', { ascending: false });

      if (error) {
        console.error('Error fetching markets by admin:', error);
        return [];
      }

      if (!data) return [];

      return data.map(this.convertToBettingMarket);
    } catch (error) {
      console.error('Error in getMarketsApprovedBy:', error);
      return [];
    }
  }

  /**
   * Check if a market is already approved
   */
  async isMarketApproved(marketId: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      const { data, error } = await supabase
        .from('approved_markets')
        .select('id')
        .eq('id', marketId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking market approval:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Error in isMarketApproved:', error);
      return false;
    }
  }

  /**
   * Update market status (e.g., to take offline)
   */
  async updateMarketStatus(marketId: string, status: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not configured, cannot update market status');
        return false;
      }

      const { error } = await supabase
        .from('approved_markets')
        .update({ status })
        .eq('id', marketId);

      if (error) {
        console.error('Error updating market status:', error);
        return false;
      }

      console.log(`✅ Market ${marketId} status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error('Error in updateMarketStatus:', error);
      return false;
    }
  }

  /**
   * Get statistics about approved markets
   */
  async getStats() {
    try {
      if (!supabase) return { total: 0 };
      const { count, error } = await supabase
        .from('approved_markets')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting approved markets stats:', error);
        return { total: 0 };
      }

      return { total: count || 0 };
    } catch (error) {
      console.error('Error in getStats:', error);
      return { total: 0 };
    }
  }

  /**
   * Convert Supabase ApprovedMarket to BettingMarket format
   */
  private convertToBettingMarket(approvedMarket: ApprovedMarket): BettingMarket {
    // Map Supabase ApprovedMarket to UI BettingMarket with resolution fields
    // Preserve the actual status from database, don't default to 'active'
    const status = (approvedMarket.status as BettingMarket['status']) || 'active';
    
    // Debug log to see what status we're getting
    if (approvedMarket.id === 'market_1758612204970_xgolhnr9c') {
      console.log('🔍 NEW MARKET CONTRACT DEBUG:', approvedMarket.contract_address);
      console.log('🔍 NEW MARKET TYPE:', typeof approvedMarket.contract_address);
      console.log('🔍 NEW MARKET ID:', approvedMarket.id);
    }
    return {
      id: approvedMarket.id,
      claim: approvedMarket.claim,
      description: approvedMarket.description || '',
      category: approvedMarket.category,
      country: approvedMarket.country,
      region: approvedMarket.region,
      marketType: (approvedMarket.market_type as any) || 'present',
      confidenceLevel: (approvedMarket.confidence_level as any) || 'medium',
      expiresAt: new Date(approvedMarket.expires_at),
      status,
      imageUrl: approvedMarket.image_url, // Include the image URL
      resolution_data: approvedMarket.resolution_data as any,
      dispute_count: approvedMarket.dispute_count,
      dispute_period_end: approvedMarket.dispute_period_end || undefined,
      // Load odds from database if available, otherwise default to 2.0
      yesOdds: approvedMarket.yes_odds || 2.0,
      noOdds: approvedMarket.no_odds || 2.0,
      volume: approvedMarket.volume || 0,
      totalPool: approvedMarket.volume || 0,
      yesPool: 0,
      noPool: 0,
      totalCasters: 0,
      trending: false,
      // Surface contract address from database
      // @ts-ignore augment at runtime for display
      contractAddress: approvedMarket.contract_address || null
    } as unknown as BettingMarket;
  }
}

// Export singleton instance
export const approvedMarketsService = new ApprovedMarketsService();