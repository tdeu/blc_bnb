// NFT Position Types for BetNFT Trading System

export interface PositionNFT {
  id: string;
  tokenId: number;
  marketId: string;
  marketClaim: string;
  marketCategory?: string;
  position: 'yes' | 'no';
  shares: number;
  originalPrice: number; // What the original bettor paid
  currentMarketPrice: number; // Current market odds
  listingPrice?: number; // If listed for sale
  isListed: boolean;
  owner: string;
  seller?: string; // If different from owner
  createdAt: Date;
  listedAt?: Date;
  marketEndTime: Date;
  marketStatus: 'active' | 'resolved' | 'disputed';
  potentialPayout: number; // Max payout if position wins
  profitLoss?: number; // Current P&L vs original price
  metadata: {
    marketAddress: string;
    timestamp: number;
  };
}

export interface NFTListing {
  tokenId: number;
  nft: PositionNFT;
  price: number;
  seller: string;
  active: boolean;
  createdAt: Date;
}

export interface NFTMarketplaceFilters {
  position?: 'yes' | 'no' | 'all';
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy: 'price' | 'profit' | 'expiry' | 'volume';
  sortOrder: 'asc' | 'desc';
}

export interface NFTPortfolioStats {
  totalNFTs: number;
  totalValue: number;
  totalPnL: number;
  activeListings: number;
  successfulSales: number;
}