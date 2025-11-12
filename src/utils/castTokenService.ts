import { ethers } from 'ethers';
import { TOKEN_ADDRESSES } from '../config/constants';
import { walletService } from './walletService';
import { toast } from 'sonner';

// Temporary testing mode - set to true to bypass CAST token requirements
const TESTING_MODE = true;

const CAST_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function mint(address to, uint256 amount) external returns (bool)",
  "function burn(uint256 amount) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export interface CastTokenInfo {
  balance: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface CreatorReward {
  marketId: string;
  marketTitle: string;
  createdAt: string;
  resolvedAt: string;
  rewardAmount: string;
  transactionHash: string;
  status: 'pending' | 'claimed' | 'failed';
}

/**
 * Service for interacting with CAST token contracts and tracking creator rewards
 */
export class CastTokenService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    this.initializeProvider();
  }

  async initializeProvider(): Promise<void> {
    const walletConnection = walletService.getConnection();
    if (walletConnection?.provider && walletConnection?.signer) {
      this.provider = walletConnection.provider;
      this.signer = walletConnection.signer;
      this.contract = new ethers.Contract(
        TOKEN_ADDRESSES.CAST_TOKEN,
        CAST_TOKEN_ABI,
        this.provider
      );
    }
  }

  /**
   * Transfer CAST tokens to another address
   */
  async transferTokens(toAddress: string, amount: string): Promise<{ success: boolean; transactionHash: string }> {
    await this.initializeProvider();

    if (!this.contract || !this.signer) {
      throw new Error('Wallet not connected or CAST token contract not available');
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.address) {
      throw new Error('No wallet address available');
    }

    try {
      // Check balance first
      const balance = await this.contract.balanceOf(walletConnection.address);
      const balanceInEther = parseFloat(ethers.formatEther(balance));
      const amountToTransfer = parseFloat(amount);

      console.log('🔍 CAST Transfer Validation:', {
        userBalance: balanceInEther,
        requestedAmount: amountToTransfer,
        hasEnough: balanceInEther >= amountToTransfer
      });

      if (balanceInEther < amountToTransfer) {
        throw new Error(`Insufficient CAST balance for transfer. You have ${balanceInEther.toFixed(2)} CAST but need ${amountToTransfer} CAST.`);
      }

      // Execute the transfer
      const amountInWei = ethers.parseEther(amount);
      const contractWithSigner = this.contract.connect(this.signer);

      console.log('💰 Executing CAST token transfer:', { to: toAddress, amount, amountInWei: amountInWei.toString() });

      const tx = await contractWithSigner.transfer(toAddress, amountInWei);
      console.log('📤 CAST transfer transaction sent:', tx.hash);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('CAST token transfer failed:', error);
      throw error;
    }
  }

  /**
   * Mint CAST tokens to a specific address (admin only)
   */
  async mintTokens(toAddress: string, amount: string): Promise<{ success: boolean; transactionHash: string }> {
    await this.initializeProvider();

    if (!this.contract || !this.signer) {
      throw new Error('Wallet not connected or CAST token contract not available');
    }

    try {
      const amountInWei = ethers.parseEther(amount);
      const contractWithSigner = this.contract.connect(this.signer);

      console.log('🏭 Minting CAST tokens:', { to: toAddress, amount, amountInWei: amountInWei.toString() });

      const tx = await contractWithSigner.mint(toAddress, amountInWei);
      console.log('📤 CAST minting transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ CAST tokens minted successfully:', receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('CAST token minting failed:', error);
      throw error;
    }
  }

  /**
   * Get CAST token information for the connected wallet
   */
  async getTokenInfo(): Promise<CastTokenInfo> {
    await this.initializeProvider();

    if (!this.contract || !this.provider) {
      throw new Error('Wallet not connected or CAST token contract not available');
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.address) {
      throw new Error('No wallet address available');
    }

    try {
      const [balance, symbol, decimals, totalSupply] = await Promise.all([
        this.contract.balanceOf(walletConnection.address),
        this.contract.symbol(),
        this.contract.decimals(),
        this.contract.totalSupply()
      ]);

      return {
        balance: ethers.formatEther(balance),
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatEther(totalSupply)
      };
    } catch (error) {
      console.error('Failed to get CAST token info:', error);
      throw new Error('Failed to fetch CAST token information');
    }
  }

  /**
   * Get CAST balance for a specific address
   */
  async getBalance(address: string): Promise<string> {
    // Testing mode bypass - return test balance
    if (TESTING_MODE) {
      console.log('🧪 TESTING_MODE: Returning test CAST balance of 500');
      return '500.0';
    }

    await this.initializeProvider();

    if (!this.contract) {
      return '0';
    }

    try {
      const balance = await this.contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get CAST balance:', error);
      return '0';
    }
  }

  /**
   * Transfer CAST tokens to another address
   */
  async transfer(to: string, amount: string): Promise<string> {
    await this.initializeProvider();

    if (!this.contract || !this.provider) {
      throw new Error('Wallet not connected');
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.signer) {
      throw new Error('No signer available');
    }

    try {
      const contractWithSigner = this.contract.connect(walletConnection.signer);
      const amountWei = ethers.parseEther(amount);

      const tx = await contractWithSigner.transfer(to, amountWei);

      toast.loading(`Transferring ${amount} CAST tokens...`, {
        id: 'cast-transfer'
      });

      const receipt = await tx.wait();

      toast.success(`Successfully transferred ${amount} CAST tokens!`, {
        id: 'cast-transfer'
      });

      return receipt.hash;
    } catch (error: any) {
      console.error('CAST transfer failed:', error);
      toast.error(`Transfer failed: ${error.message}`, {
        id: 'cast-transfer'
      });
      throw error;
    }
  }

  /**
   * Approve CAST tokens for spending by another contract
   */
  async approve(spender: string, amount: string): Promise<string> {
    await this.initializeProvider();

    if (!this.contract || !this.provider) {
      throw new Error('Wallet not connected');
    }

    const walletConnection = walletService.getConnection();
    if (!walletConnection?.signer) {
      throw new Error('No signer available');
    }

    try {
      const contractWithSigner = this.contract.connect(walletConnection.signer);
      const amountWei = ethers.parseEther(amount);
      const userAddress = await walletConnection.signer.getAddress();

      // Check current allowance first to avoid unnecessary approval
      const currentAllowance = await this.contract.allowance(userAddress, spender);

      // If already approved for sufficient amount, skip approval
      if (currentAllowance >= amountWei) {
        console.log('✅ Already approved for sufficient amount, skipping approval');
        toast.success('CAST tokens already approved', {
          id: 'cast-approve'
        });
        return 'already-approved';
      }

      toast.loading(`Approving ${amount} CAST tokens...`, {
        id: 'cast-approve'
      });

      // Try to send approval transaction with explicit gas limit to avoid RPC estimation errors
      const tx = await contractWithSigner.approve(spender, amountWei, {
        gasLimit: 100000 // Explicit gas limit
      });

      const receipt = await tx.wait();

      toast.success(`Successfully approved ${amount} CAST tokens!`, {
        id: 'cast-approve'
      });

      return receipt.hash;
    } catch (error: any) {
      console.error('CAST approval failed:', error);

      // Provide more helpful error messages based on error type
      let errorMessage = 'Approval failed';
      if (error.message?.includes('RPC endpoint')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('user rejected') || error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient HBAR for gas fees';
      } else {
        errorMessage = error.shortMessage || error.message || 'Unknown error';
      }

      toast.error(`Approval failed: ${errorMessage}`, {
        id: 'cast-approve'
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Check allowance for a spender
   */
  async getAllowance(owner: string, spender: string): Promise<string> {
    await this.initializeProvider();

    if (!this.contract) {
      return '0';
    }

    try {
      const allowance = await this.contract.allowance(owner, spender);
      return ethers.formatEther(allowance);
    } catch (error) {
      console.error('Failed to get CAST allowance:', error);
      return '0';
    }
  }

  /**
   * Get creator rewards for the connected wallet
   * Note: This would typically query events or a backend service
   */
  async getCreatorRewards(): Promise<CreatorReward[]> {
    const walletConnection = walletService.getConnection();
    if (!walletConnection?.address) {
      return [];
    }

    // This is a mock implementation. In production, you would:
    // 1. Query MarketCreated events from the factory
    // 2. Check which markets were created by this address
    // 3. Query FinalResolution events to see which are resolved
    // 4. Calculate pending/claimed rewards

    try {
      // For now, return mock data showing potential structure
      return [
        {
          marketId: 'sample-market-1',
          marketTitle: 'Will Bitcoin reach $100k by end of 2024?',
          createdAt: '2024-01-15T10:00:00Z',
          resolvedAt: '2024-01-20T15:30:00Z',
          rewardAmount: '100',
          transactionHash: '0x1234...5678',
          status: 'claimed'
        }
      ];
    } catch (error) {
      console.error('Failed to get creator rewards:', error);
      return [];
    }
  }

  /**
   * Calculate pending creator rewards
   * This would check resolved markets where creator hasn't claimed rewards yet
   */
  async getPendingRewards(): Promise<{ totalPending: string; count: number }> {
    const rewards = await this.getCreatorRewards();
    const pendingRewards = rewards.filter(r => r.status === 'pending');

    const totalPending = pendingRewards.reduce((sum, reward) => {
      return sum + parseFloat(reward.rewardAmount);
    }, 0);

    return {
      totalPending: totalPending.toString(),
      count: pendingRewards.length
    };
  }

  /**
   * Format CAST amount for display
   */
  static formatAmount(amount: string, decimals: number = 3): string {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 1) return num.toFixed(decimals);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Parse CAST amount from string input
   */
  static parseAmount(amount: string): string {
    const cleanAmount = amount.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanAmount);
    return isNaN(num) ? '0' : num.toString();
  }
}

export const castTokenService = new CastTokenService();