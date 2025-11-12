import { ethers } from 'ethers';
import { TOKEN_ADDRESSES } from '../config/constants';

// DisputeManager ABI - extracted from the contract
const DISPUTE_MANAGER_ABI = [
  // Constructor
  "constructor(address _adminManager, address _bondToken)",

  // View functions
  "function DISPUTE_BOND_AMOUNT() external view returns (uint256)",
  "function DISPUTE_PERIOD_HOURS() external view returns (uint256)",
  "function adminManager() external view returns (address)",
  "function bondToken() external view returns (address)",
  "function getDispute(uint256 _disputeId) external view returns (tuple(uint256 id, address disputer, address marketAddress, uint256 bondAmount, string evidence, string reason, bytes32 evidenceHash, uint256 createdAt, uint256 resolveBy, uint8 status, uint8 outcome, address resolvedBy, uint256 resolvedAt, string adminNotes))",
  "function getActiveDisputes() external view returns (uint256[])",
  "function getMarketDisputes(address _marketAddress) external view returns (uint256[])",
  "function getUserDisputes(address _user) external view returns (uint256[])",
  "function hasActiveDisputes(address _marketAddress) external view returns (bool)",

  // State-changing functions
  "function createDispute(address _marketAddress, string calldata _reason, string calldata _evidence, bytes32 _evidenceHash) external returns (uint256)",
  "function resolveDispute(uint256 _disputeId, uint8 _outcome, string calldata _adminNotes) external",

  // Events
  "event DisputeCreated(uint256 indexed disputeId, address indexed disputer, address indexed marketAddress, uint256 bondAmount, string evidence)",
  "event DisputeResolved(uint256 indexed disputeId, address indexed resolver, uint8 outcome, bool bondReturned)"
];

export interface Dispute {
  id: string;
  disputer: string;
  marketAddress: string;
  bondAmount: string;
  evidence: string;
  reason: string;
  evidenceHash: string;
  createdAt: Date;
  resolvedAt?: Date;
  status: 'Active' | 'Resolved' | 'Rejected' | 'Expired';
  outcome: 'Pending' | 'Upheld' | 'Rejected';
}

export interface DisputeCreationResult {
  disputeId: string;
  transactionHash: string;
  bondAmount: string;
}

class DisputeManagerService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * Initialize the service with wallet connection
   */
  async initialize(walletConnection: any): Promise<void> {
    try {
      if (!walletConnection?.isConnected) {
        throw new Error('Wallet not connected');
      }

      // Use the same provider setup as other services
      this.provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');

      if (walletConnection.signer) {
        this.signer = walletConnection.signer;
      } else {
        // Fallback for MetaMask
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        this.signer = await provider.getSigner();
      }

      this.contract = new ethers.Contract(
        TOKEN_ADDRESSES.DISPUTE_MANAGER_CONTRACT,
        DISPUTE_MANAGER_ABI,
        this.signer
      );

      console.log('✅ DisputeManagerService initialized with contract:', TOKEN_ADDRESSES.DISPUTE_MANAGER_CONTRACT);
    } catch (error) {
      console.error('❌ Failed to initialize DisputeManagerService:', error);
      throw error;
    }
  }

  /**
   * Get the required bond amount for creating disputes
   */
  async getBondRequirement(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('DisputeManager contract not initialized');
      }

      const bondAmount = await this.contract.DISPUTE_BOND_AMOUNT();
      // Convert from wei (18 decimals) to whole tokens
      return parseFloat(ethers.formatEther(bondAmount));
    } catch (error) {
      console.error('❌ Error getting bond requirement:', error);
      // Return default value if contract call fails (1 CAST = 1e18 wei)
      return 1; // 1 CAST token
    }
  }

  /**
   * Create a new dispute for a market resolution
   *
   * Contract signature: createDispute(address _marketAddress, string calldata _reason, string calldata _evidence, bytes32 _evidenceHash)
   */
  async createDispute(
    marketAddress: string,
    reason: string,
    evidence: string
  ): Promise<DisputeCreationResult> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('DisputeManager contract not initialized');
      }

      console.log('🏛️ Creating dispute for market contract:', marketAddress);
      console.log('📋 Evidence length:', evidence.length);
      console.log('📋 Reason:', reason);

      // Validate inputs
      if (!marketAddress || marketAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid market address');
      }
      if (!evidence || evidence.trim().length < 20) {
        throw new Error('Evidence must be at least 20 characters');
      }
      if (!reason || reason.trim().length < 5) {
        throw new Error('Reason must be at least 5 characters');
      }

      // Get bond requirement
      const bondAmount = await this.getBondRequirement();
      console.log('💰 Required bond amount:', bondAmount, 'CAST');

      // Create evidence hash
      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(evidence));
      console.log('🔐 Evidence hash:', evidenceHash);

      // Create the dispute transaction with correct parameter order
      console.log('📤 Submitting dispute transaction...');
      const tx = await this.contract.createDispute(marketAddress, reason, evidence, evidenceHash);

      console.log('⏳ Waiting for dispute transaction confirmation...');
      const receipt = await tx.wait();

      // Extract dispute ID from events
      let disputeId = '';
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'DisputeCreated') {
              disputeId = parsedLog.args.disputeId.toString();
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }

      if (!disputeId) {
        // Fallback: try to get the latest dispute ID
        const activeDisputes = await this.getActiveDisputes();
        disputeId = activeDisputes.length > 0 ? activeDisputes[activeDisputes.length - 1].id : '0';
      }

      console.log('✅ Dispute created successfully!');
      console.log('🆔 Dispute ID:', disputeId);
      console.log('🔗 Transaction hash:', receipt.hash);

      return {
        disputeId,
        transactionHash: receipt.hash,
        bondAmount: bondAmount.toString()
      };

    } catch (error: any) {
      console.error('❌ Error creating dispute:', error);
      throw new Error(`Failed to create dispute: ${error.message || error}`);
    }
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolveDispute(disputeId: string, outcome: 'Upheld' | 'Rejected', adminNotes: string = 'Resolved by admin'): Promise<void> {
    try {
      if (!this.contract) {
        throw new Error('DisputeManager contract not initialized');
      }

      console.log('🏛️ Resolving dispute:', disputeId);
      console.log('⚖️ Outcome:', outcome);

      // Convert outcome to contract enum (0 = Pending, 1 = Upheld, 2 = Rejected)
      const outcomeEnum = outcome === 'Upheld' ? 1 : 2;

      // Ensure admin notes meet minimum length requirement (5 characters)
      const notes = adminNotes.length >= 5 ? adminNotes : 'Resolved by admin';

      const tx = await this.contract.resolveDispute(disputeId, outcomeEnum, notes);
      console.log('⏳ Waiting for resolution transaction...');

      const receipt = await tx.wait();
      console.log('✅ Dispute resolved successfully!');
      console.log('🔗 Transaction hash:', receipt.hash);

    } catch (error: any) {
      console.error('❌ Error resolving dispute:', error);
      throw new Error(`Failed to resolve dispute: ${error.message || error}`);
    }
  }

  /**
   * Get all active disputes for admin review
   */
  async getActiveDisputes(): Promise<Dispute[]> {
    try {
      if (!this.contract) {
        throw new Error('DisputeManager contract not initialized');
      }

      const activeDisputeIds = await this.contract.getActiveDisputes();
      console.log('📊 Found', activeDisputeIds.length, 'active disputes');

      const disputes: Dispute[] = [];

      for (const disputeId of activeDisputeIds) {
        try {
          const disputeData = await this.contract.getDispute(disputeId);

          const dispute: Dispute = {
            id: disputeId.toString(),
            disputer: disputeData.disputer,
            marketAddress: disputeData.marketAddress,
            bondAmount: ethers.formatEther(disputeData.bondAmount),
            evidence: disputeData.evidence,
            reason: disputeData.reason,
            evidenceHash: disputeData.evidenceHash,
            createdAt: new Date(Number(disputeData.createdAt) * 1000),
            resolvedAt: disputeData.resolvedAt > 0 ? new Date(Number(disputeData.resolvedAt) * 1000) : undefined,
            status: ['Active', 'Resolved', 'Rejected', 'Expired'][disputeData.status] as any,
            outcome: ['Pending', 'Upheld', 'Rejected'][disputeData.outcome] as any
          };

          disputes.push(dispute);
        } catch (error) {
          console.warn('⚠️ Failed to fetch dispute details for ID:', disputeId.toString());
        }
      }

      return disputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error: any) {
      console.error('❌ Error getting active disputes:', error);
      return [];
    }
  }

  /**
   * Check if a market has active disputes
   */
  async hasActiveDisputes(marketAddress: string): Promise<boolean> {
    try {
      if (!this.contract) {
        return false;
      }

      return await this.contract.hasActiveDisputes(marketAddress);
    } catch (error) {
      console.error('❌ Error checking active disputes:', error);
      return false;
    }
  }

  /**
   * Get disputes for a specific market
   */
  async getDisputesByMarket(marketAddress: string): Promise<Dispute[]> {
    try {
      if (!this.contract) {
        return [];
      }

      const disputeIds = await this.contract.getMarketDisputes(marketAddress);
      const disputes: Dispute[] = [];

      for (const disputeId of disputeIds) {
        try {
          const disputeData = await this.contract.getDispute(disputeId);

          const dispute: Dispute = {
            id: disputeId.toString(),
            disputer: disputeData.disputer,
            marketAddress: disputeData.marketAddress,
            bondAmount: ethers.formatEther(disputeData.bondAmount),
            evidence: disputeData.evidence,
            reason: disputeData.reason,
            evidenceHash: disputeData.evidenceHash,
            createdAt: new Date(Number(disputeData.createdAt) * 1000),
            resolvedAt: disputeData.resolvedAt > 0 ? new Date(Number(disputeData.resolvedAt) * 1000) : undefined,
            status: ['Active', 'Resolved', 'Rejected', 'Expired'][disputeData.status] as any,
            outcome: ['Pending', 'Upheld', 'Rejected'][disputeData.outcome] as any
          };

          disputes.push(dispute);
        } catch (error) {
          console.warn('⚠️ Failed to fetch dispute details for ID:', disputeId.toString());
        }
      }

      return disputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error: any) {
      console.error('❌ Error getting disputes for market:', error);
      return [];
    }
  }
}

// Export singleton instance
export const disputeManagerService = new DisputeManagerService();