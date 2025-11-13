import { ethers } from 'ethers';
import { TOKEN_ADDRESSES } from '../config/constants';

// BuyCAST contract ABI - only the functions we need
const BUYCAST_ABI = [
  "function buyCAST() external payable",
  "function getCastAmount(uint256 bnbAmount) external pure returns (uint256)",
  "function getInfo() external view returns (address castTokenAddress, address treasuryAddress, uint256 exchangeRate, uint256 minPurchase, uint256 maxPurchase, bool isPaused)",
  "function owner() external view returns (address)",
  "function paused() external view returns (bool)",
  "event CastPurchased(address indexed buyer, uint256 bnbAmount, uint256 castAmount)",
  "event RevenueForwarded(address indexed treasury, uint256 amount)"
];

export interface BuyCastInfo {
  castTokenAddress: string;
  treasuryAddress: string;
  exchangeRate: bigint;
  minPurchase: bigint;
  maxPurchase: bigint;
  isPaused: boolean;
}

export interface PurchaseResult {
  success: boolean;
  txHash?: string;
  castAmount?: string;
  bnbAmount?: string;
  error?: string;
}

class BuyCastService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;

  /**
   * Initialize the service with MetaMask provider
   */
  async initialize(): Promise<void> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await this.provider.getSigner();

    this.contract = new ethers.Contract(
      TOKEN_ADDRESSES.BUYCAST_CONTRACT,
      BUYCAST_ABI,
      signer
    );
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.contract || !this.provider) {
      throw new Error('BuyCastService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get contract information (exchange rate, limits, etc.)
   */
  async getContractInfo(): Promise<BuyCastInfo> {
    this.ensureInitialized();

    const info = await this.contract!.getInfo();

    return {
      castTokenAddress: info[0],
      treasuryAddress: info[1],
      exchangeRate: info[2],
      minPurchase: info[3],
      maxPurchase: info[4],
      isPaused: info[5]
    };
  }

  /**
   * Calculate how many CAST tokens will be received for a given BNB amount
   * @param bnbAmount Amount of BNB in ether format (e.g., "0.5")
   * @returns Amount of CAST tokens in ether format
   */
  async calculateCastAmount(bnbAmount: string): Promise<string> {
    this.ensureInitialized();

    try {
      const bnbWei = ethers.parseEther(bnbAmount);
      const castWei = await this.contract!.getCastAmount(bnbWei);
      return ethers.formatEther(castWei);
    } catch (error) {
      console.error('Error calculating CAST amount:', error);
      throw new Error('Failed to calculate CAST amount');
    }
  }

  /**
   * Check if the contract is paused
   */
  async isPaused(): Promise<boolean> {
    this.ensureInitialized();
    return await this.contract!.paused();
  }

  /**
   * Validates network configuration before transaction
   */
  private async validateNetworkBeforeTransaction(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    console.log('🔍 Pre-transaction network validation...');

    // Check current chain ID
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Current chainId:', chainId);
    console.log('Expected chainId: 0x61 (BSC Testnet)');

    if (chainId !== '0x61') {
      throw new Error(`Wrong network. Current: ${chainId}, Expected: 0x61 (BSC Testnet)`);
    }

    // Additional network validation
    try {
      const networkVersion = await window.ethereum.request({ method: 'net_version' });
      console.log('Network version:', networkVersion);

      if (networkVersion !== '97') {
        console.warn('⚠️ Network version mismatch:', networkVersion, 'expected 97');
      }
    } catch (e) {
      console.warn('Could not validate network version:', e);
    }

    // Log MetaMask state for diagnostics
    console.log('📊 MetaMask diagnostic info:');
    console.log('  - ethereum.chainId:', window.ethereum.chainId);
    console.log('  - ethereum.networkVersion:', window.ethereum.networkVersion);
    console.log('  - ethereum.selectedAddress:', window.ethereum.selectedAddress);

    // Verify provider matches
    if (this.provider) {
      const network = await this.provider.getNetwork();
      console.log('  - ethers provider chainId:', network.chainId.toString());

      if (Number(network.chainId) !== 97) {
        throw new Error(`Provider network mismatch. Provider is on chain ${network.chainId}, expected 97`);
      }
    }

    console.log('✅ Network validation passed');
  }

  /**
   * Purchase CAST tokens with BNB
   * @param bnbAmount Amount of BNB to spend (in ether format, e.g., "0.5")
   * @returns Purchase result with transaction hash and amounts
   */
  async purchaseCast(bnbAmount: string): Promise<PurchaseResult> {
    this.ensureInitialized();

    try {
      // CRITICAL: Validate network configuration before any transaction
      await this.validateNetworkBeforeTransaction();

      // Validate amount
      const bnbWei = ethers.parseEther(bnbAmount);
      const info = await this.getContractInfo();

      if (info.isPaused) {
        return {
          success: false,
          error: 'BuyCAST contract is currently paused. Please try again later.'
        };
      }

      if (bnbWei < info.minPurchase) {
        const minBnb = ethers.formatEther(info.minPurchase);
        return {
          success: false,
          error: `Amount below minimum. Minimum purchase is ${minBnb} BNB.`
        };
      }

      if (bnbWei > info.maxPurchase) {
        const maxBnb = ethers.formatEther(info.maxPurchase);
        return {
          success: false,
          error: `Amount above maximum. Maximum purchase is ${maxBnb} BNB.`
        };
      }

      // Calculate expected CAST amount
      const expectedCast = await this.calculateCastAmount(bnbAmount);

      // Execute purchase
      console.log(`💰 Purchasing CAST with ${bnbAmount} BNB...`);
      console.log('📝 Transaction parameters:', {
        contract: this.contract!.target,
        method: 'buyCAST()',
        value: bnbWei.toString(),
        valueInBNB: bnbAmount,
        expectedCast: expectedCast
      });

      const tx = await this.contract!.buyCAST({ value: bnbWei });

      console.log('✅ Transaction submitted:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log('Purchase successful!');
        return {
          success: true,
          txHash: receipt.hash,
          castAmount: expectedCast,
          bnbAmount: bnbAmount
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed. Please check the transaction on BSCScan.'
        };
      }
    } catch (error: any) {
      console.error('❌ Error purchasing CAST:', error);

      // Log detailed error information for debugging
      console.error('📊 Error details:', {
        code: error.code,
        message: error.message,
        data: error.data,
        stack: error.stack?.split('\n').slice(0, 3)
      });

      // Special handling for MetaMask internal errors
      if (error.code === -32603 || error.code === 'UNKNOWN_ERROR') {
        console.error('🔍 MetaMask internal error detected');
        console.error('Error data:', JSON.stringify(error.data, null, 2));

        // Check if it's a network configuration error
        if (error.message?.includes('chainId') ||
            error.message?.includes('networkController') ||
            error.data?.cause?.message?.includes('chainId')) {

          return {
            success: false,
            error: 'MetaMask network configuration error. Please try these steps:\n\n' +
                   '1. Disconnect your wallet\n' +
                   '2. Remove BSC Testnet from MetaMask networks\n' +
                   '3. Reconnect your wallet (app will add BSC Testnet correctly)\n\n' +
                   'If the issue persists, check NETWORK_TROUBLESHOOTING.md'
          };
        }

        return {
          success: false,
          error: 'MetaMask internal error. Please refresh the page and try again. ' +
                 'If the issue persists, check the console for detailed error information.'
        };
      }

      // Parse error message
      let errorMessage = 'Failed to purchase CAST tokens.';

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user.';
      } else if (error.message) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient BNB balance to complete purchase.';
        } else if (error.message.includes('Amount below minimum')) {
          errorMessage = error.message;
        } else if (error.message.includes('Amount above maximum')) {
          errorMessage = error.message;
        } else if (error.message.includes('Contract is paused')) {
          errorMessage = 'BuyCAST contract is currently paused. Please try again later.';
        } else if (error.message.includes('Wrong network')) {
          errorMessage = error.message + '\n\nPlease disconnect and reconnect your wallet.';
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return TOKEN_ADDRESSES.BUYCAST_CONTRACT;
  }

  /**
   * Get BSCScan link for the contract
   */
  getBSCScanLink(): string {
    return `https://testnet.bscscan.com/address/${TOKEN_ADDRESSES.BUYCAST_CONTRACT}`;
  }

  /**
   * Get BSCScan link for a transaction
   */
  getTxBSCScanLink(txHash: string): string {
    return `https://testnet.bscscan.com/tx/${txHash}`;
  }
}

// Export singleton instance
export const buyCastService = new BuyCastService();
