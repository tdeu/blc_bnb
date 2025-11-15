import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Trophy,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'sonner';

interface VolumeStats {
  totalVolumeBNB: number;
  totalVolumeUSDT: number;
  volumeToday: number;
  volumeThisWeek: number;
  volumeThisMonth: number;
}

interface TopMarket {
  id: string;
  claim: string;
  totalBets: number;
  totalVolume: number;
  category: string;
}

interface RevenueBreakdown {
  protocolFees: number;
  tokenSales: number;
  creatorRewards: number;
}

export default function ReportsDashboard() {
  const [volumeStats, setVolumeStats] = useState<VolumeStats>({
    totalVolumeBNB: 0,
    totalVolumeUSDT: 0,
    volumeToday: 0,
    volumeThisWeek: 0,
    volumeThisMonth: 0
  });
  const [topMarkets, setTopMarkets] = useState<TopMarket[]>([]);
  const [revenue, setRevenue] = useState<RevenueBreakdown>({
    protocolFees: 0,
    tokenSales: 0,
    creatorRewards: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);

    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Load all bets to calculate volume
      const { data: allBets } = await supabase
        .from('bets')
        .select('amount, created_at');

      const totalVolume = allBets?.reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;
      const volumeToday = allBets?.filter(b => new Date(b.created_at) >= today)
        .reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;
      const volumeWeek = allBets?.filter(b => new Date(b.created_at) >= weekAgo)
        .reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;
      const volumeMonth = allBets?.filter(b => new Date(b.created_at) >= monthAgo)
        .reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;

      setVolumeStats({
        totalVolumeBNB: totalVolume,
        totalVolumeUSDT: totalVolume * 600, // Mock conversion rate
        volumeToday: volumeToday,
        volumeThisWeek: volumeWeek,
        volumeThisMonth: volumeMonth
      });

      // Load top markets by volume
      const { data: markets } = await supabase
        .from('approved_markets')
        .select('id, claim, category, volume')
        .order('volume', { ascending: false })
        .limit(10);

      // For each market, count the number of bets
      const marketsWithBets = await Promise.all(
        (markets || []).map(async (market) => {
          const { count } = await supabase
            .from('bets')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', market.id);

          return {
            id: market.id,
            claim: market.claim,
            totalBets: count || 0,
            totalVolume: market.volume || 0,
            category: market.category
          };
        })
      );

      setTopMarkets(marketsWithBets);

      // Revenue breakdown (mock for now)
      setRevenue({
        protocolFees: totalVolume * 0.02, // 2% fees
        tokenSales: 5.4, // From treasury
        creatorRewards: totalVolume * 0.005 // 0.5%
      });

    } catch (error) {
      console.error('Error loading reports data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReportsData();
    toast.success('Reports refreshed!');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Analytics & Reports
          </h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive platform analytics and performance metrics
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Volume Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold text-blue-600">
                  {volumeStats.totalVolumeBNB.toFixed(4)} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~${volumeStats.totalVolumeUSDT.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {volumeStats.volumeToday.toFixed(4)} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 24 hours
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-purple-600">
                  {volumeStats.volumeThisWeek.toFixed(4)} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-orange-600">
                  {volumeStats.volumeThisMonth.toFixed(4)} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 30 days
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Revenue Breakdown
          </CardTitle>
          <CardDescription>
            Revenue by category and timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Protocol Fees (2%)</p>
                <p className="text-xl font-bold text-purple-600">{revenue.protocolFees.toFixed(4)} BNB</p>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                Market resolutions
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Sales</p>
                <p className="text-xl font-bold text-green-600">{revenue.tokenSales.toFixed(4)} BNB</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                CAST purchases
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Creator Rewards (0.5%)</p>
                <p className="text-xl font-bold text-blue-600">{revenue.creatorRewards.toFixed(4)} BNB</p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Market creators
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Markets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Markets
          </CardTitle>
          <CardDescription>
            Most active and profitable prediction markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topMarkets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No markets data available yet
              </p>
            ) : (
              topMarkets.map((market, index) => (
                <div
                  key={market.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{market.claim}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getCategoryColor(market.category)}`}>
                          {market.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {market.totalBets} bets
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      {market.totalVolume.toFixed(4)} BNB
                    </p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
