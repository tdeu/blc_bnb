/**
 * Prediction Service for BlockCast
 *
 * Handles prediction storage in Supabase for cross-user synchronization.
 * All predictions are visible to all users (transparency).
 */

import { supabase, MarketPrediction } from '../utils/supabase';
import { UserBettingHistory } from '../utils/userDataService';

export interface SavePredictionInput {
  marketId: string;
  userAddress: string;
  position: 'yes' | 'no';
  amount: number;
  shares?: string;
  odds?: number;
  potentialReturn?: number;
  transactionHash?: string;
  marketContractAddress?: string;
}

export interface SavePredictionResult {
  success: boolean;
  prediction?: MarketPrediction;
  error?: string;
}

export interface PredictionListResult {
  success: boolean;
  predictions?: MarketPrediction[];
  error?: string;
}

class PredictionService {
  /**
   * Save a new prediction to Supabase
   */
  async savePrediction(input: SavePredictionInput): Promise<SavePredictionResult> {
    if (!supabase) {
      console.warn('Supabase not configured, falling back to localStorage');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const predictionId = `${input.marketId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const predictionRecord = {
        id: predictionId,
        market_id: input.marketId,
        user_address: input.userAddress.toLowerCase(),
        position: input.position,
        amount: input.amount,
        shares: input.shares || null,
        odds: input.odds || null,
        potential_return: input.potentialReturn || null,
        transaction_hash: input.transactionHash || 'pending',
        transaction_status: 'pending' as const,
        market_contract_address: input.marketContractAddress || null
      };

      const { data: insertedPrediction, error: insertError } = await supabase
        .from('market_predictions')
        .insert(predictionRecord)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to store prediction in database:', insertError);
        return {
          success: false,
          error: `Database error: ${insertError.message}`
        };
      }

      console.log(`✅ Prediction saved to Supabase for market ${input.marketId}`);
      console.log(`   User: ${input.userAddress.slice(0, 8)}...${input.userAddress.slice(-6)}`);
      console.log(`   Position: ${input.position.toUpperCase()}`);
      console.log(`   Amount: ${input.amount} CAST`);

      return {
        success: true,
        prediction: insertedPrediction as MarketPrediction
      };
    } catch (error) {
      console.error('Prediction save error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all predictions for a specific market (from ALL users)
   */
  async getMarketPredictions(marketId: string): Promise<PredictionListResult> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: predictions, error } = await supabase
        .from('market_predictions')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        predictions: predictions as MarketPrediction[]
      };
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all predictions for a specific user
   */
  async getUserPredictions(userAddress: string): Promise<PredictionListResult> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: predictions, error } = await supabase
        .from('market_predictions')
        .select('*')
        .eq('user_address', userAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        predictions: predictions as MarketPrediction[]
      };
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update prediction with transaction hash and status
   */
  async updatePredictionTransaction(
    predictionId: string,
    transactionHash: string,
    status: 'confirmed' | 'failed',
    shares?: string,
    cost?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const updateData: any = {
        transaction_hash: transactionHash,
        transaction_status: status
      };

      if (shares) {
        updateData.shares = shares;
        updateData.potential_return = parseFloat(shares);
      }

      const { error } = await supabase
        .from('market_predictions')
        .update(updateData)
        .eq('id', predictionId);

      if (error) {
        console.error('Failed to update prediction:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Prediction ${predictionId} updated: ${status} (TX: ${transactionHash})`);
      return { success: true };
    } catch (error) {
      console.error('Error updating prediction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mark prediction as failed after timeout
   */
  async markPredictionFailed(predictionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updatePredictionTransaction(predictionId, 'failed', 'failed');
  }

  /**
   * Convert MarketPrediction to UserBettingHistory format for compatibility
   */
  convertToUserBettingHistory(prediction: MarketPrediction, marketClaim: string = ''): UserBettingHistory {
    return {
      id: prediction.id,
      marketId: prediction.market_id,
      marketClaim: marketClaim,
      position: prediction.position,
      amount: prediction.amount,
      shares: prediction.shares || '0',
      transactionHash: prediction.transaction_hash || 'pending',
      placedAt: new Date(prediction.created_at),
      status: 'active',
      marketStatus: 'active',
      potentialReturn: prediction.potential_return || prediction.amount * 2,
      currentValue: prediction.potential_return || prediction.amount * 2,
      walletAddress: prediction.user_address,
      odds: prediction.odds,
      marketContractAddress: prediction.market_contract_address
    };
  }

  /**
   * Get prediction count for a market
   */
  async getPredictionCount(marketId: string): Promise<number> {
    if (!supabase) return 0;

    try {
      const { count, error } = await supabase
        .from('market_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId);

      if (error) {
        console.error('Error counting predictions:', error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Format wallet address for display
   */
  formatWalletAddress(address: string): string {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Check if a prediction belongs to the current user
   */
  isOwnPrediction(prediction: MarketPrediction, currentUserAddress: string): boolean {
    return prediction.user_address.toLowerCase() === currentUserAddress.toLowerCase();
  }
}

// Export singleton instance
export const predictionService = new PredictionService();
