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
  "function createMarket(string memory question, uint256 endTime) external payable returns (bytes32)",
  "function markets(bytes32 id) external view returns (address)",
  "function allMarkets(uint256 index) external view returns (address)",
  "function isValidMarket(address market) external view returns (bool)",
  "event MarketCreated(bytes32 indexed id, address market, string question)"
];

// Get factory address from environment
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS;

// Market creation collateral in BNB (0.001 BNB = ~$0.60 at $600/BNB)
const MARKET_CREATION_COLLATERAL = "0.001"; // BNB

export interface CreateMarketParams {
  question: string;
  endTime: Date;
  category: string;
  allowEarlyResolution?: boolean;
}

export interface CreateMarketResult {
  success: boolean;
  marketId?: string;
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
   * Create a new prediction market on BSC with collateral payment
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

      // Convert collateral to wei
      const collateralWei = ethers.parseEther(MARKET_CREATION_COLLATERAL);

      console.log('📝 Calling factory.createMarket with:', {
        question: params.question,
        endTime: endTimeUnix,
        collateral: `${MARKET_CREATION_COLLATERAL} BNB`
      });

      // Call createMarket on the factory contract with BNB collateral
      toast.info(`Sending transaction with ${MARKET_CREATION_COLLATERAL} BNB collateral...`);

      const tx = await factory.createMarket(
        params.question,
        endTimeUnix,
        {
          value: collateralWei // Send BNB as collateral
        }
      );

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed:', receipt);

      // Find the MarketCreated event to get the market ID and address
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
          error: 'Market created but ID/address not found in logs'
        };
      }

      const marketId = marketCreatedEvent.args.id;
      const marketAddress = marketCreatedEvent.args.market;

      console.log('🎉 Market created:');
      console.log('   ID:', marketId);
      console.log('   Address:', marketAddress);

      return {
        success: true,
        marketId,
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
          error: `Insufficient BNB. You need at least ${MARKET_CREATION_COLLATERAL} BNB plus gas fees.`
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
   * Get the collateral amount required for market creation
   */
  getCollateralAmount(): string {
    return MARKET_CREATION_COLLATERAL;
  }

  /**
   * Get market address by ID
   */
  async getMarketById(marketId: string): Promise<string | null> {
    try {
      const factory = await this.getFactoryContract();
      return await factory.markets(marketId);
    } catch (error) {
      console.error('Failed to get market by ID:', error);
      return null;
    }
  }

  /**
   * Check if a market address is valid
   */
  async isValidMarket(marketAddress: string): Promise<boolean> {
    try {
      const factory = await this.getFactoryContract();
      return await factory.isValidMarket(marketAddress);
    } catch (error) {
      console.error('Failed to check market validity:', error);
      return false;
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
