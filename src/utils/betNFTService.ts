import { ethers } from 'ethers';
import { TOKEN_ADDRESSES } from '../config/constants';
import { walletService } from './walletService';

// BetNFT Contract ABI - only the functions we need
const BET_NFT_ABI = [
  // ERC721 Standard
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",

  // BetNFT specific
  "function betMetadata(uint256) external view returns (address market, uint256 shares, bool isYes, uint256 timestamp)",
  "function listings(uint256) external view returns (uint256 tokenId, uint256 price, address seller, bool active)",

  // NFT Trading functions
  "function listNFT(uint256 tokenId, uint256 price) external",
  "function cancelListing(uint256 tokenId) external",
  "function buyNFT(uint256 tokenId) external payable",

  // Events
  "event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
  "event ListingCanceled(uint256 indexed tokenId)"
];

// PredictionMarket ABI for checking market status
const MARKET_ABI = [
  "function getMarketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))"
];

export interface NFTMetadata {
  tokenId: number;
  market: string;
  shares: string;
  isYes: boolean;
  timestamp: number;
  owner: string;
}

export interface NFTListing {
  tokenId: number;
  price: string; // in HBAR wei
  priceFormatted: string; // in HBAR
  seller: string;
  active: boolean;
  metadata?: NFTMetadata;
}

export interface MarketInfo {
  id: string;
  question: string;
  creator: string;
  endTime: number;
  status: number; // 0=Submitted, 1=Open, 2=PendingResolution, 3=Resolved, 4=Canceled, 5=Refunded
}

export class BetNFTService {
  private static instance: BetNFTService;
  private contractAddress: string;

  private constructor() {
    this.contractAddress = TOKEN_ADDRESSES.BET_NFT_CONTRACT;
  }

  static getInstance(): BetNFTService {
    if (!BetNFTService.instance) {
      BetNFTService.instance = new BetNFTService();
    }
    return BetNFTService.instance;
  }

  /**
   * Get contract instance with signer (for write operations)
   */
  private async getContract(withSigner = false): Promise<ethers.Contract> {
    const connection = walletService.getConnection();

    if (!connection) {
      throw new Error('Wallet not connected');
    }

    if (withSigner && !connection.signer) {
      throw new Error('Signer not available');
    }

    const providerOrSigner = withSigner ? connection.signer! : connection.provider!;
    return new ethers.Contract(this.contractAddress, BET_NFT_ABI, providerOrSigner);
  }

  /**
   * Get read-only contract instance
   */
  private getReadOnlyContract(): ethers.Contract {
    const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
    return new ethers.Contract(this.contractAddress, BET_NFT_ABI, provider);
  }

  /**
   * Get all NFT token IDs owned by a user
   */
  async getUserNFTs(userAddress: string): Promise<number[]> {
    try {
      const contract = this.getReadOnlyContract();
      const balance = await contract.balanceOf(userAddress);
      const tokenIds: number[] = [];

      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
        tokenIds.push(Number(tokenId));
      }

      console.log(`Found ${tokenIds.length} NFTs for user ${userAddress}:`, tokenIds);
      return tokenIds;
    } catch (error: any) {
      console.error('Failed to get user NFTs:', error);
      throw new Error(`Failed to fetch user NFTs: ${error.message}`);
    }
  }

  /**
   * Get metadata for a specific NFT
   */
  async getNFTMetadata(tokenId: number): Promise<NFTMetadata> {
    try {
      const contract = this.getReadOnlyContract();

      // Get metadata
      const metadata = await contract.betMetadata(tokenId);
      const owner = await contract.ownerOf(tokenId);

      return {
        tokenId,
        market: metadata.market,
        shares: ethers.formatEther(metadata.shares),
        isYes: metadata.isYes,
        timestamp: Number(metadata.timestamp),
        owner
      };
    } catch (error: any) {
      console.error(`Failed to get NFT metadata for token ${tokenId}:`, error);
      throw new Error(`Failed to fetch NFT metadata: ${error.message}`);
    }
  }

  /**
   * Get listing information for a specific NFT
   */
  async getNFTListing(tokenId: number): Promise<NFTListing | null> {
    try {
      const contract = this.getReadOnlyContract();
      const listing = await contract.listings(tokenId);

      if (!listing.active) {
        return null;
      }

      return {
        tokenId: Number(listing.tokenId),
        price: listing.price.toString(),
        priceFormatted: ethers.formatEther(listing.price),
        seller: listing.seller,
        active: listing.active
      };
    } catch (error: any) {
      console.error(`Failed to get listing for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Check if a market is open for trading
   */
  async isMarketOpen(marketAddress: string): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
      const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, provider);

      const marketInfo: MarketInfo = await marketContract.getMarketInfo();
      const now = Math.floor(Date.now() / 1000);

      // Market is open if status is 1 (Open) and not expired
      return marketInfo.status === 1 && Number(marketInfo.endTime) > now;
    } catch (error: any) {
      console.error(`Failed to check market status for ${marketAddress}:`, error);
      return false;
    }
  }

  /**
   * List an NFT for sale (price in HBAR)
   */
  async listNFTForSale(tokenId: number, priceInHbar: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = await this.getContract(true);

      // Convert HBAR to wei
      const priceInWei = ethers.parseEther(priceInHbar);

      console.log(`📝 Listing NFT #${tokenId} for ${priceInHbar} HBAR...`);

      const tx = await contract.listNFT(tokenId, priceInWei);
      console.log('⏳ Transaction sent, waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ NFT listed successfully!', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to list NFT:', error);

      // Parse common errors
      let errorMessage = error.message || 'Unknown error';

      if (error.message?.includes('Not owner')) {
        errorMessage = 'You do not own this NFT';
      } else if (error.message?.includes('Already listed')) {
        errorMessage = 'NFT is already listed';
      } else if (error.message?.includes('Market must be open')) {
        errorMessage = 'Cannot list NFT - market is no longer open';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Cancel an NFT listing
   */
  async cancelListing(tokenId: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = await this.getContract(true);

      console.log(`🚫 Canceling listing for NFT #${tokenId}...`);

      const tx = await contract.cancelListing(tokenId);
      console.log('⏳ Transaction sent, waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Listing canceled successfully!', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to cancel listing:', error);

      let errorMessage = error.message || 'Unknown error';

      if (error.message?.includes('Not your listing')) {
        errorMessage = 'You are not the seller of this NFT';
      } else if (error.message?.includes('Listing not active')) {
        errorMessage = 'NFT is not currently listed';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Buy an NFT from the marketplace (pay in HBAR)
   */
  async buyNFT(tokenId: number, priceInHbar: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = await this.getContract(true);

      // Convert HBAR to wei
      const priceInWei = ethers.parseEther(priceInHbar);

      console.log(`💰 Buying NFT #${tokenId} for ${priceInHbar} HBAR...`);

      const tx = await contract.buyNFT(tokenId, { value: priceInWei });
      console.log('⏳ Transaction sent, waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ NFT purchased successfully!', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to buy NFT:', error);

      let errorMessage = error.message || 'Unknown error';

      if (error.message?.includes('Listing not active')) {
        errorMessage = 'NFT is no longer available for sale';
      } else if (error.message?.includes('Insufficient payment')) {
        errorMessage = 'Insufficient HBAR sent';
      } else if (error.message?.includes('Market must be open')) {
        errorMessage = 'Cannot buy NFT - market is no longer open';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient HBAR balance in your wallet';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get all active listings from the marketplace
   * This is a bit tricky since we need to iterate through all possible token IDs
   * In production, you'd want to use events or a subgraph
   */
  async getAllActiveListings(maxTokenId = 1000): Promise<NFTListing[]> {
    try {
      console.log(`🔍 Scanning for active NFT listings (max token ID: ${maxTokenId})...`);

      const contract = this.getReadOnlyContract();
      const listings: NFTListing[] = [];

      // Check listings in parallel for better performance
      const promises: Promise<NFTListing | null>[] = [];

      for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
        promises.push(this.getNFTListing(tokenId));
      }

      const results = await Promise.all(promises);

      // Filter out null values and add metadata
      for (const listing of results) {
        if (listing && listing.active) {
          try {
            listing.metadata = await this.getNFTMetadata(listing.tokenId);
            listings.push(listing);
          } catch (error) {
            console.warn(`Failed to get metadata for token ${listing.tokenId}, skipping...`);
          }
        }
      }

      console.log(`✅ Found ${listings.length} active listings`);
      return listings;
    } catch (error: any) {
      console.error('Failed to get all listings:', error);
      throw new Error(`Failed to fetch marketplace listings: ${error.message}`);
    }
  }

  /**
   * Get all listings for a specific market
   */
  async getListingsByMarket(marketAddress: string, maxTokenId = 1000): Promise<NFTListing[]> {
    try {
      const allListings = await this.getAllActiveListings(maxTokenId);

      // Filter by market address
      return allListings.filter(listing =>
        listing.metadata?.market.toLowerCase() === marketAddress.toLowerCase()
      );
    } catch (error: any) {
      console.error('Failed to get listings by market:', error);
      throw new Error(`Failed to fetch market listings: ${error.message}`);
    }
  }

  /**
   * Get all NFTs owned by a user with their metadata and listing status
   */
  async getUserNFTsWithDetails(userAddress: string): Promise<(NFTMetadata & { listing: NFTListing | null })[]> {
    try {
      const tokenIds = await this.getUserNFTs(userAddress);
      const nftsWithDetails: (NFTMetadata & { listing: NFTListing | null })[] = [];

      for (const tokenId of tokenIds) {
        const metadata = await this.getNFTMetadata(tokenId);
        const listing = await this.getNFTListing(tokenId);

        nftsWithDetails.push({
          ...metadata,
          listing
        });
      }

      return nftsWithDetails;
    } catch (error: any) {
      console.error('Failed to get user NFTs with details:', error);
      throw new Error(`Failed to fetch user NFT details: ${error.message}`);
    }
  }
}

export const betNFTService = BetNFTService.getInstance();
