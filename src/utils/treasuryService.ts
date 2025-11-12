import { ethers } from 'ethers';
import { walletService } from './walletService';
import { TOKEN_ADDRESSES } from '../config/constants';
import { toast } from 'sonner';

const TREASURY_ABI = [
  "function receiveFees(address token, uint256 amount) external",
  "function withdrawToken(address token, uint256 amount, address to) external",
  "function getBalance(address token) external view returns (uint256)",
  "function tokenBalances(address) external view returns (uint256)",
  "event FeeReceived(address indexed token, uint256 amount, address indexed from)",
  "event TokenWithdrawn(address indexed token, uint256 amount, address indexed to)"
];

const ADMIN_MANAGER_ABI = [
  "function isAdmin(address) external view returns (bool)",
  "function superAdmin() external view returns (address)"
];

export interface TreasuryBalance {
  token: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
}

export interface FeeCollection {
  marketId: string;
  marketTitle: string;
  feeAmount: string;
  token: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * Service for interacting with the Treasury smart contract
 * Handles protocol fee collection and admin treasury management
 */
export class TreasuryService {
  private provider: ethers.BrowserProvider | null = null;
  private treasuryContract: ethers.Contract | null = null;
  private adminContract: ethers.Contract | null = null;

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts(): Promise<void> {
    const walletConnection = walletService.getConnection();
    if (walletConnection?.provider) {
      this.provider = walletConnection.provider;

      // Initialize Treasury contract (address would come from constants)
      if (TOKEN_ADDRESSES.TREASURY_CONTRACT) {
        this.treasuryContract = new ethers.Contract(
          TOKEN_ADDRESSES.TREASURY_CONTRACT,
          TREASURY_ABI,
          this.provider
        );
      }

      // Initialize AdminManager contract
      if (TOKEN_ADDRESSES.ADMIN_MANAGER_CONTRACT) {
        this.adminContract = new ethers.Contract(
          TOKEN_ADDRESSES.ADMIN_MANAGER_CONTRACT,
          ADMIN_MANAGER_ABI,
          this.provider
        );
      }
    }
  }

  /**
   * Check if the connected wallet is an admin
   */
  async isAdmin(): Promise<boolean> {
    await this.initializeContracts();

    if (!this.adminContract || !this.provider) {
      return false;
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.address) {
      return false;
    }

    try {
      return await this.adminContract.isAdmin(walletConnection.address);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Get treasury balance for a specific token
   */
  async getTokenBalance(tokenAddress: string): Promise<string> {
    await this.initializeContracts();

    if (!this.treasuryContract) {
      return '0';
    }

    try {
      const balance = await this.treasuryContract.getBalance(tokenAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get treasury balance:', error);
      return '0';
    }
  }

  /**
   * Get all treasury balances for supported tokens
   */
  async getAllBalances(): Promise<TreasuryBalance[]> {
    const supportedTokens = [
      { address: TOKEN_ADDRESSES.CAST_TOKEN, symbol: 'CAST' },
      // Add more tokens as needed
    ];

    const balances = await Promise.all(
      supportedTokens.map(async (token) => {
        const balance = await this.getTokenBalance(token.address);
        return {
          token: token.address,
          symbol: token.symbol,
          balance,
          balanceFormatted: this.formatBalance(balance, token.symbol)
        };
      })
    );

    return balances.filter(b => parseFloat(b.balance) > 0);
  }

  /**
   * Withdraw tokens from treasury (admin only)
   */
  async withdrawToken(tokenAddress: string, amount: string, recipient: string): Promise<string> {
    await this.initializeContracts();

    if (!this.treasuryContract || !this.provider) {
      throw new Error('Treasury contract not available');
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.signer) {
      throw new Error('No signer available');
    }

    // Check admin permissions
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Only admins can withdraw from treasury');
    }

    try {
      const contractWithSigner = this.treasuryContract.connect(walletConnection.signer);
      const amountWei = ethers.parseEther(amount);

      const tx = await contractWithSigner.withdrawToken(tokenAddress, amountWei, recipient);

      toast.loading(`Withdrawing ${amount} tokens from treasury...`, {
        id: 'treasury-withdraw'
      });

      const receipt = await tx.wait();

      toast.success(`Successfully withdrew ${amount} tokens from treasury!`, {
        id: 'treasury-withdraw'
      });

      return receipt.hash;
    } catch (error: any) {
      console.error('Treasury withdrawal failed:', error);
      toast.error(`Withdrawal failed: ${error.message}`, {
        id: 'treasury-withdraw'
      });
      throw error;
    }
  }

  /**
   * Get fee collection history
   * This would typically query FeeReceived events from the blockchain
   */
  async getFeeHistory(): Promise<FeeCollection[]> {
    await this.initializeContracts();

    if (!this.treasuryContract || !this.provider) {
      return [];
    }

    try {
      // Query FeeReceived events from the past 30 days
      const fromBlock = (await this.provider.getBlockNumber()) - 86400; // Approximate blocks in 30 days
      const filter = this.treasuryContract.filters.FeeReceived();

      const events = await this.treasuryContract.queryFilter(filter, fromBlock);

      return await Promise.all(
        events.map(async (event: any) => {
          const block = await event.getBlock();
          return {
            marketId: `market-${event.transactionHash.slice(-8)}`, // Simplified
            marketTitle: 'Market Resolution Fee', // Would need market mapping
            feeAmount: ethers.formatEther(event.args.amount),
            token: event.args.token,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            transactionHash: event.transactionHash
          };
        })
      );
    } catch (error) {
      console.error('Failed to get fee history:', error);
      return [];
    }
  }

  /**
   * Calculate total fees collected
   */
  async getTotalFeesCollected(): Promise<{ totalFees: string; feeCount: number }> {
    const history = await this.getFeeHistory();

    const totalFees = history.reduce((sum, fee) => {
      return sum + parseFloat(fee.feeAmount);
    }, 0);

    return {
      totalFees: totalFees.toString(),
      feeCount: history.length
    };
  }

  /**
   * Format balance for display
   */
  private formatBalance(balance: string, symbol: string): string {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${symbol}`;
    if (num < 1) return `${num.toFixed(6)} ${symbol}`;
    return `${num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    })} ${symbol}`;
  }

  /**
   * Get treasury analytics
   */
  async getTreasuryAnalytics(): Promise<{
    totalValue: string;
    tokenCount: number;
    monthlyFees: string;
    feeGrowth: string;
  }> {
    const [balances, feeStats] = await Promise.all([
      this.getAllBalances(),
      this.getTotalFeesCollected()
    ]);

    // Calculate total value (simplified - would need price data)
    const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);

    return {
      totalValue: totalValue.toString(),
      tokenCount: balances.length,
      monthlyFees: feeStats.totalFees,
      feeGrowth: '12.5' // Placeholder - would calculate from historical data
    };
  }

  /**
   * Estimate protocol fees for a market resolution
   */
  static estimateProtocolFee(marketVolume: string, feeRate: number = 0.02): string {
    const volume = parseFloat(marketVolume);
    const fee = volume * feeRate;
    return fee.toString();
  }

  /**
   * Check if treasury has sufficient balance for operations
   */
  async checkSufficientBalance(tokenAddress: string, requiredAmount: string): Promise<boolean> {
    const balance = await this.getTokenBalance(tokenAddress);
    return parseFloat(balance) >= parseFloat(requiredAmount);
  }
}

export const treasuryService = new TreasuryService();