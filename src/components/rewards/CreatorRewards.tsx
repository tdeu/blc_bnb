import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Trophy,
  Coins,
  TrendingUp,
  Calendar,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { castTokenService, CreatorReward, CastTokenInfo } from '../../utils/castTokenService';
import { walletService } from '../../utils/walletService';
import { toast } from 'sonner';

interface CreatorRewardsProps {
  walletConnected: boolean;
  castBalance: number;
}

export default function CreatorRewards({ walletConnected, castBalance }: CreatorRewardsProps) {
  const [rewards, setRewards] = useState<CreatorReward[]>([]);
  const [tokenInfo, setTokenInfo] = useState<CastTokenInfo | null>(null);
  const [pendingRewards, setPendingRewards] = useState({ totalPending: '0', count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletConnected) {
      loadRewardsData().catch(err => {
        console.error('Error loading rewards:', err);
        setError('Failed to load rewards data');
        setLoading(false);
      });
    }
  }, [walletConnected]);

  const loadRewardsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rewardsData, tokenData, pendingData] = await Promise.all([
        castTokenService.getCreatorRewards(),
        castTokenService.getTokenInfo(),
        castTokenService.getPendingRewards()
      ]);

      setRewards(rewardsData);
      setTokenInfo(tokenData);
      setPendingRewards(pendingData);
    } catch (err: any) {
      console.error('Failed to load rewards data:', err);
      setError(err.message || 'Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadRewardsData();
    toast.success('Rewards data refreshed!');
  };

  const getStatusIcon = (status: CreatorReward['status']) => {
    switch (status) {
      case 'claimed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: CreatorReward['status']) => {
    const variants = {
      claimed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge className={`text-xs ${variants[status] || variants.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!walletConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Creator Rewards
          </CardTitle>
          <CardDescription>
            Earn 100 CAST tokens for each market you create that gets resolved successfully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Connect your wallet to view your creator rewards and CAST token earnings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current CAST Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CAST Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {castTokenService.formatAmount(castBalance.toString())}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Coins className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Rewards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {castTokenService.formatAmount(pendingRewards.totalPending)}
                </p>
                <p className="text-xs text-muted-foreground">{pendingRewards.count} markets</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">
                  {castTokenService.formatAmount(
                    (rewards.reduce((sum, r) => sum + parseFloat(r.rewardAmount), 0)).toString()
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{rewards.length} rewards</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Creator Rewards History
              </CardTitle>
              <CardDescription>
                Track your CAST token rewards from market creation and resolution
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading rewards...</span>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No rewards yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first market to start earning CAST tokens!
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to earn:</strong> Create markets that get approved and resolved successfully.
                  Each resolved market earns you 100 CAST tokens automatically.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{reward.marketTitle}</h4>
                      <p className="text-sm text-muted-foreground">Market ID: {reward.marketId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(reward.status)}
                      {getStatusBadge(reward.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved</p>
                      <p className="font-medium">
                        {new Date(reward.resolvedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reward</p>
                      <p className="font-medium text-blue-600">
                        {castTokenService.formatAmount(reward.rewardAmount)} CAST
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">Transaction</p>
                      {reward.transactionHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(`https://hashscan.io/testnet/transaction/${reward.transactionHash}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rewards.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {rewards.length} reward{rewards.length !== 1 ? 's' : ''}
                </span>
                <span className="text-muted-foreground">
                  Total: {castTokenService.formatAmount(
                    (rewards.reduce((sum, r) => sum + parseFloat(r.rewardAmount), 0)).toString()
                  )} CAST
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How It Works Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            How Creator Rewards Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium">Create a Market</p>
                <p className="text-muted-foreground">Submit a prediction market that gets approved by admins</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium">Market Gets Resolved</p>
                <p className="text-muted-foreground">After expiration, admins resolve the market with final outcome</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium">Automatic Reward</p>
                <p className="text-muted-foreground">You automatically receive 100 CAST tokens via smart contract</p>
              </div>
            </div>
          </div>

          <Alert className="mt-4">
            <Trophy className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro tip:</strong> Create high-quality, verifiable markets to maximize your rewards.
              Markets that generate more activity and engagement help grow the platform!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}