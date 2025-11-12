/**
 * PredictionMarketFactory Service for BSC
 *
 * Handles market creation through the deployed factory contract
 */

import { ethers } from 'ethers';
import { walletService } from '../utils/walletService';
import { toast } from 'sonner';

// Factory contract ABI - only the functions we need
const FACTORY_ABI = [
  "function createMarket(string memory question, uint256 endTime, string memory category, bool allowEarlyResolution) external returns (address)",
  "function marketCount() external view returns (uint256)",
  "function markets(uint256 index) external view returns (address)",
  "function userMarkets(address user, uint256 index) external view returns (address)",
  "function getUserMarketCount(address user) external view returns (uint256)"
];

// Get factory address from environment
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS;

export interface CreateMarketParams {
  question: string;
  endTime: Date;
  category: string;
  allowEarlyResolution?: boolean;
}

export interface CreateMarketResult {
  success: boolean;
  marketAddress?: string;
  transactionHash?: string;
  error?: string;
}

class FactoryService {
  private factoryContract: ethers.Contract | null = null;

  /**
   * Initialize the factory contract
   */
  private async getFactoryContract(): Promise<ethers.Contract> {
    if (!FACTORY_ADDRESS) {
      throw new Error('Factory address not configured. Please check VITE_FACTORY_ADDRESS in .env');
    }

    const connection = walletService.getConnection();
    if (!connection || !connection.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!this.factoryContract) {
      this.factoryContract = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        connection.signer
      );
    }

    return this.factoryContract;
  }

  /**
   * Create a new prediction market on BSC
   */
  async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    try {
      console.log('🏭 Creating market on BSC factory:', params);

      // Validate inputs
      if (!params.question || params.question.trim().length < 10) {
        return {
          success: false,
          error: 'Question must be at least 10 characters'
        };
      }

      if (params.endTime <= new Date()) {
        return {
          success: false,
          error: 'End time must be in the future'
        };
      }

      // Get factory contract
      const factory = await this.getFactoryContract();

      // Convert end time to Unix timestamp
      const endTimeUnix = Math.floor(params.endTime.getTime() / 1000);

      console.log('📝 Calling factory.createMarket with:', {
        question: params.question,
        endTime: endTimeUnix,
        category: params.category,
        allowEarlyResolution: params.allowEarlyResolution ?? false
      });

      // Call createMarket on the factory contract
      toast.info('Sending transaction to BSC...');

      const tx = await factory.createMarket(
        params.question,
        endTimeUnix,
        params.category || 'General',
        params.allowEarlyResolution ?? false
      );

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed:', receipt);

      // Find the MarketCreated event to get the market address
      const marketCreatedEvent = receipt.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event?.name === 'MarketCreated');

      if (!marketCreatedEvent) {
        console.warn('⚠️ MarketCreated event not found in transaction logs');
        return {
          success: true,
          transactionHash: receipt.hash,
          error: 'Market created but address not found in logs'
        };
      }

      const marketAddress = marketCreatedEvent.args.market;
      console.log('🎉 Market created at address:', marketAddress);

      return {
        success: true,
        marketAddress,
        transactionHash: receipt.hash
      };

    } catch (error: any) {
      console.error('❌ Failed to create market:', error);

      // Handle specific errors
      if (error.code === 'ACTION_REJECTED') {
        return {
          success: false,
          error: 'Transaction rejected by user'
        };
      }

      if (error.code === 'INSUFFICIENT_FUNDS') {
        return {
          success: false,
          error: 'Insufficient BNB for gas fees'
        };
      }

      if (error.code === 'NETWORK_ERROR') {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to create market'
      };
    }
  }

  /**
   * Get total number of markets created
   */
  async getMarketCount(): Promise<number> {
    try {
      const factory = await this.getFactoryContract();
      const count = await factory.marketCount();
      return Number(count);
    } catch (error) {
      console.error('Failed to get market count:', error);
      return 0;
    }
  }

  /**
   * Get market address by index
   */
  async getMarketByIndex(index: number): Promise<string | null> {
    try {
      const factory = await this.getFactoryContract();
      return await factory.markets(index);
    } catch (error) {
      console.error('Failed to get market by index:', error);
      return null;
    }
  }

  /**
   * Get user's market count
   */
  async getUserMarketCount(userAddress: string): Promise<number> {
    try {
      const factory = await this.getFactoryContract();
      const count = await factory.getUserMarketCount(userAddress);
      return Number(count);
    } catch (error) {
      console.error('Failed to get user market count:', error);
      return 0;
    }
  }

  /**
   * Get user's market by index
   */
  async getUserMarket(userAddress: string, index: number): Promise<string | null> {
    try {
      const factory = await this.getFactoryContract();
      return await factory.userMarkets(userAddress, index);
    } catch (error) {
      console.error('Failed to get user market:', error);
      return null;
    }
  }

  /**
   * Check if factory service is configured
   */
  isConfigured(): boolean {
    return !!FACTORY_ADDRESS && !!walletService.isConnected();
  }
}

export const factoryService = new FactoryService();
