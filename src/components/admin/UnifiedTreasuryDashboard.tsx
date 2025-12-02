import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Users,
  ShoppingCart,
  Scale,
  Eye,
  Send,
  Settings,
  ChevronDown
} from 'lucide-react';
import { treasuryService as castTreasuryService, TreasuryStats, CastPurchase } from '../../services/treasuryService';
import { treasuryService as protocolTreasuryService, TreasuryBalance, FeeCollection } from '../../utils/treasuryService';
import {
  getPriceConfig,
  setPriceConfig,
  PriceConfig,
  formatUSD,
  bnbToUSD,
  castToUSD,
  calculateTVL,
  getTimeSinceUpdate
} from '../../utils/priceConfig';
import { supabase } from '../../utils/supabase';
import { toast } from 'sonner';

interface UnifiedTreasuryDashboardProps {
  isAdmin: boolean;
}

export default function UnifiedTreasuryDashboard({ isAdmin }: UnifiedTreasuryDashboardProps) {
  // CAST Token Treasury (Token Sales Revenue)
  const [castStats, setCastStats] = useState<TreasuryStats | null>(null);
  const [castPurchases, setCastPurchases] = useState<CastPurchase[]>([]);

  // Protocol Fee Treasury (Market Resolution Fees)
  const [protocolBalances, setProtocolBalances] = useState<TreasuryBalance[]>([]);
  const [feeHistory, setFeeHistory] = useState<FeeCollection[]>([]);
  const [protocolAnalytics, setProtocolAnalytics] = useState({
    totalValue: '0',
    tokenCount: 0,
    monthlyFees: '0',
    feeGrowth: '0'
  });

  // New metrics states
  const [activeBettors, setActiveBettors] = useState(0);
  const [todayTransactions, setTodayTransactions] = useState(0);
  const [change24h, setChange24h] = useState({ tvlChange: 0, tvlAdded24h: 0, revenueChange: 0, revenueAdded24h: 0, transactionChange: 0, txCount24h: 0 });

  // TVL = CAST locked in active markets (real liquidity at stake)
  const [lockedInMarkets, setLockedInMarkets] = useState<{ totalLocked: string; marketCount: number; marketDetails: Array<{id: string, claim: string, reserve: string}> }>({ totalLocked: '0', marketCount: 0, marketDetails: [] });
  const [lockedMarketsLoading, setLockedMarketsLoading] = useState(true);
  const [last24hTxns, setLast24hTxns] = useState(0);

  // Price config state
  const [priceConfig, setPriceConfigState] = useState<PriceConfig>(getPriceConfig());
  const [newBnbPrice, setNewBnbPrice] = useState(priceConfig.bnbPriceUSD.toString());
  const [priceConfigOpen, setPriceConfigOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // State for total transactions and markets count
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalMarkets, setTotalMarkets] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      loadAllTreasuryData();
    }
  }, [isAdmin]);

  const loadAllTreasuryData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize CAST treasury service
      await castTreasuryService.initialize();

      // Load core CAST token data (these are essential)
      const [stats, purchases, changes24h] = await Promise.all([
        castTreasuryService.getTreasuryStats(),
        castTreasuryService.getRecentPurchases(20),
        castTreasuryService.get24hChangeStats()
      ]);

      setCastStats(stats);
      setCastPurchases(purchases);
      setChange24h(changes24h);

      // Load additional metrics separately (these can fail without breaking the dashboard)
      setLockedMarketsLoading(true);
      try {
        const lockedData = await castTreasuryService.getTotalLockedInMarkets();
        setLockedInMarkets(lockedData);
      } catch (e) {
        console.warn('Failed to load locked markets data:', e);
      } finally {
        setLockedMarketsLoading(false);
      }

      try {
        const bettorsData = await castTreasuryService.getUniqueBettorsFromContracts();
        setActiveBettors(bettorsData.count);
      } catch (e) {
        console.warn('Failed to load bettors data:', e);
      }

      try {
        const txns24h = await castTreasuryService.getLast24hTransactionCount();
        setLast24hTxns(txns24h);
      } catch (e) {
        console.warn('Failed to load 24h transaction count:', e);
      }

      // Load protocol fee data
      const [balanceData, historyData, analyticsData] = await Promise.all([
        protocolTreasuryService.getAllBalances(),
        protocolTreasuryService.getFeeHistory(),
        protocolTreasuryService.getTreasuryAnalytics()
      ]);

      setProtocolBalances(balanceData);
      setFeeHistory(historyData);
      setProtocolAnalytics(analyticsData);

      // Calculate total transactions from all sources
      if (supabase) {
        const [
          { count: betsCount },
          { count: marketsCount },
          { count: purchasesCount },
          { count: resolutionsCount }
        ] = await Promise.all([
          supabase.from('market_predictions').select('*', { count: 'exact', head: true }),
          supabase.from('approved_markets').select('*', { count: 'exact', head: true }),
          supabase.from('cast_purchases').select('*', { count: 'exact', head: true }),
          supabase.from('approved_markets').select('*', { count: 'exact', head: true }).eq('status', 'resolved')
        ]);

        const total = (betsCount || 0) + (marketsCount || 0) + (purchasesCount || 0) + (resolutionsCount || 0);
        setTotalTransactions(total);
        setTotalMarkets(marketsCount || 0);
      }

    } catch (err: any) {
      console.error('Failed to load treasury data:', err);
      setError(err.message || 'Failed to load treasury data');
      toast.error('Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAllTreasuryData();
    toast.success('Treasury data refreshed!');
  };

  const handleUpdatePrice = () => {
    const price = parseFloat(newBnbPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid BNB price');
      return;
    }
    const updated = setPriceConfig({ bnbPriceUSD: price });
    setPriceConfigState(updated);
    toast.success(`BNB price updated to $${price}`);
  };

  const handleWithdrawBNB = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    setWithdrawing(true);

    try {
      const { getAdminSigner, getAdminAddress } = await import('../../utils/adminSigner');
      const adminSigner = await getAdminSigner();
      const adminAddress = await getAdminAddress();

      const ethers = await import('ethers');

      // Treasury contract address and ABI
      const TREASURY_ADDRESS = '0x54644FD3576720d16ff48Ea7E0545cb1D772D876';
      const TREASURY_ABI = [
        "function withdrawNative(uint256 amount, address payable to) external",
        "function getNativeBalance() external view returns (uint256)"
      ];

      const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, adminSigner);

      // Convert amount to wei
      const amountWei = ethers.parseEther(withdrawAmount);

      // Check balance
      const balance = await treasuryContract.getNativeBalance();
      if (balance < amountWei) {
        toast.error(`Insufficient balance. Available: ${ethers.formatEther(balance)} BNB`);
        return;
      }

      toast.info('Withdrawing BNB from Treasury...');

      // Call withdrawNative
      const tx = await treasuryContract.withdrawNative(amountWei, adminAddress);

      toast.info('Waiting for confirmation...');
      await tx.wait();

      toast.success(`Successfully withdrew ${withdrawAmount} BNB to admin wallet!`);
      setWithdrawAmount('');

      // Reload data
      setTimeout(() => {
        loadAllTreasuryData();
      }, 2000);

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(`Withdrawal failed: ${error.message || 'Unknown error'}`);
    } finally {
      setWithdrawing(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Treasury Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. This feature is only available to administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate combined metrics
  const totalBnbRevenue = parseFloat(castStats?.bnbRevenue || '0');
  const totalCastSupply = parseFloat(castStats?.totalSupply || '0');
  const totalCastFees = parseFloat(protocolAnalytics.totalValue);
  const castLockedInMarkets = parseFloat(lockedInMarkets.totalLocked || '0');
  const circulatingCast = totalCastSupply - castLockedInMarkets;

  // Calculate TVL using ONLY the CAST locked in active markets (real liquidity at stake)
  // TVL = CAST locked in markets × CAST price in USD
  const tvlData = calculateTVL(0, castLockedInMarkets, priceConfig); // 0 BNB since we only count locked CAST as TVL

  // Helper to render change indicator
  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground text-xs">--</span>;
    const isPositive = value > 0;
    return (
      <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-500" />
            Treasury Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Quick health check at a glance
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

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Hero Metrics - Row 1 (3 large cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TVL Card - Shows CAST locked in active markets */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Value Locked (TVL)
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {formatUSD(tvlData.tvlUSD)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {change24h.tvlAdded24h > 0 ? (
                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                      +{change24h.tvlAdded24h.toLocaleString()} CAST (24h)
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No new bets (24h)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lockedMarketsLoading ? <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Loading markets...</span> : `${castLockedInMarkets.toLocaleString()} CAST in ${lockedInMarkets.marketCount} markets`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Sales Revenue Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  Token Sales
                </p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {totalBnbRevenue.toFixed(4)} BNB
                </p>
                <p className="text-lg text-green-500">
                  ~{formatUSD(bnbToUSD(totalBnbRevenue, priceConfig))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {castStats?.totalPurchases || 0} CAST purchases
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protocol Fees Card (2% from resolved markets) */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Scale className="h-4 w-4" />
                  Protocol Fees (2%)
                </p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {parseFloat(protocolAnalytics.monthlyFees || '0').toFixed(2)} CAST
                </p>
                <p className="text-lg text-purple-500">
                  ~{formatUSD(castToUSD(parseFloat(protocolAnalytics.monthlyFees || '0'), priceConfig))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {feeHistory.length > 0
                    ? `From ${feeHistory.length} resolved markets`
                    : 'No markets resolved yet'}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center">
                <Scale className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Secondary Metrics - Row 2 (4 smaller cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CAST Supply - Shows both circulating and locked */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CAST Supply</p>
                <p className="text-lg font-bold">
                  {castStats ? `${(parseFloat(castStats.totalSupply) / 1000000).toFixed(2)}M` : '0'}
                  <span className="text-xs text-muted-foreground font-normal"> / 100M</span>
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>🔓 {lockedMarketsLoading ? '...' : `${(circulatingCast / 1000000).toFixed(2)}M`} circulating</p>
                  <p>🔒 {lockedMarketsLoading ? <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> loading...</span> : `${(castLockedInMarkets / 1000000).toFixed(2)}M in markets`}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Bettors */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Bettors</p>
                <p className="text-lg font-bold">{activeBettors}</p>
                <p className="text-xs text-muted-foreground">unique users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 24h Betting Activity */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${change24h.tvlAdded24h > 0 ? 'bg-green-500' : 'bg-gray-400'}`}>
                {change24h.tvlAdded24h > 0 ? <TrendingUp className="h-5 w-5 text-white" /> : <Activity className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bets (24h)</p>
                <p className={`text-lg font-bold ${change24h.tvlAdded24h > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {change24h.tvlAdded24h > 0 ? '+' : ''}{change24h.tvlAdded24h.toLocaleString()} CAST
                </p>
                <p className="text-xs text-muted-foreground">
                  {change24h.tvlChange !== 0 ? `${change24h.tvlChange > 0 ? '+' : ''}${change24h.tvlChange.toFixed(1)}% vs prev 24h` : 'new activity'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity - Rolling 24h window */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions (24h)</p>
                <p className="text-lg font-bold">{last24hTxns} txns</p>
                <p className="text-xs text-muted-foreground">{totalTransactions} all-time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Configuration - Collapsible */}
      <Collapsible open={priceConfigOpen} onOpenChange={setPriceConfigOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Price Configuration
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    BNB: ${priceConfig.bnbPriceUSD}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {getTimeSinceUpdate(priceConfig)}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${priceConfigOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">BNB Price (USD)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newBnbPrice}
                      onChange={(e) => setNewBnbPrice(e.target.value)}
                      placeholder="600"
                      className="max-w-[150px]"
                    />
                    <Button onClick={handleUpdatePrice} variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>CAST/BNB Rate: <strong>1 CAST = 0.02 BNB</strong></p>
                  <p>CAST Price: <strong>${(priceConfig.bnbPriceUSD * 0.02).toFixed(2)}</strong></p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cast-token">CAST Token</TabsTrigger>
          <TabsTrigger value="buyCast">Token Sales</TabsTrigger>
          <TabsTrigger value="protocol-fees">Protocol Fees</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Treasury Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* CAST Token Supply Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">CAST Token Supply</span>
                    <span className="text-sm text-muted-foreground">
                      {castStats?.supplyUtilization.toFixed(2)}% of max minted
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Supply (Minted)</span>
                      <span className="font-medium">{totalCastSupply.toLocaleString()} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">🔓 Circulating (Available)</span>
                      <span className="font-medium text-green-600">{lockedMarketsLoading ? '...' : circulatingCast.toLocaleString()} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">🔒 Locked in Markets (TVL)</span>
                      <span className="font-medium text-blue-600">{lockedMarketsLoading ? <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /></span> : castLockedInMarkets.toLocaleString()} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 mt-2">
                      <span className="text-muted-foreground">Remaining Mintable</span>
                      <span className="font-medium">{castStats ? parseFloat(castStats.remainingMintable).toLocaleString() : '0'} CAST</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Revenue Breakdown */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Revenue Streams</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Token Sales Revenue</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-green-600">{totalBnbRevenue.toFixed(4)} BNB</span>
                        <span className="text-xs text-muted-foreground ml-1">(~{formatUSD(bnbToUSD(totalBnbRevenue, priceConfig))})</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-purple-500" />
                        <span className="text-muted-foreground">Protocol Fees</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-purple-600">{totalCastFees.toFixed(2)} CAST</span>
                        <span className="text-xs text-muted-foreground ml-1">(~{formatUSD(castToUSD(totalCastFees, priceConfig))})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Holder Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-2">CAST Holder Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Owner/Admin Holdings</span>
                      <span className="font-medium">{castStats ? parseFloat(castStats.ownerBalance).toLocaleString() : '0'} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other Holders</span>
                      <span className="font-medium">{castStats ? parseFloat(castStats.otherHolders).toFixed(2) : '0'} CAST</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAST Token Tab */}
        <TabsContent value="cast-token" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                CAST Token Statistics
              </CardTitle>
              <CardDescription>
                Complete overview of CAST token supply and distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-blue-600">Supply Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Supply</span>
                        <span className="font-medium">{castStats ? parseFloat(castStats.maxSupply).toLocaleString() : '0'} CAST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Supply</span>
                        <div className="text-right">
                          <span className="font-medium">{castStats ? parseFloat(castStats.totalSupply).toLocaleString() : '0'} CAST</span>
                          <span className="text-xs text-muted-foreground ml-1">(~{formatUSD(castToUSD(totalCastSupply, priceConfig))})</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Initial Allocation</span>
                        <span className="font-medium">{castStats ? parseFloat(castStats.initialAllocation).toLocaleString() : '0'} CAST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Minted via BuyCAST</span>
                        <span className="font-medium">{castStats ? parseFloat(castStats.purchasedCast).toFixed(2) : '0'} CAST</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Remaining Mintable</span>
                        <span className="font-bold text-green-600">{castStats ? parseFloat(castStats.remainingMintable).toLocaleString() : '0'} CAST</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-purple-600">Distribution</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner Balance</span>
                        <span className="font-medium">{castStats ? parseFloat(castStats.ownerBalance).toLocaleString() : '0'} CAST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other Holders</span>
                        <span className="font-medium">{castStats ? parseFloat(castStats.otherHolders).toFixed(2) : '0'} CAST</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Supply Utilization</span>
                        <span className="font-bold text-blue-600">{castStats?.supplyUtilization.toFixed(4)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Token Address:</strong><br />
                      <code className="text-[10px] break-all">{castStats ? '0x8B84B21AC2EB9C37EfaD196d99088Df823567e81' : 'Loading...'}</code>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token Sales Tab */}
        <TabsContent value="buyCast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Token Sales Revenue
              </CardTitle>
              <CardDescription>
                BNB revenue from CAST token purchases via BuyCAST contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Revenue Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                    <p className="text-sm text-muted-foreground mb-1">Total BNB Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{castStats?.bnbRevenue || '0'} BNB</p>
                    <p className="text-sm text-green-500">~{formatUSD(bnbToUSD(totalBnbRevenue, priceConfig))}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground mb-1">Total Purchases</p>
                    <p className="text-2xl font-bold text-blue-600">{castStats?.totalPurchases || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
                    <p className="text-sm text-muted-foreground mb-1">CAST Sold</p>
                    <p className="text-2xl font-bold text-purple-600">{castStats ? parseFloat(castStats.purchasedCast).toFixed(2) : '0'}</p>
                    <p className="text-sm text-purple-500">~{formatUSD(castToUSD(parseFloat(castStats?.purchasedCast || '0'), priceConfig))}</p>
                  </div>
                </div>

                <Separator />

                {/* Recent Purchases */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent CAST Purchases
                  </h4>
                  {castPurchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No purchases yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {castPurchases.slice(0, 10).map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-mono">
                                {purchase.buyer_address.slice(0, 6)}...{purchase.buyer_address.slice(-4)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(purchase.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              {parseFloat(purchase.cast_amount.toString()).toFixed(2)} CAST
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(purchase.bnb_amount.toString()).toFixed(4)} BNB (~{formatUSD(bnbToUSD(parseFloat(purchase.bnb_amount.toString()), priceConfig))})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Fees Tab */}
        <TabsContent value="protocol-fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Protocol Fees
              </CardTitle>
              <CardDescription>
                2% fees collected from market resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Protocol Fee Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
                    <p className="text-sm text-muted-foreground mb-1">Total Fees Collected</p>
                    <p className="text-2xl font-bold text-purple-600">{protocolAnalytics.monthlyFees} CAST</p>
                    <p className="text-sm text-purple-500">~{formatUSD(castToUSD(parseFloat(protocolAnalytics.monthlyFees || '0'), priceConfig))}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground mb-1">Fee Collections</p>
                    <p className="text-2xl font-bold text-blue-600">{feeHistory.length}</p>
                  </div>
                </div>

                <Separator />

                {/* Fee History */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Fee Collections
                  </h4>
                  {feeHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Scale className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No protocol fees collected yet</p>
                      <p className="text-xs mt-1">Fees are collected when markets are resolved</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {feeHistory.slice(0, 10).map((fee, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{fee.marketTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(fee.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-purple-600">
                              +{fee.feeAmount} CAST
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              Protocol Fee
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Treasury Withdrawal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-500" />
            Withdraw Funds
          </CardTitle>
          <CardDescription>
            Withdraw BNB from Treasury to admin wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Admin only:</strong> This action will withdraw BNB from the Treasury contract to your connected admin wallet.
                Available balance: <strong>{totalBnbRevenue.toFixed(4)} BNB</strong> (~{formatUSD(bnbToUSD(totalBnbRevenue, priceConfig))})
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                max={totalBnbRevenue}
                placeholder="Amount in BNB (e.g., 0.1)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={withdrawing}
                className="flex-1"
              />
              <Button
                onClick={handleWithdrawBNB}
                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > totalBnbRevenue}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            </div>

            {withdrawAmount && parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) <= totalBnbRevenue && (
              <p className="text-sm text-muted-foreground">
                You will receive <strong>{withdrawAmount} BNB</strong> (~{formatUSD(bnbToUSD(parseFloat(withdrawAmount), priceConfig))})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Treasury Management Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Treasury Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Revenue Streams</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Token Sales</strong>: BNB revenue from CAST token purchases</li>
                <li><strong>Protocol Fees</strong>: 2% CAST fees from market resolutions</li>
                <li><strong>Treasury Contract</strong>: Holds both BNB and CAST</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Treasury Usage</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Platform development and infrastructure</li>
                <li>Marketing and growth initiatives</li>
                <li>Creator incentives and rewards</li>
                <li>Community programs and governance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
