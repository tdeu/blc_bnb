import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  Wallet,
  TrendingUp,
  Download,
  DollarSign,
  PieChart,
  Activity,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { treasuryService, TreasuryBalance, FeeCollection } from '../../utils/treasuryService';
import { toast } from 'sonner';

interface TreasuryDashboardProps {
  isAdmin: boolean;
}

export default function TreasuryDashboard({ isAdmin }: TreasuryDashboardProps) {
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [feeHistory, setFeeHistory] = useState<FeeCollection[]>([]);
  const [analytics, setAnalytics] = useState({
    totalValue: '0',
    tokenCount: 0,
    monthlyFees: '0',
    feeGrowth: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    token: '',
    amount: '',
    recipient: ''
  });

  useEffect(() => {
    if (isAdmin) {
      loadTreasuryData();
    }
  }, [isAdmin]);

  const loadTreasuryData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [balanceData, historyData, analyticsData] = await Promise.all([
        treasuryService.getAllBalances(),
        treasuryService.getFeeHistory(),
        treasuryService.getTreasuryAnalytics()
      ]);

      setBalances(balanceData);
      setFeeHistory(historyData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('Failed to load treasury data:', err);
      setError(err.message || 'Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.token || !withdrawForm.amount || !withdrawForm.recipient) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await treasuryService.withdrawToken(
        withdrawForm.token,
        withdrawForm.amount,
        withdrawForm.recipient
      );

      setWithdrawDialogOpen(false);
      setWithdrawForm({ token: '', amount: '', recipient: '' });
      await loadTreasuryData(); // Refresh data
    } catch (error: any) {
      // Error is already shown by the service
      console.error('Withdrawal error:', error);
    }
  };

  const handleRefresh = () => {
    loadTreasuryData();
    toast.success('Treasury data refreshed!');
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Treasury Dashboard
          </CardTitle>
          <CardDescription>
            Protocol fee collection and treasury management
          </CardDescription>
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
            Monitor protocol fees and manage treasury funds
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

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(analytics.totalValue).toLocaleString()}
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Token Types</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.tokenCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Fees</p>
                <p className="text-2xl font-bold text-purple-600">
                  {parseFloat(analytics.monthlyFees).toFixed(2)}
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
                <p className="text-sm font-medium text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold text-orange-600">
                  +{analytics.feeGrowth}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treasury Balances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Treasury Balances
              </CardTitle>
              <CardDescription>
                Current holdings in the protocol treasury
              </CardDescription>
            </div>
            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw from Treasury</DialogTitle>
                  <DialogDescription>
                    Withdraw tokens from the protocol treasury. Only authorized admins can perform this action.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="token">Token Contract Address</Label>
                    <Input
                      id="token"
                      placeholder="0xC78Ac73844077917E20530E36ac935c4B56236c2"
                      value={withdrawForm.token}
                      onChange={(e) => setWithdrawForm(prev => ({ ...prev, token: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      CAST Token: <span className="font-mono text-blue-600">0xC78Ac73844077917E20530E36ac935c4B56236c2</span>
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Amount to withdraw"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <Input
                      id="recipient"
                      placeholder="0x..."
                      value={withdrawForm.recipient}
                      onChange={(e) => setWithdrawForm(prev => ({ ...prev, recipient: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleWithdraw} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Withdraw Tokens
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading balances...</span>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No treasury balances</h3>
              <p className="text-sm text-muted-foreground">
                Protocol fees will appear here as markets are resolved
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {balances.map((balance, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {balance.symbol.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-medium">{balance.symbol}</h4>
                      <p className="text-sm text-muted-foreground">{balance.token}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{balance.balanceFormatted}</p>
                    <Badge variant="outline" className="text-xs">
                      {parseFloat(balance.balance) > 1000 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Collection History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fee Collection History
          </CardTitle>
          <CardDescription>
            Recent protocol fee collections from market resolutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feeHistory.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No fee history</h3>
              <p className="text-sm text-muted-foreground">
                Fee collections will appear here as markets are resolved
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feeHistory.slice(0, 10).map((fee, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{fee.marketTitle}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(fee.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{fee.feeAmount} CAST</p>
                      <p className="text-sm text-muted-foreground">Protocol Fee</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://hashscan.io/testnet/transaction/${fee.transactionHash}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treasury Management Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Treasury Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Automatic Fee Collection</h4>
                <p className="text-muted-foreground">
                  Protocol fees are automatically collected when markets are resolved using the two-stage resolution process.
                  Default fee rate is 2% of the total market pool.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Treasury Usage</h4>
                <p className="text-muted-foreground">
                  Treasury funds can be used for platform development, marketing, creator incentives,
                  and community programs as approved by governance.
                </p>
              </div>
            </div>

            <Separator />

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> All treasury withdrawals are logged on-chain
                and require admin authorization. Use the withdrawal feature responsibly.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}