import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Wallet, TrendingUp, TrendingDown, Clock, DollarSign, Award, Target, Users, Zap, Vote, CheckCircle, XCircle, AlertTriangle, Eye, BarChart3, PieChart, Activity, Tag, ShoppingBag, X, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import ListNFTModal from '../nft/ListNFTModal';
import { betNFTService, NFTListing } from '../../utils/betNFTService';

export interface UserBet {
  id: string;
  marketId: string;
  marketClaim?: string;
  marketContractAddress?: string; // Contract address for NFT minting
  position: 'yes' | 'no';
  amount: number;
  odds?: number;
  potentialWinning?: number;
  potentialReturn?: number;
  placedAt: Date;
  status: 'active' | 'won' | 'lost' | 'pending';
  resolvedAt?: Date;
  actualWinning?: number;
  blockchainTxId?: string; // Hedera transaction ID - added for blockchain integration
  hasNFT?: boolean; // Whether user has minted NFT for this position
  nftTokenId?: number; // NFT token ID if minted
  winningsClaimed?: boolean; // Whether winnings have been claimed from smart contract
  claimedAt?: Date; // When winnings were claimed
}

interface BettingPortfolioProps {
  userBalance: number;
  userBets: UserBet[];
}

export default function BettingPortfolio({ userBalance, userBets: propUserBets }: BettingPortfolioProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [listingNFT, setListingNFT] = useState<UserBet | null>(null); // Track which NFT is being listed
  const [cancelingListing, setCancelingListing] = useState<string | null>(null); // Track which listing is being canceled
  const [nftListings, setNftListings] = useState<Map<number, NFTListing>>(new Map()); // Store NFT listing data
  const [isSyncing, setIsSyncing] = useState(false);
  const [claimingBet, setClaimingBet] = useState<string | null>(null); // Track which bet is being claimed
  const [claimingAll, setClaimingAll] = useState(false); // Track bulk claim

  // Use props directly - data now comes from blockchain via useUserPositions hook in App.tsx
  const userBets = propUserBets;

  // Optional: Sync resolution status for any bets that may have been resolved
  useEffect(() => {
    const syncBetsWithResolutions = async () => {
      if (isSyncing || userBets.length === 0) return;

      setIsSyncing(true);
      try {
        // Get wallet address from the first bet's storage key pattern
        const walletKeys = Object.keys(localStorage).filter(key => key.startsWith('user_bets_'));
        if (walletKeys.length === 0) {
          console.log('📊 Portfolio loaded from blockchain - no localStorage sync needed');
          return;
        }

        const walletAddress = walletKeys[0].replace('user_bets_', '');
        console.log('🔄 Checking for any missed market resolutions...');
        const { betResolutionService } = await import('../../utils/betResolutionService');
        const updatedCount = await betResolutionService.syncBetsWithMarketStatus(walletAddress);

        if (updatedCount > 0) {
          console.log(`✅ Found ${updatedCount} bet(s) with updated resolution status`);
        }
      } catch (error) {
        console.error('❌ Error syncing resolution status:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncBetsWithResolutions();
  }, [userBets.length]); // Re-run when userBets count changes

  // Load NFT listing status for all NFTs (NFTs are auto-minted on bet placement)
  useEffect(() => {
    const loadNFTListings = async () => {
      const mintedBets = userBets.filter(bet => bet.nftTokenId);

      for (const bet of mintedBets) {
        try {
          const listing = await betNFTService.getNFTListing(bet.nftTokenId!);
          if (listing) {
            setNftListings(prev => new Map(prev).set(bet.nftTokenId!, listing));
          }
        } catch (error) {
          console.error(`Failed to load listing for NFT #${bet.nftTokenId}:`, error);
        }
      }
    };

    if (userBets.length > 0) {
      loadNFTListings();
    }
  }, [userBets]);

  const handleCancelListing = async (cast: UserBet) => {
    if (!cast.nftTokenId) {
      toast.error('NFT token ID not found');
      return;
    }

    setCancelingListing(cast.id);

    try {
      const result = await betNFTService.cancelListing(cast.nftTokenId);

      if (result.success) {
        toast.success(`Listing canceled successfully!`);

        // Remove from local state
        setNftListings(prev => {
          const newMap = new Map(prev);
          newMap.delete(cast.nftTokenId!);
          return newMap;
        });
      } else {
        toast.error(`Failed to cancel listing: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error canceling listing:', error);
      toast.error(`Failed to cancel listing: ${error.message || 'Unknown error'}`);
    } finally {
      setCancelingListing(null);
    }
  };

  const handleListingSuccess = () => {
    // Refresh listing data after successful listing
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Claim winnings for a single won bet
  const handleClaimWinnings = async (cast: UserBet) => {
    if (!cast.marketContractAddress) {
      toast.error('Market contract address not found');
      return;
    }

    if (cast.status !== 'won') {
      toast.error('Can only claim winnings for won trades');
      return;
    }

    if (cast.winningsClaimed) {
      toast.info('Winnings already claimed for this trade');
      return;
    }

    setClaimingBet(cast.id);

    try {
      // Import dependencies
      const ethers = await import('ethers');
      const { walletService } = await import('../../utils/walletService');

      // Connect user's wallet
      const connection = walletService.getConnection();
      if (!connection?.signer) {
        toast.error('Please connect your wallet first');
        return;
      }

      const MARKET_ABI = ["function redeem() external"];
      const marketContract = new ethers.Contract(
        cast.marketContractAddress,
        MARKET_ABI,
        connection.signer
      );

      const loadingToast = toast.loading(`Claiming ${cast.actualWinning?.toFixed(3)} CAST...`);

      console.log(`💰 Claiming winnings for trade ${cast.id} from market ${cast.marketContractAddress}`);
      const tx = await marketContract.redeem();
      await tx.wait();

      toast.dismiss(loadingToast);
      toast.success(`Successfully claimed ${cast.actualWinning?.toFixed(3)} CAST! 🎉`);

      // Update bet as claimed in localStorage
      updateBetClaimStatus(cast.id, true);

      // Refresh wallet balance
      setTimeout(() => {
        window.location.reload(); // Simple refresh to update balance
      }, 2000);

    } catch (error: any) {
      console.error('Failed to claim winnings:', error);
      toast.error(`Failed to claim: ${error.message || 'Unknown error'}`);
    } finally {
      setClaimingBet(null);
    }
  };

  // Claim all unclaimed winnings
  const handleClaimAllWinnings = async () => {
    const unclaimedWinnings = userBets.filter(
      bet => bet.status === 'won' && !bet.winningsClaimed && bet.marketContractAddress
    );

    if (unclaimedWinnings.length === 0) {
      toast.info('No unclaimed winnings available');
      return;
    }

    setClaimingAll(true);

    try {
      const ethers = await import('ethers');
      const { walletService } = await import('../../utils/walletService');

      const connection = walletService.getConnection();
      if (!connection?.signer) {
        toast.error('Please connect your wallet first');
        setClaimingAll(false);
        return;
      }

      const totalWinnings = unclaimedWinnings.reduce((sum, bet) => sum + (bet.actualWinning || 0), 0);
      const loadingToast = toast.loading(`Claiming ${totalWinnings.toFixed(3)} CAST from ${unclaimedWinnings.length} market(s)...`);

      let successCount = 0;
      let failCount = 0;

      for (const bet of unclaimedWinnings) {
        try {
          const MARKET_ABI = ["function redeem() external"];
          const marketContract = new ethers.Contract(
            bet.marketContractAddress!,
            MARKET_ABI,
            connection.signer
          );

          console.log(`💰 Claiming from market ${bet.marketContractAddress}`);
          const tx = await marketContract.redeem();
          await tx.wait();

          updateBetClaimStatus(bet.id, true);
          successCount++;

        } catch (error) {
          console.error(`Failed to claim from market ${bet.marketContractAddress}:`, error);
          failCount++;
        }
      }

      toast.dismiss(loadingToast);

      if (successCount === unclaimedWinnings.length) {
        toast.success(`Successfully claimed all winnings (${totalWinnings.toFixed(3)} CAST)! 🎉`);
      } else {
        toast.warning(`Claimed ${successCount}/${unclaimedWinnings.length} successfully. ${failCount} failed.`);
      }

      // Refresh to update balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Bulk claim failed:', error);
      toast.error(`Bulk claim failed: ${error.message || 'Unknown error'}`);
    } finally {
      setClaimingAll(false);
    }
  };

  // Withdraw funds (swap CAST to HBAR)
  const handleWithdrawFunds = async () => {
    // Check if user has positive P&L
    if (totalPnL <= 0) {
      toast.error('No profits available to withdraw. Your P&L must be positive.');
      return;
    }

    try {
      const { walletService } = await import('../../utils/walletService');
      const connection = walletService.getConnection();

      if (!connection || !connection.isConnected) {
        toast.error('Please connect your wallet first');
        return;
      }

      // Get CAST balance
      const castBalance = await walletService.getCastTokenBalance();
      const castBalanceNum = parseFloat(castBalance);

      if (castBalanceNum <= 0) {
        toast.error('No CAST tokens available to withdraw');
        return;
      }

      // Show confirmation with withdraw amount
      const withdrawAmount = Math.min(totalPnL, castBalanceNum);

      toast.info(
        `Withdrawing ${withdrawAmount.toFixed(3)} CAST (P&L profits) → HBAR`,
        {
          duration: 8000,
          description: 'This feature will swap your CAST profits back to HBAR. Currently in development - will be available soon!'
        }
      );

      // TODO: Implement actual CAST → HBAR swap via BuyCAST contract or liquidity pool
      // For now, show placeholder message
      toast.warning(
        'Withdrawal feature coming soon!',
        {
          duration: 6000,
          description: `You can withdraw ${withdrawAmount.toFixed(3)} CAST once the CAST→HBAR swap contract is deployed.`
        }
      );

    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      toast.error(`Withdrawal failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Update bet claim status in localStorage (for caching purposes)
  const updateBetClaimStatus = (betId: string, claimed: boolean) => {
    try {
      const walletKeys = Object.keys(localStorage).filter(key => key.startsWith('user_bets_'));
      if (walletKeys.length === 0) return;

      const walletAddress = walletKeys[0].replace('user_bets_', '');
      const storageKey = `user_bets_${walletAddress}`;
      const data = localStorage.getItem(storageKey);
      if (!data) return;

      const bets = JSON.parse(data);
      const updatedBets = bets.map((bet: any) =>
        bet.id === betId
          ? { ...bet, winningsClaimed: claimed, claimedAt: new Date().toISOString() }
          : bet
      );

      localStorage.setItem(storageKey, JSON.stringify(updatedBets));
      console.log(`✅ Updated claim status for bet ${betId}: claimed=${claimed}`);
    } catch (error) {
      console.error('Error updating bet claim status:', error);
    }
  };

  // Calculate portfolio stats
  const totalCastAmount = userBets.reduce((sum, cast) => sum + cast.amount, 0);
  const activeCasts = userBets.filter(cast => cast.status === 'active');
  const pendingCasts = userBets.filter(cast => cast.status === 'pending'); // Expired but not resolved
  const resolvedCasts = userBets.filter(cast => cast.status === 'won' || cast.status === 'lost' || cast.status === 'pending');
  const wonCasts = userBets.filter(cast => cast.status === 'won');
  const unclaimedWinnings = wonCasts.filter(cast => !cast.winningsClaimed && cast.marketContractAddress);
  const totalWinnings = wonCasts.reduce((sum, cast) => sum + (cast.actualWinning || 0), 0);
  const totalUnclaimedWinnings = unclaimedWinnings.reduce((sum, cast) => sum + (cast.actualWinning || 0), 0);
  const totalPotentialWinnings = activeCasts.reduce((sum, cast) => sum + (cast.potentialWinning || cast.potentialReturn || 0), 0);
  const winRate = resolvedCasts.length > 0 ? (wonCasts.length / resolvedCasts.length) * 100 : 0;
  const totalPnL = totalWinnings - resolvedCasts.reduce((sum, cast) => sum + cast.amount, 0);

  // Truth casting accuracy - coming later
  const truthAccuracy = null; // Will be calculated from resolved predictions later

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">WON</Badge>;
      case 'lost':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">LOST</Badge>;
      case 'active':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">ACTIVE</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">AWAITING RESOLUTION</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const getPositionBadge = (position: string) => {
    return position === 'yes' ? 
      <Badge className="bg-primary/20 text-primary border-primary/30">TRUE</Badge> :
      <Badge className="bg-secondary/20 text-secondary border-secondary/30">FALSE</Badge>;
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            Truth Casting Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your truth verification positions • Monitor accuracy • Manage funds
          </p>
        </div>

        {/* AUTO-PAYOUT: No wallet actions needed - winnings paid automatically */}
      </div>

      {/* Balance & Quick Stats - All 5 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Available Balance */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Available Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{userBalance.toFixed(3)} CAST</p>
            <p className="text-sm text-muted-foreground">Ready for casting</p>
          </CardContent>
        </Card>

        {/* 2. Total Wagered */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Vote className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-secondary">Total Wagered</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCastAmount.toFixed(3)} CAST</p>
            <p className="text-sm text-muted-foreground">Across {userBets.length} positions</p>
          </CardContent>
        </Card>

        {/* 3. Win Rate % */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-500">Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resolvedCasts.length > 0 ? `${winRate.toFixed(1)}%` : '0.0%'}
            </p>
            <p className="text-sm text-muted-foreground">{wonCasts.length}/{resolvedCasts.length} won</p>
          </CardContent>
        </Card>

        {/* 4. Net P&L */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {totalPnL >= 0 ?
                <TrendingUp className="h-5 w-5 text-green-500" /> :
                <TrendingDown className="h-5 w-5 text-red-500" />
              }
              <span className="font-semibold">Net P&L</span>
            </div>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(3)} CAST
            </p>
            <p className="text-sm text-muted-foreground">
              All-time profit/loss
            </p>
          </CardContent>
        </Card>

        {/* 5. Active Position Value */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Potential Win</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalPotentialWinnings.toFixed(3)} CAST</p>
            <p className="text-sm text-muted-foreground">{activeCasts.length} active positions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Activity className="h-4 w-4" />
            Active Casts ({activeCasts.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Cast History ({resolvedCasts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Performance */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Truth Casting Performance
              </CardTitle>
              <CardDescription>Your verification accuracy and earnings overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Position Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">TRUE Positions</span>
                      <span className="font-medium text-primary">
                        {userBets.filter(c => c.position === 'yes').length} casts
                      </span>
                    </div>
                    <Progress 
                      value={(userBets.filter(c => c.position === 'yes').length / userBets.length) * 100} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">FALSE Positions</span>
                      <span className="font-medium text-secondary">
                        {userBets.filter(c => c.position === 'no').length} casts
                      </span>
                    </div>
                    <Progress 
                      value={(userBets.filter(c => c.position === 'no').length / userBets.length) * 100} 
                      className="h-2 [&>div]:bg-secondary" 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Cast Results</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Won Casts</span>
                      <span className="font-medium text-green-500">
                        {wonCasts.length} / {resolvedCasts.length}
                      </span>
                    </div>
                    <Progress value={winRate} className="h-2 [&>div]:bg-green-500" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Active Casts</span>
                      <span className="font-medium text-yellow-500">
                        {activeCasts.length} pending
                      </span>
                    </div>
                    <Progress 
                      value={userBets.length > 0 ? (activeCasts.length / userBets.length) * 100 : 0} 
                      className="h-2 [&>div]:bg-yellow-500" 
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{activeCasts.length}</div>
                  <div className="text-sm text-muted-foreground">Active Casts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {totalPotentialWinnings.toFixed(2)} CAST
                  </div>
                  <div className="text-sm text-muted-foreground">Potential Winnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">
                    {userBets.length > 0 ? ((userBets.filter(c => c.position === 'yes').length / userBets.length) * 100).toFixed(0) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">TRUE Bias</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {userBets.filter(c => c.status === 'active' && 
                      c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Recent Activity</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeCasts.length === 0 ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Vote className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No Active Truth Casts</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any active truth verification positions right now.
                </p>
                <Button onClick={() => window.location.reload()} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Browse Truth Markets
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeCasts.map((cast) => (
              <Card key={cast.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cast.status)}
                        {getPositionBadge(cast.position)}
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(cast.placedAt)}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-foreground leading-tight">
                        {cast.marketClaim}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cast Amount:</span>
                          <div className="font-semibold text-foreground">{cast.amount} CAST</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Odds:</span>
                          <div className="font-semibold text-foreground">{cast.odds}x</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Potential Win:</span>
                          <div className="font-semibold text-green-500">{(cast.potentialWinning || cast.potentialReturn || 0).toFixed(3)} CAST</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Position:</span>
                          <div className={`font-semibold ${cast.position === 'yes' ? 'text-primary' : 'text-secondary'}`}>
                            {cast.position === 'yes' ? 'TRUE' : 'FALSE'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Simplified - removed NFT/Sell buttons for cleaner UX */}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {resolvedCasts.length === 0 ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No Cast History</h3>
                <p className="text-muted-foreground">
                  Your resolved truth verification positions will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            resolvedCasts.map((cast) => (
              <Card key={cast.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cast.status)}
                        {getPositionBadge(cast.position)}
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Resolved {cast.resolvedAt ? formatTimeAgo(cast.resolvedAt) : 'Recently'}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-foreground leading-tight">
                        {cast.marketClaim}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cast Amount:</span>
                          <div className="font-semibold text-foreground">{cast.amount} CAST</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Odds:</span>
                          <div className="font-semibold text-foreground">{cast.odds}x</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Position:</span>
                          <div className={`font-semibold ${cast.position === 'yes' ? 'text-primary' : 'text-secondary'}`}>
                            {cast.position === 'yes' ? 'TRUE' : 'FALSE'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Result:</span>
                          <div className={`font-semibold ${
                            cast.status === 'won' ? 'text-green-500' :
                            cast.status === 'lost' ? 'text-red-500' : 'text-orange-500'
                          }`}>
                            {cast.status === 'won' ? 'CORRECT' :
                             cast.status === 'lost' ? 'INCORRECT' : 'PENDING'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P&L:</span>
                          <div className={`font-semibold ${
                            cast.status === 'won' ? 'text-green-500' :
                            cast.status === 'lost' ? 'text-red-500' : 'text-orange-500'
                          }`}>
                            {cast.status === 'won' ?
                              `+${((cast.actualWinning || 0) - cast.amount).toFixed(3)} CAST` :
                              cast.status === 'lost' ?
                              `-${cast.amount.toFixed(3)} CAST` :
                              'Awaiting resolution'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* AUTO-PAYOUT: Show payout status for won bets */}
                      {cast.status === 'won' && cast.actualWinning && cast.actualWinning > 0 && (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-green-900 dark:text-green-100">
                                Won: {cast.actualWinning?.toFixed(3)} CAST
                              </div>
                              <div className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                ✅ Auto-paid to your wallet
                              </div>
                              {cast.blockchainTxId && (
                                <a
                                  href={`https://testnet.bscscan.com/tx/${cast.blockchainTxId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-800 underline mt-1 inline-block"
                                >
                                  View payout TX ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show pending resolution info */}
                      {cast.status === 'pending' && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-orange-900 dark:text-orange-100">
                                Awaiting Resolution
                              </div>
                              <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                                Market expired, outcome pending
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show lost info */}
                      {cast.status === 'lost' && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-red-900 dark:text-red-100">
                                Lost: -{cast.amount.toFixed(3)} CAST
                              </div>
                              <div className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                                Your prediction was incorrect
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* List NFT Modal */}
      {listingNFT && (
        <ListNFTModal
          isOpen={true}
          onClose={() => setListingNFT(null)}
          nft={{
            tokenId: listingNFT.nftTokenId!,
            market: listingNFT.marketContractAddress!,
            shares: listingNFT.amount.toString(),
            isYes: listingNFT.position === 'yes',
            timestamp: Math.floor(listingNFT.placedAt.getTime() / 1000),
            owner: '' // Will be fetched by modal
          }}
          marketClaim={listingNFT.marketClaim}
          onSuccess={handleListingSuccess}
        />
      )}
    </div>
  );
}