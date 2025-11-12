import React, { useState } from 'react';
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
import { DISPUTE_PERIOD } from '../../config/constants';

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
  status: 'active' | 'pending_resolution' | 'disputing' | 'resolved' | 'disputed_resolution' | 'locked' | 'disputable' | 'offline';
  resolution?: 'yes' | 'no';
  trending: boolean;
  imageUrl?: string;
  country?: string;
  region?: string;
  marketType: 'present' | 'future';
  confidenceLevel: 'high' | 'medium' | 'low';
  // Resolution system fields
  resolution_data?: {
    outcome?: 'yes' | 'no';
    source?: string;
    confidence?: 'high' | 'medium' | 'low';
    timestamp?: string;
    final_outcome?: 'yes' | 'no';
    resolved_by?: 'api' | 'admin' | 'contract';
    admin_notes?: string;
    hcs_topic_id?: string;
    transaction_id?: string;
    consensus_timestamp?: string;
  };
  dispute_count?: number;
  dispute_period_end?: string;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [sortBy, setSortBy] = useState('trending'); // trending, recent, popular
  const [marketTypeFilter, setMarketTypeFilter] = useState('all'); // all, active, disputable
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeMarket, setDisputeMarket] = useState<BettingMarket | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const { language } = useLanguage();

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
    const isDisputable = (market.status === 'pending_resolution' || market.status === 'disputing' ||
                         market.status === 'disputable' || isExpired) && market.status !== 'resolved';

    let matchesMarketType = true;
    if (marketTypeFilter === 'active') {
      matchesMarketType = isActive;
    } else if (marketTypeFilter === 'disputable') {
      matchesMarketType = isDisputable;
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
                         market.status === 'disputing' ||
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

  const handleDispute = (market: BettingMarket) => {
    setDisputeMarket(market);
    setDisputeReason('');
    setDisputeEvidence('');
    setShowDisputeDialog(true);
  };

  const submitDispute = async () => {
    if (!disputeMarket || !disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    try {
      // TODO: Submit dispute to backend
      toast.success('Dispute submitted successfully. It will be reviewed by moderators.');
      setShowDisputeDialog(false);
    } catch (error) {
      toast.error('Failed to submit dispute');
    }
  };

  const isMarketLive = (market: BettingMarket): boolean => {
    const now = new Date();
    return market.status === 'active' &&
           market.marketType === 'future' &&
           market.expiresAt && market.expiresAt > now;
  };

  const isMarketDisputable = (market: BettingMarket): boolean => {
    if (market.status === 'resolved') return false;

    const now = new Date();

    // Check if market has resolution data with confidence score
    const hasConfidenceData = market.resolution_data &&
                              (market.resolution_data as any).finalConfidence !== undefined;
    const confidenceScore = hasConfidenceData
      ? (market.resolution_data as any).finalConfidence
      : 0;

    // Markets remain disputable if:
    // 1. They are in disputable/pending_resolution/disputing status
    // 2. OR they have expired but confidence < 80% (regardless of dispute period end)
    // 3. Until confidence reaches 80% OR 30 days have passed (refund threshold)

    const isExpired = market.expiresAt && market.expiresAt <= now;
    const hasReachedConfidenceThreshold = confidenceScore >= 80;

    // If confidence has reached 80%, use the original dispute period logic
    if (hasReachedConfidenceThreshold && market.dispute_period_end) {
      const disputePeriodEnd = new Date(market.dispute_period_end);
      return now <= disputePeriodEnd;
    }

    // If confidence is still below 80%, keep market disputable
    // (regardless of how long it's been since expiration)
    return (
      market.status === 'pending_resolution' ||
      market.status === 'disputing' ||
      market.status === 'disputable' ||
      (isExpired && !hasReachedConfidenceThreshold && market.status !== 'resolved')
    );
  };

  const isMarketExpired = (market: BettingMarket): boolean => {
    return market.status === 'resolved' ||
           (market.dispute_period_end && new Date() > new Date(market.dispute_period_end));
  };

  const getMarketPhase = (market: BettingMarket): 'live' | 'disputable' | 'expired' => {
    if (isMarketLive(market)) return 'live';
    if (isMarketDisputable(market)) return 'disputable';
    return 'expired';
  };

  const getMarketStatusLabel = (market: BettingMarket): string => {
    const phase = getMarketPhase(market);
    switch (phase) {
      case 'live': return 'Live';
      case 'disputable': return 'Disputable';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  const getMarketStatusColor = (market: BettingMarket): string => {
    const phase = getMarketPhase(market);
    switch (phase) {
      case 'live': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'disputable': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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
              <SelectTrigger className="w-36 h-11 bg-background/50 border-primary/30 text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="active">Active Markets</SelectItem>
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
                  <Badge variant="secondary" className="text-xs shrink-0 bg-slate-700 text-white border border-gray-400 font-semibold rounded-lg px-4 py-2 shadow-sm">
                    {market.category}
                  </Badge>
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

                    case 'disputable':
                      // Phase 2: Disputable markets - Show "DISPUTABLE" badge, no odds, clicking goes to evidence submission
                      return (
                        <div className="space-y-2">
                          {/* DISPUTABLE Badge */}
                          <div className="flex justify-center">
                            <Badge className={`text-sm font-bold px-4 py-2 ${statusColor} border-2 rounded-full shadow-md`}>
                              🔍 DISPUTABLE
                            </Badge>
                          </div>

                          {/* Time remaining for dispute period */}
                          {(() => {
                            // Priority: dispute_period_end > expired_at + 7 days > expiresAt + 7 days
                            let disputeEnd: Date;
                            if (market.dispute_period_end) {
                              disputeEnd = new Date(market.dispute_period_end);
                            } else if ((market as any).expired_at) {
                              disputeEnd = new Date(new Date((market as any).expired_at).getTime() + DISPUTE_PERIOD.MILLISECONDS);
                            } else {
                              // Fallback for old markets: use expiresAt
                              disputeEnd = new Date((market.expiresAt?.getTime() || Date.now()) + DISPUTE_PERIOD.MILLISECONDS);
                            }
                            const now = new Date();
                            const timeLeft = disputeEnd.getTime() - now.getTime();

                            if (timeLeft > 0) {
                              const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                              const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                              return (
                                <div className="text-center text-xs text-yellow-600 font-medium">
                                  ⏰ {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`} to dispute
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-center text-xs text-gray-600 font-medium">
                                  ⏱️ Dispute period ended
                                </div>
                              );
                            }
                          })()}

                          {/* Evidence submission hint */}
                          <div className="text-center text-xs text-muted-foreground">
                            Click to submit evidence
                          </div>

                          {/* Show AI resolution if available */}
                          {market.resolution_data?.outcome && (
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground">AI Resolution:</div>
                              <Badge
                                variant="outline"
                                className={`text-xs mt-1 ${
                                  market.resolution_data.outcome === 'yes'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-red-100 text-red-700 border-red-200'
                                }`}
                              >
                                {market.resolution_data.outcome.toUpperCase()}
                              </Badge>
                            </div>
                          )}
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
                            <div className="text-center">
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
            <AlertDialogDescription className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMarket?.claim}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Source: {selectedMarket?.source}
                </p>
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
                  <Label htmlFor="betAmount">Amount (CAST)</Label>
                  <Input
                    id="betAmount"
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={userBalance}
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter amount..."
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Balance: {userBalance.toFixed(3)} CAST</span>
                    {betAmount && selectedMarket && (
                      <span>
                        Potential win: {(parseFloat(betAmount) * (betPosition === 'yes' ? selectedMarket.yesOdds : selectedMarket.noOdds)).toFixed(3)} CAST
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlaceBet}>
              {!walletConnected ? 'Connect Wallet' : 'Cast Position'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dispute Dialog */}
      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Dispute Market Resolution</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{disputeMarket?.claim}</p>
                {disputeMarket?.resolution_data?.outcome && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current Resolution: <span className="font-semibold">{disputeMarket.resolution_data.outcome.toUpperCase()}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="disputeReason" className="text-sm font-medium">Reason for Dispute *</Label>
                  <Input
                    id="disputeReason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g., Incorrect information, biased sources..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="disputeEvidence" className="text-sm font-medium">Supporting Evidence (optional)</Label>
                  <textarea
                    id="disputeEvidence"
                    value={disputeEvidence}
                    onChange={(e) => setDisputeEvidence(e.target.value)}
                    placeholder="Provide links, sources, or additional context to support your dispute..."
                    className="mt-1 w-full px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
                    rows={3}
                  />
                </div>

                <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  ⚠️ Disputes are reviewed by moderators. False or malicious disputes may result in penalties.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDispute} className="bg-red-600 hover:bg-red-700">
              Submit Dispute
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