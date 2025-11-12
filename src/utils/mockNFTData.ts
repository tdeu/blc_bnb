// Mock NFT data for frontend development

import { PositionNFT, NFTListing } from '../types/nft';

// Generate mock NFT positions
export const generateMockNFTs = (count: number = 10): PositionNFT[] => {
  const mockMarkets = [
    {
      id: 'market_1',
      claim: 'Bitcoin will reach $100,000 by end of 2024',
      category: 'Cryptocurrency',
      endTime: new Date('2024-12-31')
    },
    {
      id: 'market_2',
      claim: 'Nigeria will win AFCON 2024',
      category: 'Sports',
      endTime: new Date('2024-06-30')
    },
    {
      id: 'market_3',
      claim: 'Inflation will drop below 5% in South Africa by Q2 2024',
      category: 'Economics',
      endTime: new Date('2024-06-30')
    },
    {
      id: 'market_4',
      claim: 'A new African country will join BRICS in 2024',
      category: 'Politics',
      endTime: new Date('2024-12-31')
    }
  ];

  const mockOwners = [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x567890abcdef1234567890abcdef1234567890ab'
  ];

  return Array.from({ length: count }, (_, index) => {
    const market = mockMarkets[index % mockMarkets.length];
    const position = Math.random() > 0.5 ? 'yes' : 'no';
    const originalPrice = Math.random() * 10 + 1; // 1-11 CAST
    const currentMarketPrice = originalPrice + (Math.random() - 0.5) * 4; // +/- 2 CAST variation
    const shares = Math.floor(Math.random() * 50) + 10; // 10-60 shares
    const isListed = Math.random() > 0.7; // 30% chance of being listed
    const listingPrice = isListed ? currentMarketPrice + (Math.random() - 0.3) * 2 : undefined;

    return {
      id: `nft_${index + 1}`,
      tokenId: index + 1,
      marketId: market.id,
      marketClaim: market.claim,
      marketCategory: market.category,
      position,
      shares,
      originalPrice,
      currentMarketPrice: Math.max(0.1, currentMarketPrice),
      listingPrice: listingPrice ? Math.max(0.1, listingPrice) : undefined,
      isListed,
      owner: mockOwners[index % mockOwners.length],
      seller: isListed ? mockOwners[index % mockOwners.length] : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      listedAt: isListed ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
      marketEndTime: market.endTime,
      marketStatus: 'active' as const,
      potentialPayout: shares * (position === 'yes' ? 2.1 : 1.9), // Mock potential payout
      profitLoss: (currentMarketPrice - originalPrice) * shares,
      metadata: {
        marketAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      }
    };
  });
};

// Generate mock NFT listings (for marketplace)
export const generateMockNFTListings = (nfts: PositionNFT[]): NFTListing[] => {
  return nfts
    .filter(nft => nft.isListed)
    .map(nft => ({
      tokenId: nft.tokenId,
      nft,
      price: nft.listingPrice!,
      seller: nft.seller!,
      active: true,
      createdAt: nft.listedAt!
    }));
};

// Mock data for current user's NFTs (from connected wallet)
export const getMockUserNFTs = (userAddress?: string): PositionNFT[] => {
  if (!userAddress) return [];

  const allNFTs = generateMockNFTs(20);
  // Return NFTs owned by the user
  return allNFTs.filter(nft => nft.owner.toLowerCase() === userAddress.toLowerCase()).slice(0, 5);
};

// Mock data for marketplace listings (excluding user's own NFTs)
export const getMockMarketplaceListings = (userAddress?: string): NFTListing[] => {
  const allNFTs = generateMockNFTs(30);
  const availableNFTs = userAddress
    ? allNFTs.filter(nft => nft.owner.toLowerCase() !== userAddress.toLowerCase() && nft.isListed)
    : allNFTs.filter(nft => nft.isListed);

  return generateMockNFTListings(availableNFTs);
};