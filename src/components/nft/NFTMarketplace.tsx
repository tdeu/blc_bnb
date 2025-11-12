import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Tag,
  TrendingUp,
  TrendingDown,
  Eye,
  Image,
  Users,
  BarChart3,
  Target,
  DollarSign,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { NFTListing as BlockchainNFTListing, betNFTService } from '../../utils/betNFTService';
import { walletService } from '../../utils/walletService';

interface NFTMarketplaceProps {
  walletConnected?: boolean;
  walletAddress?: string;
  onConnectWallet?: () => void;
}

interface EnhancedNFTListing extends BlockchainNFTListing {
  marketClaim?: string;
  marketCategory?: string;
  marketEndTime?: Date;
}

interface NFTMarketplaceFilters {
  position: 'all' | 'yes' | 'no';
  sortBy: 'price' | 'profit' | 'expiry';
  sortOrder: 'asc' | 'desc';
  priceRange?: {
    min: number;
    max: number;
  };
}

export default function NFTMarketplace({
  walletConnected = false,
  walletAddress,
  onConnectWallet
}: NFTMarketplaceProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [listings, setListings] = useState<EnhancedNFTListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<EnhancedNFTListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NFTMarketplaceFilters>({
    position: 'all',
    sortBy: 'price',
    sortOrder: 'asc'
  });
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  // Load marketplace listings from blockchain
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true);
      try {
        console.log('📡 Loading NFT marketplace listings from blockchain...');

        // Get all active listings from blockchain
        const blockchainListings = await betNFTService.getAllActiveListings(100);

        console.log(`✅ Found ${blockchainListings.length} active listings`);

        // Enhance listings with market information
        const enhancedListings: EnhancedNFTListing[] = blockchainListings.map(listing => ({
          ...listing,
          marketClaim: `Market at ${listing.metadata?.market.slice(0, 8)}...${listing.metadata?.market.slice(-6)}`,
          marketCategory: listing.metadata?.isYes ? 'YES Position' : 'NO Position',
          marketEndTime: listing.metadata ? new Date(listing.metadata.timestamp * 1000 + 30 * 24 * 60 * 60 * 1000) : undefined
        }));

        setListings(enhancedListings);
        setFilteredListings(enhancedListings);
      } catch (error) {
        console.error('Failed to load marketplace listings:', error);
        toast.error('Failed to load marketplace listings. Please try again.');
        setListings([]);
        setFilteredListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadListings();
  }, [walletAddress]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...listings];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(listing =>
        listing.marketClaim?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.marketCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.metadata?.market.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply position filter
    if (filters.position !== 'all') {
      filtered = filtered.filter(listing => {
        const isYes = listing.metadata?.isYes;
        return filters.position === 'yes' ? isYes === true : isYes === false;
      });
    }

    // Apply price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(listing => {
        const priceInHbar = parseFloat(listing.priceFormatted);
        return priceInHbar >= (filters.priceRange?.min || 0) &&
               priceInHbar <= (filters.priceRange?.max || Infinity);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (filters.sortBy) {
        case 'price':
          aValue = parseFloat(a.priceFormatted);
          bValue = parseFloat(b.priceFormatted);
          break;
        case 'profit':
          // Calculate potential profit based on shares and market price
          aValue = parseFloat(a.metadata?.shares || '0');
          bValue = parseFloat(b.metadata?.shares || '0');
          break;
        case 'expiry':
          aValue = a.marketEndTime?.getTime() || 0;
          bValue = b.marketEndTime?.getTime() || 0;
          break;
        default:
          aValue = parseFloat(a.priceFormatted);
          bValue = parseFloat(b.priceFormatted);
      }

      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setFilteredListings(filtered);
  }, [listings, searchQuery, filters]);

  const getPositionBadge = (position: string) => {
    return position === 'yes' ?
      <Badge className="bg-primary/20 text-primary border-primary/30">TRUE</Badge> :
      <Badge className="bg-secondary/20 text-secondary border-secondary/30">FALSE</Badge>;
  };

  const formatTimeUntilExpiry = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Expires soon';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const handlePurchaseNFT = async (listing: EnhancedNFTListing) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet to purchase NFTs');
      onConnectWallet?.();
      return;
    }

    const connection = walletService.getConnection();
    if (!connection) {
      toast.error('Wallet not connected. Please connect your wallet.');
      return;
    }

    setIsPurchasing(listing.tokenId);

    try {
      console.log(`💰 Purchasing NFT #${listing.tokenId} for ${listing.priceFormatted} HBAR...`);

      // Call blockchain service to buy NFT
      const result = await betNFTService.buyNFT(listing.tokenId, listing.priceFormatted);

      if (result.success) {
        toast.success(
          `✅ Successfully purchased NFT #${listing.tokenId} for ${listing.priceFormatted} HBAR!\n\n` +
          `Transaction: ${result.txHash?.slice(0, 10)}...${result.txHash?.slice(-8)}`
        );

        // Refresh listings after purchase
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(`Failed to purchase NFT: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error purchasing NFT:', error);
      toast.error(`Failed to purchase NFT: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPurchasing(null);
    }
  };

  const marketStats = {
    totalListings: listings.length,
    averagePrice: listings.length > 0 ? listings.reduce((sum, l) => sum + parseFloat(l.priceFormatted), 0) / listings.length : 0,
    totalVolume: listings.reduce((sum, l) => sum + parseFloat(l.priceFormatted), 0),
    uniqueSellers: new Set(listings.map(l => l.seller)).size
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <ShoppingBag className="h-7 w-7" />
            NFT Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Trade betting position NFTs • Discover arbitrage opportunities • Buy and sell positions
          </p>
        </div>

        {/* Wallet Connection */}
        {!walletConnected && (
          <Button onClick={onConnectWallet} className="gap-2">
            <DollarSign className="h-4 w-4" />
            Connect Wallet to Trade
          </Button>
        )}
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Active Listings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketStats.totalListings}</p>
            <p className="text-sm text-muted-foreground">Available for purchase</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-secondary">Avg. Price</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketStats.averagePrice.toFixed(3)} HBAR</p>
            <p className="text-sm text-muted-foreground">Market average</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-500">Total Volume</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketStats.totalVolume.toFixed(3)} HBAR</p>
            <p className="text-sm text-muted-foreground">Listed volume</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Active Sellers</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketStats.uniqueSellers}</p>
            <p className="text-sm text-muted-foreground">Unique addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse" className="gap-2">
            <Search className="h-4 w-4" />
            Browse NFTs ({filteredListings.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Market Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filters.position} onValueChange={(value: any) => setFilters({...filters, position: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="yes">TRUE Positions</SelectItem>
                    <SelectItem value="no">FALSE Positions</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.sortBy} onValueChange={(value: any) => setFilters({...filters, sortBy: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="profit">Profit Potential</SelectItem>
                    <SelectItem value="expiry">Time to Expiry</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                  className="gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {filters.sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Listings */}
          {isLoading ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">Loading Marketplace...</h3>
                <p className="text-muted-foreground">
                  Fetching available position NFTs from the blockchain.
                </p>
              </CardContent>
            </Card>
          ) : filteredListings.length === 0 ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No NFTs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filters.position !== 'all'
                    ? 'No position NFTs match your current filters. Try adjusting your search criteria.'
                    : 'No position NFTs are currently listed for sale. Check back later!'
                  }
                </p>
                {(searchQuery || filters.position !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({...filters, position: 'all'});
                    }}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <Card key={`${listing.tokenId}-${listing.seller}`} className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className="gap-1">
                            <Tag className="h-3 w-3" />
                            NFT #{listing.tokenId}
                          </Badge>
                          {getPositionBadge(listing.metadata?.isYes ? 'yes' : 'no')}
                          {listing.marketEndTime && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeUntilExpiry(listing.marketEndTime)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1 text-xs">
                            {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-foreground leading-tight">
                          {listing.marketClaim || 'Position NFT'}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Listing Price:</span>
                            <div className="font-semibold text-primary text-lg">{listing.priceFormatted} HBAR</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Shares:</span>
                            <div className="font-semibold text-foreground">
                              {listing.metadata?.shares ? parseFloat(listing.metadata.shares).toFixed(3) : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Market Address:</span>
                            <div className="font-mono text-xs text-foreground">
                              {listing.metadata?.market.slice(0, 8)}...{listing.metadata?.market.slice(-6)}
                            </div>
                          </div>
                        </div>

                        {/* Important Notice */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-sm">
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                            💡 Buying this NFT transfers the underlying position shares
                          </div>
                          <p className="text-blue-600 dark:text-blue-400 text-xs">
                            You will receive {listing.metadata?.shares ? parseFloat(listing.metadata.shares).toFixed(3) : 'N/A'} {' '}
                            {listing.metadata?.isYes ? 'YES' : 'NO'} shares in the underlying market
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handlePurchaseNFT(listing)}
                          className="gap-1"
                          disabled={!walletConnected || isPurchasing === listing.tokenId}
                        >
                          {isPurchasing === listing.tokenId ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Purchasing...
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-3 w-3" />
                              Buy for {listing.priceFormatted} HBAR
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-3 w-3" />
                          View Market
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Analytics
              </CardTitle>
              <CardDescription>
                NFT trading statistics and market insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed market analytics, price trends, and trading insights will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}