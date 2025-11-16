import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { TrendingUp, TrendingDown, Users, Clock, Target, Star, MessageCircle, Filter, ChevronDown, Share2, Heart, Bookmark, Zap, Globe, Shield, Search, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useLanguage } from '../shared/LanguageContext';
import ShareModal from '../shared/ShareModal';

export interface BettingMarket {
  id: string;
  claim: string;
  claimTranslations?: {
    en: string;
    fr: string;
    sw: string;
  };
  category: string;
  subcategory?: string;
  source: string;
  description: string;
  descriptionTranslations?: {
    en: string;
    fr: string;
    sw: string;
  };
  totalPool: number;
  yesPool: number;
  noPool: number;
  volume?: number;  // Total CAST volume traded
  yesOdds: number;
  noOdds: number;
  totalCasters: number;
  expiresAt: Date;
  status: 'active' | 'pending_resolution' | 'resolved' | 'locked' | 'offline' | 'evidence_collection';
  resolution?: 'yes' | 'no';
  trending: boolean;
  imageUrl?: string;
  country?: string;
  region?: string;
  marketType: 'present' | 'future';
  confidenceLevel: 'high' | 'medium' | 'low';
  contractAddress?: string; // Blockchain contract address for this market
  creatorWallet?: string; // Wallet address of market creator
  createdAt?: Date; // Market creation timestamp
  // Evidence collection period fields (48h when AI confidence < 85%)
  evidence_period_start?: string;
  evidence_period_end?: string;
  // Resolution system fields (simplified)
  resolution_data?: {
    outcome?: 'yes' | 'no';
    source?: string;
    confidence?: 'high' | 'medium' | 'low' | number;
    timestamp?: string;
    final_outcome?: 'yes' | 'no';
    resolved_by?: 'api' | 'admin' | 'contract' | 'pending';
    admin_notes?: string;
    transaction_id?: string;
    perplexity_result?: any;
    gemini_result?: any;
    evidence_collection_active?: boolean;
    needs_manual_review?: boolean;
  };
}

interface BettingMarketsProps {
  onPlaceBet: (marketId: string, position: 'yes' | 'no', amount: number) => void;
  userBalance: number;
  onMarketSelect?: (market: BettingMarket) => void;
  markets?: BettingMarket[];
  onCreateMarket?: () => void;
  statusFilter?: 'active' | 'pending_resolution' | 'all';
  showEvidence?: boolean;
  showUnified?: boolean;
  walletConnected?: boolean;
  onConnectWallet?: () => void;
}

// No more dummy markets - all markets come from Supabase now  
export const realTimeMarkets: BettingMarket[] = [];

export default function BettingMarkets({ onPlaceBet, userBalance, onMarketSelect, markets = [], onCreateMarket, statusFilter = 'all', showEvidence = false, showUnified = false, walletConnected = false, onConnectWallet }: BettingMarketsProps) {
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<BettingMarket | null>(null);
  const [betPosition, setBetPosition] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null);
  const [isCalculatingCost, setIsCalculatingCost] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [sortBy, setSortBy] = useState('trending'); // trending, recent, popular
  const [marketTypeFilter, setMarketTypeFilter] = useState('all'); // all, active, pending, resolved
  const { language } = useLanguage();

  // Calculate estimated cost from blockchain when bet amount changes
  useEffect(() => {
    const calculateEstimatedCost = async () => {
      if (!betAmount || !selectedMarket || parseFloat(betAmount) <= 0) {
        setEstimatedCost(null);
        return;
      }

      const contractAddress = (selectedMarket as any).contractAddress || (selectedMarket as any).contract_address;
      if (!contractAddress || !contractAddress.startsWith('0x')) {
        setEstimatedCost(null);
        return;
      }

      setIsCalculatingCost(true);
      try {
        const { ethers } = await import('ethers');

        // Try multiple BSC testnet RPCs for reliability
        const bscTestnetRPCs = [
          'https://bsc-testnet-rpc.publicnode.com',
          'https://data-seed-prebsc-1-s1.binance.org:8545/',
          'https://data-seed-prebsc-2-s1.binance.org:8545/',
          'https://bsc-testnet.public.blastapi.io'
        ];

        let provider: any = null;
        for (const rpcUrl of bscTestnetRPCs) {
          try {
            const testProvider = new ethers.JsonRpcProvider(rpcUrl);
            await testProvider.getBlockNumber(); // Test connection
            provider = testProvider;
            break;
          } catch {
            // Try next RPC
          }
        }

        if (!provider) {
          // Fallback: Use simple calculation based on odds
          const odds = betPosition === 'yes' ? selectedMarket.yesOdds : selectedMarket.noOdds;
          const estimatedShares = parseFloat(betAmount) * (odds || 2.0);
          setEstimatedCost(estimatedShares.toFixed(4));
          return;
        }

        const marketABI = [
          'function getPriceYes(uint256 sharesToBuy) public view returns (uint256)',
          'function getPriceNo(uint256 sharesToBuy) public view returns (uint256)'
        ];
        const contract = new ethers.Contract(contractAddress, marketABI, provider);

        const shares = ethers.parseEther(betAmount);
        const cost = betPosition === 'yes'
          ? await contract.getPriceYes(shares)
          : await contract.getPriceNo(shares);

        const costInCast = ethers.formatEther(cost);
        setEstimatedCost(costInCast);
      } catch (error) {
        console.warn('Failed to calculate cost:', error);
        // Fallback calculation
        const odds = betPosition === 'yes' ? selectedMarket?.yesOdds : selectedMarket?.noOdds;
        const estimatedShares = parseFloat(betAmount) * (odds || 2.0);
        setEstimatedCost(estimatedShares.toFixed(4));
      } finally {
        setIsCalculatingCost(false);
      }
    };

    const debounceTimer = setTimeout(calculateEstimatedCost, 300);
    return () => clearTimeout(debounceTimer);
  }, [betAmount, betPosition, selectedMarket]);

  // Ensure all markets have safe default values to prevent crashes
  const safeMarkets = markets.map(market => ({
    ...market,
    claim: market.claim || 'Untitled Market',
    category: market.category || 'General',
    source: market.source || 'Unknown',
    totalPool: market.totalPool || 0,
    yesPool: market.yesPool || 0,
    noPool: market.noPool || 0,
    volume: market.volume || 0,  // Total CAST volume traded
    totalCasters: market.totalCasters || 0,
        yesOdds: market.yesOdds || 2.0,
        noOdds: market.noOdds || 2.0,
    confidenceLevel: market.confidenceLevel || 'medium',
    expiresAt: market.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h from now
  }));

  // Filter markets
  const filteredMarkets = safeMarkets.filter(market => {
    // Always exclude offline markets from public view
    if (market.status === 'offline') return false;

    const matchesSearch = (market.claim || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (market.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (market.source || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || market.category === selectedCategory;
    const matchesCountry = selectedCountry === 'all' || market.country === selectedCountry || market.region === selectedCountry;

    // Simple market type filtering
    const now = new Date();
    const isExpired = market.expiresAt && market.expiresAt <= now;
    const isActive = market.status === 'active' && !isExpired && market.marketType === 'future';
    const isDisputable = market.status === 'evidence_collection';

    let matchesMarketType = true;
    if (marketTypeFilter === 'active') {
      matchesMarketType = isActive;
    } else if (marketTypeFilter === 'expired') {
      matchesMarketType = isExpired && !isDisputable; // Expired but not in evidence collection
    } else if (marketTypeFilter === 'disputable') {
      matchesMarketType = isDisputable;
    } else if (marketTypeFilter === 'pending') {
      matchesMarketType = market.status === 'pending_resolution';
    } else if (marketTypeFilter === 'resolved') {
      matchesMarketType = market.status === 'resolved';
    }

    // Status filtering based on statusFilter prop and unified mode
    let matchesStatus;
    if (showUnified) {
      // In unified mode, show all markets when statusFilter is 'all'
      matchesStatus = statusFilter === 'all' || true; // Show all markets in unified mode
    } else {
      // Original filtering logic for non-unified mode
      matchesStatus = statusFilter === 'all' ||
                       (statusFilter === 'active' && isActive) ||
                       (statusFilter === 'pending_resolution' && (
                         // Past events created for verification
                         market.marketType === 'present' ||
                         // Expired markets from Truth Markets
                         isExpired ||
                         // Markets in resolution process
                         market.status === 'pending_resolution' ||
                         market.status === 'resolved'
                       ));
    }

    return matchesSearch && matchesCategory && matchesCountry && matchesMarketType && matchesStatus;
  });

  // Sort markets based on sortBy filter
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        // Sort by creation date (most recent first)
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;

      case 'popular':
        // Sort by total pool (highest first)
        return b.totalPool - a.totalPool;

      case 'trending':
      default:
        // Sort by trending first, then by total pool
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        return b.totalPool - a.totalPool;
    }
  });

  // Get unique categories and countries for filters
  const categories = ['all', ...Array.from(new Set(markets.map(m => m.category)))];
  const countries = ['all', ...Array.from(new Set(markets.map(m => m.country || m.region).filter(Boolean)))];

  const handleOpenBetDialog = (market: BettingMarket, position: 'yes' | 'no') => {
    console.log('🎯 BettingMarkets: handleOpenBetDialog called with market:', { id: market.id, claim: market.claim.substring(0, 30) });
    setSelectedMarket(market);
    setBetPosition(position);
    setBetAmount('');
    setEstimatedCost(null);
    setIsCalculatingCost(false);
    setShowBetDialog(true);
  };

  const handlePlaceBet = async () => {
    if (!walletConnected && onConnectWallet) {
      toast.info('Please connect your wallet to place bets');
      onConnectWallet();
      setShowBetDialog(false);
      return;
    }

    if (!selectedMarket || !betAmount) return;

    // Check if market is open for trading
    if (selectedMarket.status !== 'active' && selectedMarket.status !== 'open') {
      toast.error(`Cannot place bets - market is ${selectedMarket.status}. Only open markets accept new positions.`);
      setShowBetDialog(false);
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    console.log('🎯 BettingMarkets: handlePlaceBet called with selectedMarket:', { id: selectedMarket.id, claim: selectedMarket.claim.substring(0, 30) });

    try {
      await onPlaceBet(selectedMarket.id, betPosition, amount);
      setShowBetDialog(false);
      // Success message will be shown by the parent component
    } catch (error) {
      // Error message will be shown by the parent component
    }
  };

  const handleShareMarket = (market: BettingMarket) => {
    setSelectedMarket(market);
    setShowShareModal(true);
  };

  // Dispute handlers removed - no longer using dispute system

  const isMarketLive = (market: BettingMarket): boolean => {
    const now = new Date();
    return market.status === 'active' &&
           market.marketType === 'future' &&
           market.expiresAt && market.expiresAt > now;
  };


  const isMarketExpired = (market: BettingMarket): boolean => {
    return market.status === 'resolved' ||
           (market.dispute_period_end && new Date() > new Date(market.dispute_period_end));
  };

  const getMarketPhase = (market: BettingMarket): 'live' | 'expired' | 'evidence_collection' => {
    // Check if market is in evidence collection period (disputable)
    if (market.status === 'evidence_collection') {
      return 'evidence_collection';
    }

    // Check if market is truly expired (past expiry date)
    const now = new Date();
    const hasExpired = market.expiresAt && new Date(market.expiresAt).getTime() < now.getTime();

    if (hasExpired || market.status === 'resolved') {
      return 'expired';
    }
    return 'live';
  };

  const getMarketStatusLabel = (market: BettingMarket): string => {
    const phase = getMarketPhase(market);
    switch (phase) {
      case 'live': return 'Live';
      case 'evidence_collection': return 'Disputable';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  const getMarketStatusColor = (market: BettingMarket): string => {
    const phase = getMarketPhase(market);
    switch (phase) {
      case 'live': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'evidence_collection': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'expired': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0';
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return Math.round(amount).toString();
  };

  const getClaimText = (market: BettingMarket): string => {
    if (language !== 'en' && market.claimTranslations) {
      return market.claimTranslations[language] || market.claim;
    }
    return market.claim;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters - Direct on Background */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search Bar - Left Side */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={showUnified ?
                  "Search all markets, events, predictions..." :
                  statusFilter === 'active' ?
                  "Search future events, predictions..." :
                  "Search past events, expired predictions..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 md:h-12 bg-background/50 border-primary/30 focus:border-primary text-sm md:text-base"
              />
            </div>
          </div>

          {/* Filter Dropdowns - Center */}
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 h-11 bg-background/50 border-primary/30 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-11 bg-background/50 border-primary/30 text-sm">
                <SelectValue placeholder="Trending" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={marketTypeFilter} onValueChange={setMarketTypeFilter}>
              <SelectTrigger className="w-40 h-11 bg-background/50 border-primary/30 text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="active">Active Markets</SelectItem>
                <SelectItem value="expired">Expired Markets</SelectItem>
                <SelectItem value="disputable">Disputable Markets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Markets Counter & Create Button - Right Side */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {sortedMarkets.length} {
                  marketTypeFilter === 'active' ? 'Active' :
                  marketTypeFilter === 'expired' ? 'Expired' :
                  marketTypeFilter === 'disputable' ? 'Disputable' :
                  'Total'
                } Markets
              </span>
            </div>
            {onCreateMarket && (
              <Button
                onClick={onCreateMarket}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {showUnified ? 'Create Market' :
                 statusFilter === 'active' ? 'Create Prediction' : 'Submit Past Event'}
              </Button>
            )}
          </div>
        </div>

      {/* Markets Grid - Responsive */}
      {sortedMarkets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No markets found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedMarkets.map((market) => (
            <Card
              key={market.id}
              className={`relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/50 bg-card/80 backdrop-blur-sm rounded-xl ${
                market.trending ? 'trending-corner' : ''
              }`}
              onClick={() => onMarketSelect && onMarketSelect(market)}
            >
              {market.trending && (
                <div className="absolute top-0 left-0 z-10">
                  <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-2 py-1 text-xs font-bold transform -rotate-45 translate-x-[-8px] translate-y-[10px] shadow-lg">
                    TRENDING
                  </div>
                </div>
              )}

              {market.imageUrl && (
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={market.imageUrl} 
                    alt={market.claim}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  

                  {/* Country/Region Badge */}
                  {(market.country || market.region) && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/90 text-foreground">
                      {market.country || market.region}
                    </Badge>
                  )}
                </div>
              )}

              <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs shrink-0 bg-slate-700 text-white border border-gray-400 font-semibold rounded-lg px-4 py-2 shadow-sm">
                      {market.category}
                    </Badge>
                    {market.expiresAt && new Date(market.expiresAt).getTime() < new Date().getTime() && (
                      <Badge variant="destructive" className="text-xs shrink-0 font-semibold">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareMarket(market);
                    }}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 rounded-full"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <CardTitle className="text-sm md:text-base leading-tight line-clamp-3 group-hover:text-primary transition-colors font-semibold">
                  {getClaimText(market)}
                </CardTitle>
                
                <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                  Source: {market.source}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 px-4 pb-4">
                {/* Pool Information */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground" title="Total CAST tokens locked in this market's liquidity pool">Liquidity Pool</span>
                    <span className="font-semibold">{formatCurrency(market.volume)} CAST</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="text-muted-foreground">{formatCurrency(market.totalCasters)} verifiers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-muted-foreground">{formatTimeRemaining(market.expiresAt)}</span>
                    </div>
                  </div>

                  {/* Pool Distribution */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                      style={{ width: `${market.totalPool > 0 ? (market.yesPool / market.totalPool) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons - Three Phase System */}
                {(() => {
                  const phase = getMarketPhase(market);
                  const statusColor = getMarketStatusColor(market);
                  const statusLabel = getMarketStatusLabel(market);

                  switch (phase) {
                    case 'live':
                      // Phase 1: Live markets - Show Y/N buttons with odds
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBetDialog(market, 'yes');
                            }}
                            className="flex-1 bg-green-500/10 border-green-500/40 hover:bg-green-500/20 text-green-400 hover:text-green-300 h-10 text-xs md:text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            YES {market.yesOdds.toFixed(2)}x
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBetDialog(market, 'no');
                            }}
                            className="flex-1 bg-red-500/10 border-red-500/40 hover:bg-red-500/20 text-red-400 hover:text-red-300 h-10 text-xs md:text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            NO {market.noOdds.toFixed(2)}x
                          </Button>
                        </div>
                      );

                    case 'evidence_collection':
                      // Phase 2: Evidence Collection Period - Show "DISPUTABLE" badge with countdown
                      const evidenceEndTime = market.evidence_period_end ? new Date(market.evidence_period_end) : null;
                      const timeUntilEnd = evidenceEndTime ? Math.max(0, evidenceEndTime.getTime() - Date.now()) : 0;
                      const hoursRemaining = Math.floor(timeUntilEnd / (1000 * 60 * 60));
                      const minutesRemaining = Math.floor((timeUntilEnd % (1000 * 60 * 60)) / (1000 * 60));

                      return (
                        <div className="space-y-2">
                          {/* DISPUTABLE Badge */}
                          <div className="flex justify-center">
                            <Badge className={`text-sm font-bold px-4 py-2 ${statusColor} rounded-full shadow-md animate-pulse`}>
                              ⚠️ DISPUTABLE
                            </Badge>
                          </div>

                          {/* Countdown */}
                          <div className="text-center text-xs text-yellow-400">
                            <Clock className="h-3 w-3 inline-block mr-1" />
                            {hoursRemaining}h {minutesRemaining}m remaining to submit evidence
                          </div>

                          {/* Click to submit evidence */}
                          <div className="text-center text-xs text-muted-foreground">
                            Click to view & submit evidence
                          </div>
                        </div>
                      );

                    case 'expired':
                      // Phase 3: Expired markets - Show "EXPIRED" badge
                      return (
                        <div className="space-y-2">
                          {/* EXPIRED Badge */}
                          <div className="flex justify-center">
                            <Badge className={`text-sm font-bold px-4 py-2 ${statusColor} rounded-full shadow-md`}>
                              ⏳ EXPIRED
                            </Badge>
                          </div>

                          {/* Final outcome if resolved */}
                          {market.resolution_data?.final_outcome ? (
                            <div className="text-center space-y-2">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Final Result:</div>
                                <Badge
                                  className={`text-sm font-bold rounded-full px-4 py-1 shadow-md ${
                                    market.resolution_data.final_outcome === 'yes'
                                      ? 'bg-green-500 text-white'
                                      : 'bg-red-500 text-white'
                                  }`}
                                >
                                  ✓ {market.resolution_data.final_outcome.toUpperCase()}
                                </Badge>
                              </div>
                              {/* Show confidence score if available */}
                              {market.resolution_data.confidence !== undefined && (
                                <div className="text-xs space-y-1">
                                  <Badge
                                    className={`${
                                      market.resolution_data.confidence >= 80
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        : market.resolution_data.confidence >= 60
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                        : market.resolution_data.confidence >= 40
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    }`}
                                  >
                                    {market.resolution_data.confidence}% ({
                                      market.resolution_data.confidence >= 80 ? 'High' :
                                      market.resolution_data.confidence >= 60 ? 'Moderate' :
                                      market.resolution_data.confidence >= 40 ? 'Low' : 'Very Low'
                                    } Confidence)
                                  </Badge>

                                  {/* Show Gemini fallback badge if used */}
                                  {market.resolution_data.gemini_fallback_used === 'yes' && (
                                    <div>
                                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                        ✓ Gemini verified
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-muted-foreground">
                              Market resolution complete
                            </div>
                          )}
                        </div>
                      );

                    default:
                      return (
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-xs">
                            Unknown Status
                          </Badge>
                        </div>
                      );
                  }
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bet Dialog */}
      <AlertDialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cast Your Truth Position</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{selectedMarket?.claim}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Source: {selectedMarket?.source}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={betPosition === 'yes' ? 'default' : 'outline'}
                  onClick={() => setBetPosition('yes')}
                  className="h-auto p-3 flex-col gap-1"
                >
                  <span className="text-lg">True</span>
                  <span className="text-sm opacity-80">
                    {selectedMarket?.yesOdds.toFixed(2)}x odds
                  </span>
                </Button>
                <Button
                  variant={betPosition === 'no' ? 'default' : 'outline'}
                  onClick={() => setBetPosition('no')}
                  className="h-auto p-3 flex-col gap-1"
                >
                  <span className="text-lg">False</span>
                  <span className="text-sm opacity-80">
                    {selectedMarket?.noOdds.toFixed(2)}x odds
                  </span>
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="betAmount">Shares to Buy</Label>
                <Input
                  id="betAmount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={userBalance}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter number of shares..."
                />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance: {userBalance.toFixed(3)} CAST</span>
                  </div>

                  {/* Real-time cost preview */}
                  {betAmount && parseFloat(betAmount) > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-900 dark:text-blue-100">Actual Cost:</span>
                        {isCalculatingCost ? (
                          <span className="text-blue-600 dark:text-blue-400 animate-pulse">Calculating...</span>
                        ) : estimatedCost ? (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {parseFloat(estimatedCost).toFixed(3)} CAST
                          </span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">~{betAmount} CAST</span>
                        )}
                      </div>

                      {estimatedCost && (
                        <>
                          <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                            <span>Price per share:</span>
                            <span>{(parseFloat(estimatedCost) / parseFloat(betAmount)).toFixed(4)} CAST</span>
                          </div>
                          <div className="flex justify-between text-xs text-green-700 dark:text-green-300 font-medium">
                            <span>Potential win:</span>
                            <span>{(parseFloat(estimatedCost) * (betPosition === 'yes' ? selectedMarket.yesOdds : selectedMarket.noOdds)).toFixed(3)} CAST</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEstimatedCost(null);
              setIsCalculatingCost(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePlaceBet}
              disabled={isCalculatingCost || (betAmount && parseFloat(betAmount) > 0 && !estimatedCost)}
            >
              {!walletConnected ? 'Connect Wallet' : estimatedCost ? `Pay ${parseFloat(estimatedCost).toFixed(3)} CAST` : 'Cast Position'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedMarket(null);
          }}
          market={selectedMarket}
        />
      )}
    </div>
  );
}