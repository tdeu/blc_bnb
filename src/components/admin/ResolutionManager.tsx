import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronRight, ChevronDown, Clock, AlertCircle, Calendar, Brain, Loader2 } from 'lucide-react';
import { supabase, ApprovedMarket } from '../../utils/supabase';
import { BettingMarket } from '../betting/BettingMarkets';
import CountdownTimer from '../ui/CountdownTimer';
import { toast } from 'sonner';
import { aiResolutionScheduler } from '../../services/aiResolutionScheduler';

interface MarketWithDates extends BettingMarket {
  createdAt: Date;
}

interface ResolutionManagerProps {
  userProfile?: {
    walletAddress: string;
    displayName?: string;
  };
}

const ResolutionManager: React.FC<ResolutionManagerProps> = ({ userProfile }) => {
  const [groupedMarkets, setGroupedMarkets] = useState<{ [key: string]: MarketWithDates[] }>({});
  const [loading, setLoading] = useState(true);
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [resolvingMarkets, setResolvingMarkets] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching markets:', error);
        toast.error('Failed to load markets');
        return;
      }

      if (!data) {
        setGroupedMarkets({});
        return;
      }

      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Filter out markets that expired more than 10 days ago
      const filteredMarkets = data.filter((market) => {
        const expiryDate = new Date(market.expires_at);
        // Keep if: market is not expired OR expired less than 10 days ago
        return expiryDate > tenDaysAgo;
      });

      // Convert to MarketWithDates
      const marketsWithDates: MarketWithDates[] = filteredMarkets.map((market) => ({
        id: market.id,
        claim: market.claim,
        description: market.description || '',
        category: market.category,
        country: market.country,
        region: market.region,
        marketType: market.market_type as any,
        confidenceLevel: market.confidence_level as any,
        expiresAt: new Date(market.expires_at),
        createdAt: new Date(market.created_at),
        status: (market.status as any) || 'active',
        imageUrl: market.image_url,
        contractAddress: market.contract_address, // Map DB snake_case to camelCase
        resolution_data: market.resolution_data,
        yesOdds: market.yes_odds || 2.0,
        noOdds: market.no_odds || 2.0,
        volume: market.volume || 0,
        totalPool: market.volume || 0,
        yesPool: 0,
        noPool: 0,
        totalCasters: 0,
        trending: false,
      }));

      // Group markets by creation date
      const grouped = groupMarketsByCreationDate(marketsWithDates);
      setGroupedMarkets(grouped);
      setTotalCount(marketsWithDates.length);
    } catch (error) {
      console.error('Error loading markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const groupMarketsByCreationDate = (markets: MarketWithDates[]): { [key: string]: MarketWithDates[] } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: { [key: string]: MarketWithDates[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': [],
    };

    markets.forEach((market) => {
      const createdDate = new Date(market.createdAt);
      const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());

      if (createdDateOnly.getTime() === today.getTime()) {
        groups['Today'].push(market);
      } else if (createdDateOnly.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(market);
      } else if (createdDate >= weekAgo) {
        groups['This Week'].push(market);
      } else if (createdDate >= monthAgo) {
        groups['This Month'].push(market);
      } else {
        groups['Older'].push(market);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  const toggleMarketExpansion = (marketId: string) => {
    setExpandedMarketId(expandedMarketId === marketId ? null : marketId);
  };

  const isMarketExpired = (expiresAt: Date) => {
    return new Date(expiresAt) <= new Date();
  };

  const handleManualResolve = async (market: MarketWithDates) => {
    try {
      setResolvingMarkets(prev => new Set(prev).add(market.id));
      toast.info('Triggering AI resolution...');

      await aiResolutionScheduler.manuallyResolveMarket(
        market.id,
        market.claim,
        market.description,
        market.contractAddress
      );

      toast.success('Market resolved successfully!');

      // Reload markets to show updated status
      setTimeout(() => {
        loadMarkets();
      }, 2000);

    } catch (error) {
      console.error('Error resolving market:', error);
      toast.error('Failed to resolve market');
    } finally {
      setResolvingMarkets(prev => {
        const newSet = new Set(prev);
        newSet.delete(market.id);
        return newSet;
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      politics: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sports: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      entertainment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      technology: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      crypto: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const renderMarketDetails = (market: MarketWithDates) => {
    const expired = isMarketExpired(market.expiresAt);
    const isResolving = resolvingMarkets.has(market.id);
    const hasResolution = market.resolution_data && market.resolution_data.final_outcome;
    const isInEvidenceCollection = market.status === 'evidence_collection';

    // Skip markets in evidence collection - they're handled by PendingResolutionManager
    if (isInEvidenceCollection) {
      return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center justify-center space-x-2 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            <span>Market is in Evidence Collection Period</span>
          </div>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-2">
            Use the Pending Resolution Manager above to handle this market.
          </p>
        </div>
      );
    }

    if (!expired) {
      // For active markets, just show countdown
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
            <Clock className="h-5 w-5" />
            <span>Market is still active</span>
          </div>
        </div>
      );
    }

    // For expired markets, show resolution status
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
        {hasResolution ? (
          // Already resolved
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
              <Brain className="h-6 w-6" />
              <h4 className="text-lg font-semibold">Resolved by AI</h4>
            </div>
            <div className="text-center space-y-2">
              <Badge className={`text-lg px-4 py-2 ${market.resolution_data.final_outcome === 'yes' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                {market.resolution_data.final_outcome === 'yes' ? 'TRUE' : 'FALSE'}
              </Badge>

              {/* Confidence Score */}
              {market.resolution_data.confidence !== undefined && (
                <div className="flex justify-center">
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
                      market.resolution_data.confidence >= 80 ? 'High Confidence' :
                      market.resolution_data.confidence >= 60 ? 'Moderate Confidence' :
                      market.resolution_data.confidence >= 40 ? 'Low Confidence' : 'Very Low Confidence'
                    })
                  </Badge>
                </div>
              )}

              {/* Gemini Fallback Status */}
              {market.resolution_data.confidence !== undefined && (
                <div className="flex justify-center">
                  <Badge
                    className={`${
                      market.resolution_data.gemini_fallback_used === 'yes'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : market.resolution_data.confidence >= 85
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}
                  >
                    {market.resolution_data.gemini_fallback_used === 'yes'
                      ? '✓ Gemini fallback used'
                      : market.resolution_data.confidence >= 85
                      ? 'No Gemini fallback required'
                      : 'Gemini fallback required'}
                  </Badge>
                </div>
              )}

              {/* AI Source */}
              {market.resolution_data.source && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs">
                    {market.resolution_data.source}
                  </Badge>
                </div>
              )}
            </div>
            {/* Show both AI opinions if there's a conflict */}
            {market.resolution_data.perplexity_result && market.resolution_data.gemini_result && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <h5 className="text-sm font-semibold text-center">AI Opinions Comparison</h5>

                {/* Perplexity Result */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-400">Perplexity AI</span>
                    <Badge className={market.resolution_data.perplexity_result.outcome === 'yes' ? 'bg-green-500' : 'bg-red-500'}>
                      {market.resolution_data.perplexity_result.outcome.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Confidence: {market.resolution_data.perplexity_result.confidence}%
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {market.resolution_data.perplexity_result.reasoning}
                  </p>
                </div>

                {/* Gemini Result */}
                <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-800 dark:text-purple-400">Gemini AI</span>
                    <Badge className={market.resolution_data.gemini_result.outcome === 'yes' ? 'bg-green-500' : 'bg-red-500'}>
                      {market.resolution_data.gemini_result.outcome.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Confidence: {market.resolution_data.gemini_result.confidence}%
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {market.resolution_data.gemini_result.reasoning}
                  </p>
                </div>
              </div>
            )}

            {market.resolution_data.admin_notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center whitespace-pre-line">
                {market.resolution_data.admin_notes}
              </p>
            )}
          </div>
        ) : (
          // Not yet resolved - show resolve button
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="h-6 w-6" />
              <h4 className="text-lg font-semibold">Pending AI Resolution</h4>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
              This market has expired and needs AI-powered resolution
            </p>
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => handleManualResolve(market)}
                disabled={isResolving}
                className="gap-2"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Trigger AI Resolution
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Resolution Manager</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitor and resolve prediction markets
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {totalCount} {totalCount === 1 ? 'Market' : 'Markets'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Grouped Markets */}
      {Object.keys(groupedMarkets).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No markets found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedMarkets).map(([groupName, markets]) => (
          <div key={groupName} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center space-x-2 px-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {groupName}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {markets.length}
              </Badge>
            </div>

            {/* Markets in this group */}
            <div className="space-y-3">
              {markets.map((market) => {
                const isExpanded = expandedMarketId === market.id;
                const expired = isMarketExpired(market.expiresAt);

                return (
                  <Card key={market.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Market Header - Clickable */}
                      <button
                        onClick={() => toggleMarketExpansion(market.id)}
                        className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title and Category */}
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 pt-1">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                                  {market.claim}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className={`text-xs ${getCategoryColor(market.category)}`}>
                                    {market.category}
                                  </Badge>
                                  {market.status === 'offline' && (
                                    <Badge variant="destructive" className="text-xs">
                                      Offline
                                    </Badge>
                                  )}
                                  {market.status === 'resolved' && (
                                    <Badge variant="secondary" className="text-xs">
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Countdown Timer */}
                            <div className="pl-8">
                              <CountdownTimer targetDate={new Date(market.expiresAt)} />
                            </div>
                          </div>

                          {/* Market Stats */}
                          <div className="flex-shrink-0 ml-4 text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {market.totalPool.toLocaleString()} CAST
                            </div>
                            <div className="text-xs text-gray-500">
                              {market.totalCasters} casters
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                          {renderMarketDetails(market)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ResolutionManager;
