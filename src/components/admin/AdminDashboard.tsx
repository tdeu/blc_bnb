import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  BarChart3,
  Users,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Brain,
  Calendar,
  History,
  Timer,
  EyeOff,
  Eye,
  Gavel,
  ChevronDown,
  ChevronUp,
  Scale,
  RefreshCw,
  Target
} from 'lucide-react';
import { adminService, AdminStats } from '../../utils/adminService';
import AdminDisputePanel from '../dispute/AdminDisputePanel';
import { disputeService } from '../../utils/disputeService';
import { MarketDispute } from '../../utils/supabase';
import { AIAgentSimple } from '../ai/AIAgentSimple';
import { approvedMarketsService } from '../../utils/approvedMarketsService';
import { BettingMarket } from '../betting/BettingMarkets';
import TwoStageResolutionPanel from './TwoStageResolutionPanel';
import ThreeSignalPanel from './ThreeSignalPanel';
import { resolutionService } from '../../utils/resolutionService';
import { toast } from 'sonner';

interface AdminOverviewProps {
  userProfile?: {
    walletAddress: string;
    displayName?: string;
  };
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ userProfile }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<MarketDispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [markets, setMarkets] = useState<BettingMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isOfflineMarketsExpanded, setIsOfflineMarketsExpanded] = useState(false);
  const [syncingMarkets, setSyncingMarkets] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAdminStats();
    loadDisputes();
    loadMarkets();
    loadAIRecommendations();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const adminStats = await adminService.getAdminStats();
      setStats(adminStats);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      setDisputesLoading(true);
      const pendingDisputes = await disputeService.getPendingDisputes();
      setDisputes(pendingDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setDisputesLoading(false);
    }
  };

  const loadMarkets = async () => {
    try {
      setMarketsLoading(true);
      const allMarkets = await approvedMarketsService.getApprovedMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setMarketsLoading(false);
    }
  };

  const loadAIRecommendations = async () => {
    try {
      setAiLoading(true);
      // Mock AI recommendations for now - in production this would call the AI service
      const mockRecommendations = [
        {
          id: 'ai-rec-1',
          marketId: 'market-123',
          marketTitle: 'Kenya Elections 2024 - Raila Odinga to win presidency',
          recommendedOutcome: 'NO',
          confidence: 92,
          reasoning: 'Based on 15 polling stations data and 3 major news sources in English and Swahili. Cross-referenced with historical voting patterns.',
          priority: 'HIGH',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          status: 'pending',
          evidenceSources: ['Nation.co.ke', 'KBC News', 'Standard Digital'],
          culturalContext: 'Kenyan political analysis',
          languages: ['English', 'Swahili']
        },
        {
          id: 'ai-rec-2',
          marketId: 'market-456',
          marketTitle: 'Nigeria GDP Growth Q3 2024 > 3%',
          recommendedOutcome: 'YES',
          confidence: 78,
          reasoning: 'National Bureau of Statistics preliminary data suggests 3.1% growth. Medium confidence due to ongoing data validation.',
          priority: 'MEDIUM',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'pending',
          evidenceSources: ['NBS Nigeria', 'Premium Times', 'BusinessDay'],
          culturalContext: 'Nigerian economic indicators',
          languages: ['English', 'Hausa']
        },
        {
          id: 'ai-rec-3',
          marketId: 'market-789',
          marketTitle: 'South Africa Rand to reach 20:1 USD by Dec 2024',
          recommendedOutcome: 'YES',
          confidence: 95,
          reasoning: 'Current trajectory at 18.7:1, multiple economic indicators point to continued weakening. High confidence - ready for auto-execution.',
          priority: 'HIGH',
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          status: 'auto_execute_ready',
          evidenceSources: ['SARB', 'Bloomberg Africa', 'Business Tech'],
          culturalContext: 'South African currency markets',
          languages: ['English', 'Afrikaans']
        }
      ];
      setAiRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      setAiRecommendations([]);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper functions to categorize markets - mutually exclusive categories
  // NOTE: expiresAt = when dispute period starts, NOT final expiration
  const categorizeMarkets = (markets: BettingMarket[]) => {
    const now = new Date();

    // Mutually exclusive categorization
    const futureMarkets: BettingMarket[] = [];
    const disputableMarkets: BettingMarket[] = [];
    const expiredMarkets: BettingMarket[] = [];
    const offlineMarkets: BettingMarket[] = [];

    markets.forEach(market => {
      // First, categorize offline markets
      if (market.status === 'offline') {
        offlineMarkets.push(market);
        return;
      }

      // Future Markets: Active markets where dispute period hasn't started yet
      if (market.status === 'active' && market.marketType === 'future') {
        // If expiresAt is in the future, it's still a future market
        const disputePeriodStarted = market.expiresAt && market.expiresAt <= now;

        if (!disputePeriodStarted) {
          futureMarkets.push(market);
          return;
        }
      }

      // Disputable Markets: Markets where dispute period has started but not resolved
      if (
        // Markets in active dispute states
        market.status === 'pending_resolution' ||
        market.status === 'disputing' ||
        market.status === 'disputable' ||
        // OR active markets where dispute period has started (expiresAt passed)
        (market.status === 'active' && market.expiresAt && market.expiresAt <= now)
      ) {
        disputableMarkets.push(market);
        return;
      }

      // Expired Markets: Everything else (resolved, present-type markets, etc.)
      expiredMarkets.push(market);
    });

    return {
      future: futureMarkets,
      disputable: disputableMarkets,
      expired: expiredMarkets,
      offline: offlineMarkets,
      total: markets.length
    };
  };

  const handleReviewDispute = async (disputeId: string, decision: any) => {
    try {
      await disputeService.reviewDispute(disputeId, decision);
      // Reload disputes after review
      await loadDisputes();
      await loadAdminStats(); // Update stats as well
    } catch (error) {
      console.error('Error reviewing dispute:', error);
      throw error; // Re-throw to let the component handle the error
    }
  };

  const handleOfflineMarket = async (market: BettingMarket) => {
    if (!userProfile?.walletAddress) {
      console.error('Admin wallet not connected');
      return;
    }

    try {
      const success = await adminService.offlineMarket(
        market.id,
        userProfile.walletAddress,
        'Market taken offline by admin'
      );

      if (success) {
        console.log(`Market "${market.claim}" has been taken offline`);
        // Reload markets to reflect the change
        await loadMarkets();
      } else {
        console.error('Failed to offline market');
      }
    } catch (error) {
      console.error('Error offlining market:', error);
    }
  };

  const handleOnlineMarket = async (market: BettingMarket) => {
    if (!userProfile?.walletAddress) {
      console.error('Admin wallet not connected');
      return;
    }

    try {
      const success = await adminService.onlineMarket(
        market.id,
        userProfile.walletAddress,
        'Market brought back online by admin'
      );

      if (success) {
        console.log(`Market "${market.claim}" has been brought back online`);
        // Reload markets to reflect the change
        await loadMarkets();
      } else {
        console.error('Failed to bring market online');
      }
    } catch (error) {
      console.error('Error bringing market online:', error);
    }
  };

  const handleSyncToBlockchain = async (market: BettingMarket) => {
    if (!userProfile?.walletAddress) {
      toast.error('Wallet not connected');
      return;
    }

    // Add to syncing set
    setSyncingMarkets(prev => new Set(prev).add(market.id));

    try {
      toast.info('Syncing market to blockchain...');

      // Call preliminaryResolve - default to YES (1) as outcome
      // The resolutionService will fetch the contract address from the database
      const outcome = 1; // YES

      const result = await resolutionService.preliminaryResolveMarket(
        market.id,
        outcome,
        'Synced to blockchain by admin'
      );

      // If we got here without throwing, it succeeded
      if (result.transactionId) {
        toast.success(`Market synced to blockchain! TX: ${result.transactionId.slice(0, 10)}...`);
      } else {
        toast.success('Market synced to blockchain!');
      }

      // Reload markets to refresh status
      await loadMarkets();
    } catch (error: any) {
      console.error('Error syncing market to blockchain:', error);
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      // Remove from syncing set
      setSyncingMarkets(prev => {
        const newSet = new Set(prev);
        newSet.delete(market.id);
        return newSet;
      });
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = "default" 
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    color?: "default" | "green" | "red" | "blue" | "yellow";
  }) => {
    const colorClasses = {
      default: "bg-white dark:bg-gray-800",
      green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    };

    return (
      <Card className={colorClasses[color]}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-red-600">Failed to load admin statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome to BlockCast Admin</h2>
        <p className="opacity-90">
          Manage markets, users, and platform operations. Current admin: {' '}
          {userProfile?.displayName || `${userProfile?.walletAddress?.slice(0, 6)}...${userProfile?.walletAddress?.slice(-4)}`}
        </p>
      </div>

      {/* Key Metrics - Real Market Data */}
      {(() => {
        const marketData = categorizeMarkets(markets);
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Future Markets"
              value={marketData.future.length}
              icon={Calendar}
              trend={`${marketData.future.length} active betting markets`}
              color="blue"
            />

            <StatCard
              title="Disputable Markets"
              value={marketData.disputable.length}
              icon={Scale}
              trend={`${marketData.disputable.length} markets in dispute period or resolution`}
              color="yellow"
            />

            <StatCard
              title="Expired Markets"
              value={marketData.expired.length}
              icon={Timer}
              trend={`${marketData.expired.length} total expired markets`}
              color="red"
            />

            <StatCard
              title="Total Markets"
              value={marketData.total}
              icon={BarChart3}
              trend={`${marketData.total} total markets`}
              color="default"
            />
          </div>
        );
      })()}

      {/* Market Listings by Type */}
      {(() => {
        const marketData = categorizeMarkets(markets);

        const MarketCard = ({ market, showSyncButton = false }: { market: BettingMarket; showSyncButton?: boolean }) => {
          const isSyncing = syncingMarkets.has(market.id);

          return (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm line-clamp-1">{market.claim}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{market.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {market.expiresAt ? new Date(market.expiresAt).toLocaleDateString() : 'No expiry'}
                  </span>
                  {market.status === 'offline' && (
                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium">{market.totalPool.toFixed(2)} HBAR</p>
                  <p className="text-xs text-muted-foreground">{market.totalCasters} bets</p>
                </div>
                {showSyncButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncToBlockchain(market)}
                    disabled={isSyncing}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Sync market to blockchain (calls preliminaryResolve)"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {market.status === 'offline' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOnlineMarket(market)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Bring market back online"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOfflineMarket(market)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Take market offline"
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Future Markets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Future Markets ({marketData.future.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                  {marketData.future.length > 0 ? (
                    marketData.future.slice(0, 10).map(market => (
                      <MarketCard key={market.id} market={market} />
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No future markets</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Disputable Markets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Disputable Markets ({marketData.disputable.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                  {marketData.disputable.length > 0 ? (
                    marketData.disputable.slice(0, 10).map(market => (
                      <MarketCard key={market.id} market={market} showSyncButton={true} />
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No disputable markets</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expired Markets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Expired Markets ({marketData.expired.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                  {marketData.expired.length > 0 ? (
                    marketData.expired.slice(0, 10).map(market => (
                      <MarketCard key={market.id} market={market} />
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No expired markets</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Offline Markets Section - Collapsible */}
            {marketData.offline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -m-2 rounded"
                    onClick={() => setIsOfflineMarketsExpanded(!isOfflineMarketsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-5 w-5" />
                      Offline Markets ({marketData.offline.length})
                    </div>
                    <Button variant="ghost" size="sm">
                      {isOfflineMarketsExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isOfflineMarketsExpanded && (
                  <CardContent className="space-y-3 max-h-60 overflow-y-auto">
                    {marketData.offline.map(market => (
                      <MarketCard key={market.id} market={market} />
                    ))}
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        );
      })()}

      {/* Three-Signal Analysis Panel */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Three-Signal Resolution Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThreeSignalPanel
              userProfile={userProfile || { walletAddress: 'unknown' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Two-Stage Resolution Panel */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Market Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TwoStageResolutionPanel
              userProfile={userProfile || { walletAddress: 'unknown' }}
            />
          </CardContent>
        </Card>
      </div>


      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Blockchain Services</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Hedera Network: Online</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Smart Contracts: Active</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">HCS Topics: Healthy</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">AI Agent Status</h4>
              <AIAgentSimple compact={true} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            AI Recommendations
            <Badge variant="outline" className="ml-auto">
              {aiRecommendations.length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading AI recommendations...</p>
            </div>
          ) : aiRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No AI recommendations pending</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm leading-tight mb-2">
                        {recommendation.marketTitle}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={recommendation.recommendedOutcome === 'YES' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          Recommend: {recommendation.recommendedOutcome}
                        </Badge>
                        <Badge
                          variant={
                            recommendation.confidence >= 90 ? 'default' :
                            recommendation.confidence >= 70 ? 'secondary' : 'outline'
                          }
                          className={`text-xs ${
                            recommendation.confidence >= 90 ? 'bg-green-100 text-green-800' :
                            recommendation.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {recommendation.confidence}% confidence
                        </Badge>
                        <Badge
                          variant={recommendation.priority === 'HIGH' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {recommendation.priority}
                        </Badge>
                        {recommendation.status === 'auto_execute_ready' && (
                          <Badge className="text-xs bg-blue-100 text-blue-800">
                            Auto-Execute Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {recommendation.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                    <p className="mb-2">{recommendation.reasoning}</p>
                    <div className="space-y-1">
                      <p><strong>Sources:</strong> {recommendation.evidenceSources.join(', ')}</p>
                      <p><strong>Languages:</strong> {recommendation.languages.join(', ')}</p>
                      <p><strong>Context:</strong> {recommendation.culturalContext}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {recommendation.status === 'auto_execute_ready' ? (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          // TODO: Implement auto-execution
                          console.log('Auto-executing:', recommendation.id);
                        }}
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        Auto-Execute ({recommendation.confidence}%)
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            // TODO: Implement manual approval
                            console.log('Approving:', recommendation.id);
                          }}
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement review request
                            console.log('Requesting review:', recommendation.id);
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // TODO: Implement reject
                        console.log('Rejecting:', recommendation.id);
                      }}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Auto-execution threshold: ≥90% confidence</span>
                    <span>•</span>
                    <span>Manual review: 70-89% confidence</span>
                    <span>•</span>
                    <span>Flagged for review: &lt;70% confidence</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadAIRecommendations}
                    disabled={aiLoading}
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;