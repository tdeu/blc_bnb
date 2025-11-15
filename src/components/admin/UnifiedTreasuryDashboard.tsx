import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Coins,
  Users,
  Zap,
  ShoppingCart,
  Scale,
  Eye,
  Send
} from 'lucide-react';
import { treasuryService as castTreasuryService, TreasuryStats, CastPurchase } from '../../services/treasuryService';
import { treasuryService as protocolTreasuryService, TreasuryBalance, FeeCollection } from '../../utils/treasuryService';
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

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

      // Load CAST token data
      const [stats, purchases] = await Promise.all([
        castTreasuryService.getTreasuryStats(),
        castTreasuryService.getRecentPurchases(20)
      ]);

      setCastStats(stats);
      setCastPurchases(purchases);

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
          supabase.from('bets').select('*', { count: 'exact', head: true }),
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

  // State for total transactions and markets count
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalMarkets, setTotalMarkets] = useState(0);

  // Calculate combined metrics
  const totalBnbRevenue = parseFloat(castStats?.bnbRevenue || '0');
  const totalCastFees = parseFloat(protocolAnalytics.totalValue);
  const totalRevenue = totalBnbRevenue + totalCastFees;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-500" />
            Unified Treasury Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Complete overview of CAST token distribution, token sales revenue, and protocol fees
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

      {/* Top-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total CAST Supply</p>
                <p className="text-2xl font-bold text-blue-600">
                  {castStats ? `${(parseFloat(castStats.totalSupply) / 1000000).toFixed(1)}M / ${(parseFloat(castStats.maxSupply) / 1000000).toFixed(0)}M` : '0 / 100M'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {castStats ? `${castStats.supplyUtilization.toFixed(1)}% of max supply` : 'Current / Maximum'}
                </p>
                <a
                  href="https://testnet.bscscan.com/token/0x8B84B21AC2EB9C37EfaD196d99088Df823567e81"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                >
                  View on BscScan →
                </a>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Coins className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Sales Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalBnbRevenue.toFixed(4)} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  BNB collected from users buying CAST
                </p>
                <a
                  href="https://testnet.bscscan.com/address/0x54644FD3576720d16ff48Ea7E0545cb1D772D876"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-800 underline mt-1 inline-block"
                >
                  Treasury Contract →
                </a>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Protocol Fees</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalCastFees.toFixed(2)} CAST
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From market resolutions
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <Scale className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalTransactions}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bets + Markets + Sales + Resolutions
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {totalMarkets}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All prediction markets created
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      {castStats?.supplyUtilization.toFixed(2)}% utilized
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Initial Allocation</span>
                      <span className="font-medium">{castStats ? parseFloat(castStats.initialAllocation).toLocaleString() : '0'} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Purchased via BuyCAST</span>
                      <span className="font-medium">{castStats ? parseFloat(castStats.purchasedCast).toFixed(2) : '0'} CAST</span>
                    </div>
                    <div className="flex justify-between text-sm">
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
                      <span className="font-medium text-green-600">{totalBnbRevenue.toFixed(4)} BNB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-purple-500" />
                        <span className="text-muted-foreground">Protocol Fees</span>
                      </div>
                      <span className="font-medium text-purple-600">{totalCastFees.toFixed(2)} CAST</span>
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
                        <span className="font-medium">{castStats ? parseFloat(castStats.totalSupply).toLocaleString() : '0'} CAST</span>
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
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground mb-1">Total Purchases</p>
                    <p className="text-2xl font-bold text-blue-600">{castStats?.totalPurchases || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
                    <p className="text-sm text-muted-foreground mb-1">CAST Sold</p>
                    <p className="text-2xl font-bold text-purple-600">{castStats ? parseFloat(castStats.purchasedCast).toFixed(2) : '0'}</p>
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
                              {parseFloat(purchase.bnb_amount.toString()).toFixed(4)} BNB
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
                Available balance: <strong>{totalBnbRevenue.toFixed(4)} BNB</strong>
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
                You will receive <strong>{withdrawAmount} BNB</strong> (~${(parseFloat(withdrawAmount) * 600).toFixed(2)})
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
                <li>• <strong>Token Sales</strong>: BNB revenue from CAST token purchases</li>
                <li>• <strong>Protocol Fees</strong>: 2% CAST fees from market resolutions</li>
                <li>• <strong>Treasury Contract</strong>: Holds both BNB and CAST</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Treasury Usage</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Platform development and infrastructure</li>
                <li>• Marketing and growth initiatives</li>
                <li>• Creator incentives and rewards</li>
                <li>• Community programs and governance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
