import { ethers } from 'ethers';
import { pendingMarketsService } from './pendingMarketsService';
import { approvedMarketsService } from './approvedMarketsService';
import { contractService } from './contractService';

// Admin wallet address - Single admin address (MetaMask EVM address)
export const ADMIN_ADDRESSES = [
  '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b', // Primary Admin
];

// Primary admin address (full privileges) - EVM format
export const SUPER_ADMIN_ADDRESS = '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b';

export interface AdminStats {
  totalMarkets: number;
  pendingMarkets: number;
  totalUsers: number;
  totalVolume: string;
  flaggedContent: number;
}

export interface PendingMarket {
  id: string;
  question: string;
  creator: string;
  createdAt: Date;
  category: string;
  endTime: Date;
  description?: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  imageUrl?: string;
}

export interface AdminAction {
  id: string;
  type: 'market_approval' | 'market_rejection' | 'user_ban' | 'content_moderation';
  adminAddress: string;
  targetId: string;
  reason?: string;
  timestamp: Date;
}

class AdminService {
  private adminActionsCache: AdminAction[] = [];
  private marketApprovalCallback?: (market: any) => void;

  /**
   * Set callback for when markets are approved
   */
  setMarketApprovalCallback(callback: (market: any) => void) {
    this.marketApprovalCallback = callback;
  }

  /**
   * Check if wallet address is an admin (EVM addresses)
   */
  isAdmin(walletAddress: string): boolean {
    if (!walletAddress) return false;

    // Handle EVM addresses (0x...)
    const normalizedAddress = walletAddress.trim();
    
    // Check against whitelisted admin addresses
    const isInAdminList = ADMIN_ADDRESSES.some(addr => 
      addr.toLowerCase() === normalizedAddress.toLowerCase()
    );
    
    const isSuper = this.isSuperAdmin(normalizedAddress);
    
    return isInAdminList || isSuper;
  }

  /**
   * Check if wallet address is the super admin
   */
  isSuperAdmin(walletAddress: string): boolean {
    if (!walletAddress) return false;
    return SUPER_ADMIN_ADDRESS.toLowerCase() === walletAddress.trim().toLowerCase();
  }

  /**
   * Get admin role for display purposes
   */
  getAdminRole(walletAddress: string): 'super_admin' | 'admin' | 'user' {
    if (!walletAddress) return 'user';
    
    if (this.isSuperAdmin(walletAddress)) {
      return 'super_admin';
    } else if (this.isAdmin(walletAddress)) {
      return 'admin';
    } else {
      return 'user';
    }
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      const pendingStats = pendingMarketsService.getStats();
      
      return {
        totalMarkets: pendingStats.totalSubmitted,
        pendingMarkets: pendingStats.pending,
        totalUsers: 2847, // TODO: Replace with real user count
        totalVolume: '145.67', // TODO: Replace with real volume data
        flaggedContent: 3 // TODO: Replace with real flagged content count
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  }

  /**
   * Get markets pending approval
   */
  async getPendingMarkets(): Promise<PendingMarket[]> {
    try {
      const pendingSubmissions = await pendingMarketsService.getActivePendingMarkets();

      return pendingSubmissions.map(submission =>
        pendingMarketsService.toPendingMarketFormat(submission)
      );
    } catch (error) {
      console.error('Error fetching pending markets:', error);
      return [];
    }
  }

  /**
   * Approve a market
   */
  async approveMarket(marketId: string, adminAddress: string, reason?: string): Promise<boolean> {
    try {
      console.log(`Admin ${adminAddress} approving market ${marketId}`);

      // Get original submission to find submitter address (before approval changes the status)
      const pendingMarkets = await pendingMarketsService.getPendingMarkets();
      const originalSubmission = pendingMarkets.find(m => m.id === marketId);
      const submitterAddress = originalSubmission?.submittedBy || 'unknown';

      // Approve market in pending markets service
      const approvedMarket = await pendingMarketsService.approveMarket(marketId, adminAddress, reason);

      if (!approvedMarket) {
        return false;
      }
      
      // Store approved market in Supabase for permanent storage
      const supabaseSuccess = await approvedMarketsService.storeApprovedMarket(
        approvedMarket,
        adminAddress,
        submitterAddress,
        reason
      );

      if (!supabaseSuccess) {
        console.warn('⚠️ Market approved locally but failed to store in Supabase');
        // Continue anyway - we can retry later
      }
      
      // Record admin action
      const action: AdminAction = {
        id: `action-${Date.now()}`,
        type: 'market_approval',
        adminAddress,
        targetId: marketId,
        reason,
        timestamp: new Date()
      };
      
      this.adminActionsCache.push(action);

      // Trigger callback to add market to homepage immediately
      if (this.marketApprovalCallback && approvedMarket) {
        this.marketApprovalCallback(approvedMarket);
      }

      // Enhanced implementation with smart contract integration
      await this.activateMarketOnChain(marketId, approvedMarket, adminAddress, reason);

      return true;
    } catch (error) {
      console.error('Error approving market:', error);
      return false;
    }
  }

  /**
   * Reject a market
   */
  async rejectMarket(marketId: string, adminAddress: string, reason: string): Promise<boolean> {
    try {
      console.log(`Admin ${adminAddress} rejecting market ${marketId} - Reason: ${reason}`);

      // Reject market in pending markets service
      const rejected = await pendingMarketsService.rejectMarket(marketId, adminAddress, reason);
      
      if (!rejected) {
        return false;
      }
      
      // Record admin action
      const action: AdminAction = {
        id: `action-${Date.now()}`,
        type: 'market_rejection',
        adminAddress,
        targetId: marketId,
        reason,
        timestamp: new Date()
      };
      
      this.adminActionsCache.push(action);

      // TODO: In full implementation:
      // 1. Call smart contract to change market status to canceled/rejected
      // 2. Record action in blockchain audit log
      // 3. Send notification to market creator with reason
      // 4. Potentially refund any fees

      return true;
    } catch (error) {
      console.error('Error rejecting market:', error);
      return false;
    }
  }

  /**
   * Get recent admin actions
   */
  async getRecentAdminActions(limit: number = 50): Promise<AdminAction[]> {
    try {
      // In real implementation, query blockchain for admin actions
      return this.adminActionsCache
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching admin actions:', error);
      return [];
    }
  }

  /**
   * Ban a user (for serious violations)
   */
  async banUser(userAddress: string, adminAddress: string, reason: string, duration?: number): Promise<boolean> {
    try {
      console.log(`Admin ${adminAddress} banning user ${userAddress} - Reason: ${reason}`);
      
      const action: AdminAction = {
        id: `action-${Date.now()}`,
        type: 'user_ban',
        adminAddress,
        targetId: userAddress,
        reason,
        timestamp: new Date()
      };
      
      this.adminActionsCache.push(action);

      // In real implementation:
      // 1. Add user to blacklist in smart contract
      // 2. Record ban in blockchain audit log
      // 3. Prevent user from creating markets or placing bets

      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }

  /**
   * Take a market offline (remove from public view)
   */
  async offlineMarket(marketId: string, adminAddress: string, reason?: string): Promise<boolean> {
    try {
      console.log(`Admin ${adminAddress} taking market ${marketId} offline - Reason: ${reason}`);

      // Update market status in Supabase
      const success = await approvedMarketsService.updateMarketStatus(marketId, 'offline');

      if (!success) {
        return false;
      }

      // Record admin action
      const action: AdminAction = {
        id: `action-${Date.now()}`,
        type: 'content_moderation',
        adminAddress,
        targetId: marketId,
        reason: reason || 'Market taken offline by admin',
        timestamp: new Date()
      };

      this.adminActionsCache.push(action);

      return true;
    } catch (error) {
      console.error('Error offlining market:', error);
      return false;
    }
  }

  /**
   * Bring a market back online (restore to public view)
   */
  async onlineMarket(marketId: string, adminAddress: string, reason?: string): Promise<boolean> {
    try {
      console.log(`Admin ${adminAddress} bringing market ${marketId} back online - Reason: ${reason}`);

      // Update market status back to active in Supabase
      const success = await approvedMarketsService.updateMarketStatus(marketId, 'active');

      if (!success) {
        return false;
      }

      // Record admin action
      const action: AdminAction = {
        id: `action-${Date.now()}`,
        type: 'content_moderation',
        adminAddress,
        targetId: marketId,
        reason: reason || 'Market brought back online by admin',
        timestamp: new Date()
      };

      this.adminActionsCache.push(action);

      return true;
    } catch (error) {
      console.error('Error bringing market online:', error);
      return false;
    }
  }

  /**
   * Get market analytics for admin review
   */
  async getMarketAnalytics(marketId: string) {
    try {
      // Mock analytics - in real implementation, analyze on-chain data
      return {
        totalVolume: '12.5 HBAR',
        uniqueParticipants: 47,
        yesVotes: 28,
        noVotes: 19,
        flaggedByUsers: 0,
        aiConfidence: 0.85,
        riskScore: 'Low'
      };
    } catch (error) {
      console.error('Error fetching market analytics:', error);
      return null;
    }
  }

  /**
   * Activate market on-chain after admin approval
   * This bridges database approval with smart contract activation
   */
  private async activateMarketOnChain(
    marketId: string,
    approvedMarket: any,
    adminAddress: string,
    reason?: string
  ): Promise<void> {
    try {
      console.log(`🔗 Activating market ${marketId} on-chain...`);

      // Step 1: Get market contract address (would be stored in database)
      const marketContractAddress = approvedMarket.contractAddress;

      if (!marketContractAddress) {
        console.warn('⚠️ No contract address found for market - skipping contract activation');
        return;
      }

      // Step 2: Use the private key from environment to sign the transaction
      const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;

      if (!privateKey) {
        console.warn('⚠️ No private key available - cannot activate market');
        return;
      }

      // Step 3: Call smart contract to activate market (change status from Submitted to Open)
      try {
        console.log(`📝 Calling contract.approveMarket() for ${marketContractAddress}`);

        // Create provider and signer for BSC testnet (using multiple fallback RPCs)
        const bscTestnetRPCs = [
          'https://bsc-testnet-rpc.publicnode.com',
          'https://data-seed-prebsc-1-s1.binance.org:8545/',
          'https://data-seed-prebsc-2-s1.binance.org:8545/',
          'https://bsc-testnet.public.blastapi.io'
        ];

        let provider: ethers.JsonRpcProvider | null = null;
        let lastError: Error | null = null;

        // Try each RPC until one works
        for (const rpcUrl of bscTestnetRPCs) {
          try {
            console.log(`🔗 Trying RPC: ${rpcUrl}`);
            const testProvider = new ethers.JsonRpcProvider(rpcUrl);
            // Test the connection
            await testProvider.getBlockNumber();
            provider = testProvider;
            console.log(`✅ Connected to RPC: ${rpcUrl}`);
            break;
          } catch (err) {
            console.warn(`⚠️ RPC ${rpcUrl} failed:`, err);
            lastError = err as Error;
          }
        }

        if (!provider) {
          console.warn('⚠️ All BSC testnet RPCs failed, skipping on-chain activation');
          console.warn('   Market is approved in database but not activated on blockchain');
          return;
        }

        const signer = new ethers.Wallet(privateKey, provider);

        console.log(`🔐 Using signer address: ${signer.address}`);

        // Create contract instance for the market
        const marketABI = [
          "function approveMarket() external",
          "function getMarketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))"
        ];

        const marketContract = new ethers.Contract(marketContractAddress, marketABI, signer);

        // Check current status
        const marketInfo = await marketContract.getMarketInfo();
        const statusNumber = Number(marketInfo.status);
        console.log(`📊 Current market status: ${statusNumber} (type: ${typeof marketInfo.status})`);

        if (statusNumber === 0) {
          // Status 0 = Submited, need to approve
          console.log(`✅ Market is Submited, calling approveMarket()...`);
          const tx = await marketContract.approveMarket({ gasLimit: 500000 });
          console.log(`📤 Transaction sent: ${tx.hash}`);

          const receipt = await tx.wait();
          console.log(`✅ Market ${marketId} activated on-chain! Gas used: ${receipt.gasUsed.toString()}`);

          // Verify new status
          const newMarketInfo = await marketContract.getMarketInfo();
          console.log(`🎉 New market status: ${Number(newMarketInfo.status)} (should be 1 for Open)`);
        } else if (statusNumber === 1) {
          console.log(`✅ Market is already Open`);
        } else {
          console.warn(`⚠️ Market is in unexpected status: ${statusNumber}`);
        }

        console.log(`✅ Market ${marketId} successfully activated on BSC`);

      } catch (contractError) {
        console.error('❌ Contract activation failed:', contractError);
        throw contractError;
      }

    } catch (error) {
      console.error('❌ Error in activateMarketOnChain:', error);
      throw error;
    }
  }

  /**
   * Get admin signer for contract transactions
   * In production, this would integrate with wallet or secure key management
   */
  private async getAdminSigner(adminAddress: string): Promise<ethers.Signer | null> {
    try {
      // TODO: Implement proper admin wallet integration
      // This would either:
      // 1. Connect to MetaMask if admin is using browser
      // 2. Use stored admin private key (secure)
      // 3. Use hardware wallet integration

      console.log(`🔑 Getting signer for admin ${adminAddress}`);

      // For now, return null to simulate missing wallet connection
      // In real implementation:
      // const provider = new ethers.providers.JsonRpcProvider(HEDERA_RPC_URL);
      // const signer = new ethers.Wallet(adminPrivateKey, provider);
      // return signer;

      return null;

    } catch (error) {
      console.error('❌ Error getting admin signer:', error);
      return null;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();