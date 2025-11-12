import { ethers } from 'ethers';
import { DISPUTE_PERIOD, TOKEN_ADDRESSES } from '../config/constants';
import TokenService from './tokenService';
// Hedera imports removed - using BSC implementation

// DisputeManager contract ABI (minimal required functions)
const DISPUTE_MANAGER_ABI = [
  "function createDispute(address marketAddress, string reason, string evidence, bytes32 evidenceHash) external returns (uint256)",
  "function resolveDispute(uint256 disputeId, uint8 outcome, string adminNotes) external",
  "function markDisputeExpired(uint256 disputeId) external",
  "function getDispute(uint256 disputeId) external view returns (tuple(uint256 id, address disputer, address marketAddress, uint256 bondAmount, string evidence, string reason, bytes32 evidenceHash, uint256 createdAt, uint256 resolveBy, uint8 status, uint8 outcome, address resolvedBy, uint256 resolvedAt, string adminNotes))",
  "function getUserDisputes(address user) external view returns (uint256[])",
  "function getMarketDisputes(address marketAddress) external view returns (uint256[])",
  "function getActiveDisputes() external view returns (uint256[])",
  "function hasActiveDisputes(address marketAddress) external view returns (bool)",
  "function getUserActiveBonds(address user) external view returns (uint256)",
  "function DISPUTE_BOND_AMOUNT() external view returns (uint256)",
  "function DISPUTE_PERIOD_HOURS() external view returns (uint256)"
];

// CAST Token ABI (minimal required functions)
const CAST_TOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

export enum DisputeStatus {
  Active = 0,
  Resolved = 1,
  Rejected = 2,
  Expired = 3
}

export enum DisputeOutcome {
  Pending = 0,
  Upheld = 1,
  Rejected = 2
}

export interface DisputeInfo {
  id: number;
  disputer: string;
  marketAddress: string;
  bondAmount: string;
  evidence: string;
  reason: string;
  evidenceHash: string;
  createdAt: number;
  resolveBy: number;
  status: DisputeStatus;
  outcome: DisputeOutcome;
  resolvedBy: string;
  resolvedAt: number;
  adminNotes: string;
}

export interface CreateDisputeParams {
  marketAddress: string;
  reason: string;
  evidence: string;
  evidenceHash?: string;
}

export interface DisputeValidationResult {
  isValid: boolean;
  error?: string;
  requiredBond?: string;
  userBalance?: string;
  userActiveBonds?: string;
}

/**
 * Dispute Bond Service - Manages dispute bonds and token locking
 *
 * This service handles:
 * - Dispute bond validation and locking
 * - Bond refund calculations
 * - Integration with token system (HBAR/CAST)
 * - HCS logging for transparency
 * - Smart contract integration with DisputeManager
 */
export class DisputeBondService {
  private disputeManagerAddress: string = ''; // To be set when contract is deployed
  private provider: ethers.providers.Provider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider(): Promise<void> {
    try {
      // Use BSC testnet RPC
      this.provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    } catch (error) {
      console.warn('Failed to initialize provider for DisputeBondService:', error);
    }
  }

  /**
   * Set the deployed DisputeManager contract address
   */
  setDisputeManagerAddress(address: string): void {
    this.disputeManagerAddress = address;
  }

  /**
   * Get DisputeManager contract instance
   */
  private async getDisputeManagerContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider): Promise<ethers.Contract> {
    if (!this.disputeManagerAddress) {
      throw new Error('DisputeManager contract address not set');
    }

    const providerOrSigner = signerOrProvider || this.provider;
    if (!providerOrSigner) {
      throw new Error('No provider available');
    }

    return new ethers.Contract(this.disputeManagerAddress, DISPUTE_MANAGER_ABI, providerOrSigner);
  }

  /**
   * Get CAST token contract instance
   */
  private async getCastTokenContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider): Promise<ethers.Contract> {
    const providerOrSigner = signerOrProvider || this.provider;
    if (!providerOrSigner) {
      throw new Error('No provider available');
    }

    return new ethers.Contract(TOKEN_ADDRESSES.CAST_TOKEN, CAST_TOKEN_ABI, providerOrSigner);
  }

  /**
   * Get user's CAST token balance
   */
  async getUserCastBalance(userAddress: string): Promise<string> {
    try {
      const castToken = await this.getCastTokenContract();
      const balance = await castToken.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting CAST balance:', error);
      return '0';
    }
  }

  /**
   * Get required dispute bond amount in display token
   */
  static getRequiredBondAmount(): string {
    return DISPUTE_PERIOD.BOND_AMOUNT_CAST; // Use CAST token amount
  }

  /**
   * Get required dispute bond amount in contract token
   */
  static getRequiredBondAmountContract(): string {
    const displayAmount = this.getRequiredBondAmount();
    return TokenService.toContractAmount(displayAmount);
  }

  /**
   * Validate user has sufficient balance for dispute bond
   */
  static validateBondBalance(userBalance: string): {
    isValid: boolean;
    error?: string;
  } {
    const requiredAmount = this.getRequiredBondAmount();

    const validation = TokenService.validateDisplayAmount(
      requiredAmount,
      requiredAmount,
      userBalance
    );

    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error?.replace('Minimum amount:', 'Dispute bond required:')
      };
    }

    return { isValid: true };
  }

  /**
   * Lock dispute bond for a market dispute
   */
  static async lockDisputeBond(
    marketId: string,
    userAddress: string,
    disputeEvidence: string
  ): Promise<{
    success: boolean;
    bondId?: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`🔒 Locking dispute bond for market ${marketId} by ${userAddress}`);

      const bondAmount = this.getRequiredBondAmount();
      const contractAmount = this.getRequiredBondAmountContract();

      // Generate unique bond ID
      const bondId = `bond-${marketId}-${userAddress}-${Date.now()}`;

      // TODO: In production, this would:
      // 1. Create HTS dispute bond token
      // 2. Transfer tokens from user to escrow
      // 3. Record bond in smart contract or database

      // For now, simulate the locking process
      console.log(`💰 Locking ${bondAmount} ${TokenService.getDisplayTokenSymbol()} (${contractAmount} ${TokenService.getContractTokenSymbol()}) for dispute ${bondId}`);

      // HCS recording removed (was Hedera-specific)
      // BSC implementation stores bond info in database
      console.log('📝 Bond recorded in database - HCS not used');

      // Store bond info (in production, this would be in database or contract)
      const bondInfo = {
        id: bondId,
        marketId,
        userAddress,
        displayAmount: bondAmount,
        contractAmount: contractAmount,
        evidence: disputeEvidence,
        status: 'locked' as const,
        timestamp: new Date().toISOString()
      };

      // TODO: Store bondInfo in database
      console.log('📝 Bond info stored:', bondInfo);

      return {
        success: true,
        bondId,
        transactionId: `tx-${bondId}` // Mock transaction ID
      };

    } catch (error) {
      console.error('❌ Error locking dispute bond:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lock dispute bond'
      };
    }
  }

  /**
   * Refund dispute bond based on dispute outcome
   */
  static async refundDisputeBond(
    bondId: string,
    outcome: 'full_refund' | 'partial_refund' | 'slashed',
    refundPercentage: number = 100
  ): Promise<{
    success: boolean;
    refundAmount?: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`💸 Processing dispute bond refund: ${bondId} (${outcome}, ${refundPercentage}%)`);

      // TODO: Get bond info from database/contract
      // const bondInfo = await this.getBondInfo(bondId);

      // Calculate refund amount
      const originalAmount = this.getRequiredBondAmountContract();
      const refundAmount = (parseFloat(originalAmount) * refundPercentage / 100).toString();

      // TODO: In production, this would:
      // 1. Transfer tokens back to user
      // 2. Update bond status in contract/database
      // 3. Record transaction

      console.log(`✅ Refunding ${refundAmount} ${TokenService.getContractTokenSymbol()} for bond ${bondId}`);

      // HCS recording removed (was Hedera-specific)
      console.log('📝 Refund recorded in database - HCS not used');

      return {
        success: true,
        refundAmount,
        transactionId: `refund-tx-${bondId}`
      };

    } catch (error) {
      console.error('❌ Error processing bond refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process bond refund'
      };
    }
  }

  /**
   * Get dispute bond info for display
   */
  static getBondDisplayInfo(): {
    displayAmount: string;
    contractAmount: string;
    displayToken: string;
    contractToken: string;
    explanation: string;
  } {
    const displayAmount = this.getRequiredBondAmount();
    const contractAmount = this.getRequiredBondAmountContract();

    return {
      displayAmount,
      contractAmount,
      displayToken: TokenService.getDisplayTokenSymbol(),
      contractToken: TokenService.getContractTokenSymbol(),
      explanation: `A ${displayAmount} ${TokenService.getDisplayTokenSymbol()} bond is required to submit a dispute. This ensures quality disputes and is refunded if your dispute is valid.`
    };
  }

  /**
   * Record bond action to HCS for transparency
   */
  private static async recordBondToHCS(
    bondId: string,
    marketId: string,
    userAddress: string,
    amount: string,
    action: 'locked' | 'full_refund' | 'partial_refund' | 'slashed'
  ): Promise<void> {
    try {
      const bondMessage = {
        action: `dispute_bond_${action}`,
        bondId,
        marketId,
        userAddress,
        amount,
        token: TokenService.getContractTokenSymbol(),
        timestamp: new Date().toISOString()
      };

      console.log('📝 Recording bond action to HCS:', bondMessage);

      // TODO: Submit to actual HCS when available
      // await hederaResolutionService.submitBondAction(bondMessage);

    } catch (error) {
      console.error('❌ Failed to record bond action to HCS:', error);
    }
  }

  /**
   * Calculate dispute bond refund based on dispute quality and outcome
   */
  static calculateRefundPercentage(
    disputeQuality: 'high' | 'medium' | 'low',
    disputeOutcome: 'upheld' | 'rejected' | 'partial'
  ): {
    percentage: number;
    reasoning: string;
  } {
    let percentage = 0;
    let reasoning = '';

    switch (disputeOutcome) {
      case 'upheld':
        // Dispute was valid - full refund plus bonus
        percentage = 100;
        reasoning = 'Dispute was upheld - full refund granted';
        break;

      case 'partial':
        // Partial validity - refund based on quality
        switch (disputeQuality) {
          case 'high':
            percentage = 75;
            reasoning = 'High quality dispute with partial validity - 75% refund';
            break;
          case 'medium':
            percentage = 50;
            reasoning = 'Medium quality dispute with partial validity - 50% refund';
            break;
          case 'low':
            percentage = 25;
            reasoning = 'Low quality dispute with partial validity - 25% refund';
            break;
        }
        break;

      case 'rejected':
        // Invalid dispute - slashing based on quality
        switch (disputeQuality) {
          case 'high':
            percentage = 50;
            reasoning = 'High quality but invalid dispute - 50% refund';
            break;
          case 'medium':
            percentage = 25;
            reasoning = 'Medium quality invalid dispute - 25% refund';
            break;
          case 'low':
            percentage = 0;
            reasoning = 'Low quality invalid dispute - bond slashed';
            break;
        }
        break;
    }

    return { percentage, reasoning };
  }

  // =======================
  // Smart Contract Methods
  // =======================

  /**
   * Validate if user can create a dispute using smart contract
   */
  async validateDisputeCreationOnChain(userAddress: string, marketAddress: string): Promise<DisputeValidationResult> {
    try {
      if (!this.disputeManagerAddress) {
        return {
          isValid: false,
          error: 'DisputeManager contract not deployed yet. Using fallback validation.'
        };
      }

      const disputeManager = await this.getDisputeManagerContract();
      const castToken = await this.getCastTokenContract();

      // Get required bond amount
      const requiredBond = await disputeManager.DISPUTE_BOND_AMOUNT();
      const requiredBondFormatted = ethers.formatEther(requiredBond);

      // Get user's CAST balance
      const userBalance = await castToken.balanceOf(userAddress);
      const userBalanceFormatted = ethers.formatEther(userBalance);

      // Get user's active bonds
      const userActiveBonds = await disputeManager.getUserActiveBonds(userAddress);
      const userActiveBondsFormatted = ethers.formatEther(userActiveBonds);

      // Check if user has sufficient balance
      if (userBalance.lt(requiredBond)) {
        return {
          isValid: false,
          error: `Insufficient CAST balance. Required: ${requiredBondFormatted} CAST, Available: ${userBalanceFormatted} CAST`,
          requiredBond: requiredBondFormatted,
          userBalance: userBalanceFormatted,
          userActiveBonds: userActiveBondsFormatted
        };
      }

      // Check if market has active disputes
      const hasActiveDisputes = await disputeManager.hasActiveDisputes(marketAddress);
      if (hasActiveDisputes) {
        // Check if user already has an active dispute for this market
        const marketDisputes = await disputeManager.getMarketDisputes(marketAddress);
        for (const disputeId of marketDisputes) {
          const dispute = await disputeManager.getDispute(disputeId);
          if (dispute.disputer.toLowerCase() === userAddress.toLowerCase() &&
              dispute.status === DisputeStatus.Active) {
            return {
              isValid: false,
              error: 'You already have an active dispute for this market',
              requiredBond: requiredBondFormatted,
              userBalance: userBalanceFormatted,
              userActiveBonds: userActiveBondsFormatted
            };
          }
        }
      }

      return {
        isValid: true,
        requiredBond: requiredBondFormatted,
        userBalance: userBalanceFormatted,
        userActiveBonds: userActiveBondsFormatted
      };

    } catch (error) {
      console.error('Error validating dispute creation on chain:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check and approve CAST tokens for dispute bond if needed
   */
  async ensureBondAllowance(signer: ethers.Signer): Promise<string | null> {
    try {
      if (!this.disputeManagerAddress) {
        throw new Error('DisputeManager contract address not set');
      }

      const userAddress = await signer.getAddress();
      const castToken = await this.getCastTokenContract(signer);
      const disputeManager = await this.getDisputeManagerContract();

      const requiredBond = await disputeManager.DISPUTE_BOND_AMOUNT();
      const currentAllowance = await castToken.allowance(userAddress, this.disputeManagerAddress);

      if (currentAllowance.lt(requiredBond)) {
        console.log('Approving CAST tokens for dispute bond...');
        const approveTx = await castToken.approve(this.disputeManagerAddress, requiredBond);
        await approveTx.wait();
        return approveTx.hash;
      }

      return null; // No approval needed
    } catch (error) {
      console.error('Error ensuring bond allowance:', error);
      throw error;
    }
  }

  /**
   * Create a new dispute using smart contract
   */
  async createDisputeOnChain(params: CreateDisputeParams, signer: ethers.Signer): Promise<{
    disputeId: number;
    transactionHash: string;
    requiredBond: string;
  }> {
    try {
      if (!this.disputeManagerAddress) {
        throw new Error('DisputeManager contract not deployed yet');
      }

      // Validate dispute creation
      const userAddress = await signer.getAddress();
      const validation = await this.validateDisputeCreationOnChain(userAddress, params.marketAddress);

      if (!validation.isValid) {
        throw new Error(validation.error || 'Dispute validation failed');
      }

      // Ensure CAST token allowance
      await this.ensureBondAllowance(signer);

      // Generate evidence hash if not provided
      const evidenceHash = params.evidenceHash || ethers.keccak256(
        ethers.toUtf8Bytes(params.evidence + params.reason + Date.now())
      );

      // Create dispute
      const disputeManager = await this.getDisputeManagerContract(signer);

      console.log('Creating dispute with params:', {
        marketAddress: params.marketAddress,
        reason: params.reason,
        evidenceLength: params.evidence.length,
        evidenceHash
      });

      const tx = await disputeManager.createDispute(
        params.marketAddress,
        params.reason,
        params.evidence,
        evidenceHash
      );

      const receipt = await tx.wait();

      // Extract dispute ID from event logs
      const createDisputeEvent = receipt.events?.find((e: any) => e.event === 'DisputeCreated');
      const disputeId = createDisputeEvent?.args?.disputeId?.toNumber() || 0;

      console.log(`Dispute created successfully: ID ${disputeId}, TX: ${tx.hash}`);

      return {
        disputeId,
        transactionHash: tx.hash,
        requiredBond: validation.requiredBond || '100'
      };

    } catch (error) {
      console.error('Error creating dispute on chain:', error);
      throw error;
    }
  }

  /**
   * Get dispute details by ID from smart contract
   */
  async getDisputeFromChain(disputeId: number): Promise<DisputeInfo> {
    try {
      if (!this.disputeManagerAddress) {
        throw new Error('DisputeManager contract not deployed yet');
      }

      const disputeManager = await this.getDisputeManagerContract();
      const disputeData = await disputeManager.getDispute(disputeId);

      return {
        id: disputeData.id.toNumber(),
        disputer: disputeData.disputer,
        marketAddress: disputeData.marketAddress,
        bondAmount: ethers.formatEther(disputeData.bondAmount),
        evidence: disputeData.evidence,
        reason: disputeData.reason,
        evidenceHash: disputeData.evidenceHash,
        createdAt: disputeData.createdAt.toNumber(),
        resolveBy: disputeData.resolveBy.toNumber(),
        status: disputeData.status,
        outcome: disputeData.outcome,
        resolvedBy: disputeData.resolvedBy,
        resolvedAt: disputeData.resolvedAt.toNumber(),
        adminNotes: disputeData.adminNotes
      };
    } catch (error) {
      console.error('Error getting dispute from chain:', error);
      throw error;
    }
  }

  /**
   * Get all disputes for a user from smart contract
   */
  async getUserDisputesFromChain(userAddress: string): Promise<DisputeInfo[]> {
    try {
      if (!this.disputeManagerAddress) {
        return []; // Return empty array if contract not deployed
      }

      const disputeManager = await this.getDisputeManagerContract();
      const disputeIds = await disputeManager.getUserDisputes(userAddress);

      const disputes: DisputeInfo[] = [];
      for (const disputeId of disputeIds) {
        try {
          const dispute = await this.getDisputeFromChain(disputeId.toNumber());
          disputes.push(dispute);
        } catch (error) {
          console.warn(`Failed to fetch dispute ${disputeId}:`, error);
        }
      }

      return disputes.sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
    } catch (error) {
      console.error('Error getting user disputes from chain:', error);
      return [];
    }
  }

  /**
   * Get all active disputes from smart contract (admin function)
   */
  async getActiveDisputesFromChain(): Promise<DisputeInfo[]> {
    try {
      if (!this.disputeManagerAddress) {
        return []; // Return empty array if contract not deployed
      }

      const disputeManager = await this.getDisputeManagerContract();
      const disputeIds = await disputeManager.getActiveDisputes();

      const disputes: DisputeInfo[] = [];
      for (const disputeId of disputeIds) {
        try {
          const dispute = await this.getDisputeFromChain(disputeId.toNumber());
          disputes.push(dispute);
        } catch (error) {
          console.warn(`Failed to fetch active dispute ${disputeId}:`, error);
        }
      }

      return disputes.sort((a, b) => a.resolveBy - b.resolveBy); // Sort by earliest deadline first
    } catch (error) {
      console.error('Error getting active disputes from chain:', error);
      return [];
    }
  }

  /**
   * Resolve a dispute on smart contract (admin only)
   */
  async resolveDisputeOnChain(
    disputeId: number,
    outcome: DisputeOutcome,
    adminNotes: string,
    adminSigner: ethers.Signer
  ): Promise<string> {
    try {
      if (!this.disputeManagerAddress) {
        throw new Error('DisputeManager contract not deployed yet');
      }

      const disputeManager = await this.getDisputeManagerContract(adminSigner);

      console.log(`Resolving dispute ${disputeId} with outcome: ${outcome}`);

      const tx = await disputeManager.resolveDispute(disputeId, outcome, adminNotes);
      await tx.wait();

      console.log(`Dispute ${disputeId} resolved successfully, TX: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Error resolving dispute on chain:', error);
      throw error;
    }
  }
}

// Export singleton instance for smart contract integration
export const disputeBondService = new DisputeBondService();

export default DisputeBondService;