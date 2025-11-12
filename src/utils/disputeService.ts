import { supabase, MarketDispute, MarketResolution, ApprovedMarket, HTSToken } from './supabase';
// Hedera resolution service removed - using BSC implementation

interface DisputeData {
  reason: string;
  evidenceUrl?: string;
  evidenceDescription?: string;
  disputeType: 'evidence' | 'interpretation' | 'api_error';
}

interface DisputeDecision {
  action: 'accept' | 'reject';
  adminResponse: string;
  adminAccount: string;
}

interface DisputeStats {
  totalDisputes: number;
  pendingDisputes: number;
  acceptedDisputes: number;
  rejectedDisputes: number;
  averageResolutionTimeHours: number;
  totalBondsLocked: number;
  totalBondsRefunded: number;
  totalBondsSlashed: number;
}

interface BondCalculation {
  baseAmount: number;
  reputationMultiplier: number;
  finalAmount: number;
  tokenId: string;
}

export class DisputeService {
  private defaultBondAmounts = {
    evidence: 100,
    interpretation: 250,
    api_error: 500
  };

  private disputeBondTokenId: string = ''; // Will be set during initialization

  constructor() {
    this.initializeBondToken();
  }

  private async initializeBondToken(): Promise<void> {
    try {
      if (!supabase) return;

      // Try to get existing dispute bond token
      const { data: tokens, error } = await supabase
        .from('hts_tokens')
        .select('*')
        .eq('purpose', 'dispute_bond')
        .limit(1);

      if (error) {
        console.warn('Error fetching dispute bond token:', error);
        return;
      }

      if (tokens && tokens.length > 0) {
        this.disputeBondTokenId = tokens[0].token_id;
        console.log('Using existing dispute bond token:', this.disputeBondTokenId);
      } else {
        // Create new dispute bond token if none exists
        console.log('No dispute bond token found, will create when needed');
      }
    } catch (error) {
      console.warn('Failed to initialize bond token:', error);
    }
  }

  // User Dispute Submission
  async submitDispute(
    marketId: string, 
    userId: string, 
    disputeData: DisputeData,
    userPrivateKey?: string
  ): Promise<{
    disputeId: string;
    bondTransactionId?: string;
    hcsMessageId?: string;
  }> {
    try {
      console.log(`Submitting dispute for market ${marketId} by user ${userId}`);

      // Validate market exists and has a resolution
      const { resolution, market } = await this.validateMarketForDispute(marketId);

      // Calculate required bond amount
      const bondCalculation = await this.calculateBondAmount(disputeData.disputeType, userId);

      // Check if dispute period is still active
      const disputePeriodActive = await this.isDisputePeriodActive(marketId);
      if (!disputePeriodActive) {
        throw new Error('Dispute period has expired for this market');
      }

      // Create dispute record
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: dispute, error } = await supabase
        .from('market_disputes')
        .insert({
          market_id: marketId,
          resolution_id: resolution.id,
          user_id: userId,
          dispute_reason: disputeData.reason,
          evidence_url: disputeData.evidenceUrl,
          evidence_description: disputeData.evidenceDescription,
          status: 'pending',
          bond_amount: bondCalculation.finalAmount
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let bondTransactionId: string | undefined;
      let hcsMessageId: string | undefined;

      // Bond payment - Hedera service removed
      // TODO: Reimplement bond locking with BSC smart contracts
      if (userPrivateKey && this.disputeBondTokenId) {
        console.log('⚠️ Bond payment not implemented for BSC yet - dispute submitted without bond');
      }

      // HCS submission removed (was Hedera-specific)
      // BSC implementation stores disputes directly in database
      console.log('📝 Dispute recorded in database - HCS not used in BSC version');

      console.log(`Dispute submitted successfully: ${dispute.id}`);

      return {
        disputeId: dispute.id,
        bondTransactionId,
        hcsMessageId
      };

    } catch (error) {
      console.error('Error submitting dispute:', error);
      throw error;
    }
  }

  async getUserDisputes(userId: string): Promise<MarketDispute[]> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    const { data: disputes, error } = await supabase
      .from('market_disputes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return disputes || [];
  }

  // Admin Management
  async getPendingDisputes(): Promise<MarketDispute[]> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    const { data: disputes, error } = await supabase
      .from('market_disputes')
      .select(`
        *,
        resolution:market_resolutions!resolution_id(*),
        market:approved_markets!market_id(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return disputes || [];
  }

  async reviewDispute(
    disputeId: string, 
    adminDecision: DisputeDecision
  ): Promise<{
    reviewTransactionId?: string;
    bondRefundTransactionId?: string;
  }> {
    try {
      console.log(`Reviewing dispute ${disputeId}: ${adminDecision.action}`);

      if (!supabase) {
        throw new Error('Supabase not available');
      }

      // Get dispute details
      const { data: dispute, error } = await supabase
        .from('market_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (error || !dispute) {
        throw new Error(`Dispute not found: ${disputeId}`);
      }

      // Update dispute status
      await supabase
        .from('market_disputes')
        .update({
          status: adminDecision.action === 'accept' ? 'accepted' : 'rejected',
          admin_response: adminDecision.adminResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      let bondRefundTransactionId: string | undefined;

      // Bond refund - Hedera service removed
      // TODO: Reimplement bond refund with BSC smart contracts
      if (dispute.bond_transaction_id && dispute.bond_amount && this.disputeBondTokenId) {
        console.log('⚠️ Bond refund not implemented for BSC yet');
      }

      // HCS submission removed (was Hedera-specific)
      // BSC implementation stores admin decisions in database
      let reviewTransactionId: string | undefined;
      console.log('📝 Admin decision recorded in database - HCS not used');

      // If dispute is accepted, may need to update market resolution
      if (adminDecision.action === 'accept') {
        await this.handleAcceptedDispute(dispute.market_id, dispute.resolution_id, adminDecision);
      }

      console.log(`Dispute review completed: ${disputeId} - ${adminDecision.action}`);

      return {
        reviewTransactionId,
        bondRefundTransactionId
      };

    } catch (error) {
      console.error('Error reviewing dispute:', error);
      throw error;
    }
  }

  async getDisputeStatistics(): Promise<DisputeStats> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    try {
      // Get dispute counts
      const { data: disputes } = await supabase
        .from('market_disputes')
        .select('status, bond_amount, created_at, updated_at');

      if (!disputes) {
        return this.getEmptyStats();
      }

      const totalDisputes = disputes.length;
      const pendingDisputes = disputes.filter(d => d.status === 'pending').length;
      const acceptedDisputes = disputes.filter(d => d.status === 'accepted').length;
      const rejectedDisputes = disputes.filter(d => d.status === 'rejected').length;

      // Calculate average resolution time
      const resolvedDisputes = disputes.filter(d => d.status !== 'pending' && d.updated_at);
      const avgResolutionTime = resolvedDisputes.length > 0
        ? resolvedDisputes.reduce((sum, d) => {
            const created = new Date(d.created_at).getTime();
            const updated = new Date(d.updated_at).getTime();
            return sum + (updated - created);
          }, 0) / (resolvedDisputes.length * 1000 * 60 * 60) // Convert to hours
        : 0;

      // Calculate bond statistics
      const totalBondsLocked = disputes.reduce((sum, d) => sum + (d.bond_amount || 0), 0);
      const acceptedBonds = disputes
        .filter(d => d.status === 'accepted')
        .reduce((sum, d) => sum + (d.bond_amount || 0), 0);
      const rejectedBonds = disputes
        .filter(d => d.status === 'rejected')
        .reduce((sum, d) => sum + (d.bond_amount || 0), 0);

      return {
        totalDisputes,
        pendingDisputes,
        acceptedDisputes,
        rejectedDisputes,
        averageResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
        totalBondsLocked,
        totalBondsRefunded: acceptedBonds + (rejectedBonds * 0.5), // Accepted = full refund, rejected = 50%
        totalBondsSlashed: rejectedBonds * 0.5 // 50% of rejected bonds are slashed
      };

    } catch (error) {
      console.error('Error getting dispute statistics:', error);
      return this.getEmptyStats();
    }
  }

  // Bond Management
  async calculateBondAmount(disputeType: 'evidence' | 'interpretation' | 'api_error', userId: string): Promise<BondCalculation> {
    const baseAmount = this.defaultBondAmounts[disputeType];
    
    // Get user reputation score (mock implementation)
    const reputationScore = await this.getUserReputationScore(userId);
    
    // Higher reputation = lower bond requirement
    let reputationMultiplier = 1.0;
    if (reputationScore >= 100) {
      reputationMultiplier = 0.7; // 30% discount
    } else if (reputationScore >= 50) {
      reputationMultiplier = 0.85; // 15% discount
    } else if (reputationScore < 10) {
      reputationMultiplier = 1.5; // 50% penalty for low reputation
    }

    const finalAmount = Math.floor(baseAmount * reputationMultiplier);

    return {
      baseAmount,
      reputationMultiplier,
      finalAmount,
      tokenId: this.disputeBondTokenId
    };
  }

  async validateDisputeBond(userId: string, requiredAmount: number): Promise<boolean> {
    // Bond validation - Hedera service removed
    // TODO: Reimplement with BSC token balance check
    console.log('⚠️ Bond validation not implemented for BSC yet');
    return true; // Allow disputes without bond validation for now
  }

  async createDisputeBondToken(): Promise<string> {
    // Token creation - Hedera service removed
    // TODO: Deploy ERC20 dispute bond token on BSC
    throw new Error('Dispute bond token creation not implemented for BSC yet');
  }

  // Private Helper Methods
  private async validateMarketForDispute(marketId: string): Promise<{
    market: ApprovedMarket;
    resolution: MarketResolution;
  }> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    // Get market
    const { data: market, error: marketError } = await supabase
      .from('approved_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      throw new Error(`Market not found: ${marketId}`);
    }

    // Get latest resolution
    const { data: resolution, error: resolutionError } = await supabase
      .from('market_resolutions')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resolutionError || !resolution) {
      throw new Error(`No resolution found for market: ${marketId}`);
    }

    return { market, resolution };
  }

  private async isDisputePeriodActive(marketId: string): Promise<boolean> {
    if (!supabase) return false;

    const { data: resolution } = await supabase
      .from('market_resolutions')
      .select('dispute_period_end')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!resolution?.dispute_period_end) return false;

    return new Date() < new Date(resolution.dispute_period_end);
  }

  private async handleAcceptedDispute(marketId: string, resolutionId: string, adminDecision: DisputeDecision): Promise<void> {
    // When a dispute is accepted, we might need to:
    // 1. Update the market resolution
    // 2. Flag for manual review
    // 3. Trigger re-evaluation

    if (!supabase) return;

    await supabase
      .from('approved_markets')
      .update({
        status: 'disputed_resolution',
        resolution_data: {
          disputed: true,
          adminReview: adminDecision.adminResponse,
          reviewedAt: new Date().toISOString()
        }
      })
      .eq('id', marketId);

    console.log(`Market ${marketId} flagged for re-evaluation due to accepted dispute`);
  }

  private async getUserReputationScore(userId: string): Promise<number> {
    // Mock implementation - in production, this would calculate based on:
    // - Previous dispute success rate
    // - Market participation history
    // - Community voting
    // - Time on platform
    
    return Math.floor(Math.random() * 100); // Random score between 0-100 for now
  }

  private getEmptyStats(): DisputeStats {
    return {
      totalDisputes: 0,
      pendingDisputes: 0,
      acceptedDisputes: 0,
      rejectedDisputes: 0,
      averageResolutionTimeHours: 0,
      totalBondsLocked: 0,
      totalBondsRefunded: 0,
      totalBondsSlashed: 0
    };
  }

  // Configuration Methods
  setDisputeBondToken(tokenId: string): void {
    this.disputeBondTokenId = tokenId;
  }

  getDisputeBondToken(): string {
    return this.disputeBondTokenId;
  }

  updateBondAmounts(newAmounts: Partial<typeof this.defaultBondAmounts>): void {
    this.defaultBondAmounts = { ...this.defaultBondAmounts, ...newAmounts };
  }

  getBondAmounts(): typeof this.defaultBondAmounts {
    return { ...this.defaultBondAmounts };
  }
}

// Export singleton instance
export const disputeService = new DisputeService();