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
  const [localBets, setLocalBets] = useState<UserBet[]>(propUserBets);
  const [claimingBet, setClaimingBet] = useState<string | null>(null); // Track which bet is being claimed
  const [claimingAll, setClaimingAll] = useState(false); // Track bulk claim

  // Use local bets state which gets updated from localStorage
  const userBets = localBets;

  // Load bets from localStorage
  const loadBetsFromStorage = () => {
    try {
      const walletKeys = Object.keys(localStorage).filter(key => key.startsWith('user_bets_'));
      if (walletKeys.length === 0) return [];

      const walletAddress = walletKeys[0].replace('user_bets_', '');
      const storageKey = `user_bets_${walletAddress}`;
      const data = localStorage.getItem(storageKey);
      if (!data) return [];

      const bets = JSON.parse(data);
      // Convert to UserBet format
      return bets.map((bet: any) => ({
        ...bet,
        placedAt: new Date(bet.placedAt),
        resolvedAt: bet.resolvedAt ? new Date(bet.resolvedAt) : undefined
      }));
    } catch (error) {
      console.error('Error loading bets from storage:', error);
      return [];
    }
  };

  // CRITICAL: Sync bets with market resolution status on mount
  // This catches any bets that missed resolution updates
  useEffect(() => {
    const syncBetsWithResolutions = async () => {
      if (isSyncing) return;

      setIsSyncing(true);
      try {
        // Get wallet address from localStorage or context
        const walletKeys = Object.keys(localStorage).filter(key => key.startsWith('user_bets_'));
        if (walletKeys.length === 0) {
          console.log('📊 No bets found in portfolio');
          setLocalBets([]);
          return;
        }

        // Use the first wallet found (in a real app, this would come from wallet context)
        const walletAddress = walletKeys[0].replace('user_bets_', '');

        console.log('🔄 Syncing portfolio bets with market resolutions...');
        const { betResolutionService } = await import('../../utils/betResolutionService');
        const updatedCount = await betResolutionService.syncBetsWithMarketStatus(walletAddress);

        if (updatedCount > 0) {
          console.log(`✅ Portfolio sync complete: ${updatedCount} bet(s) updated with resolution status`);
        } else {
          console.log('✅ Portfolio sync complete: All bets are up to date');
        }

        // Reload bets from localStorage after sync
        const updatedBets = loadBetsFromStorage();
        setLocalBets(updatedBets);

      } catch (error) {
        console.error('❌ Error syncing portfolio bets:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Run sync on mount
    syncBetsWithResolutions();
  }, []); // Empty deps - only run once on mount

  // Update local bets when prop changes (new bet placed)
  useEffect(() => {
    if (propUserBets.length > localBets.length) {
      setLocalBets(propUserBets);
    }
  }, [propUserBets, localBets.length]);

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

  // Update bet claim status in localStorage
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

      // Update local state
      setLocalBets(prev => prev.map(bet =>
        bet.id === betId
          ? { ...bet, winningsClaimed: claimed, claimedAt: new Date() }
          : bet
      ));

      console.log(`✅ Updated claim status for bet ${betId}: claimed=${claimed}`);
    } catch (error) {
      console.error('Error updating bet claim status:', error);
    }
  };

  // Calculate portfolio stats
  const totalCastAmount = userBets.reduce((sum, cast) => sum + cast.amount, 0);
  const activeCasts = userBets.filter(cast => cast.status === 'active');
  const resolvedCasts = userBets.filter(cast => cast.status === 'won' || cast.status === 'lost');
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

        {/* Wallet Actions */}
        <div className="flex gap-2">
          {totalPnL > 0 && (
            <Button
              onClick={handleWithdrawFunds}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              title={`Withdraw your ${totalPnL.toFixed(3)} CAST profits back to HBAR`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Withdraw {totalPnL.toFixed(3)} CAST
            </Button>
          )}
          {totalUnclaimedWinnings > 0 && (
            <Button
              onClick={handleClaimAllWinnings}
              disabled={claimingAll}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <TrendingUp className="h-4 w-4" />
              {claimingAll ? 'Claiming...' : `Claim ${totalUnclaimedWinnings.toFixed(3)} CAST`}
            </Button>
          )}
        </div>
      </div>

      {/* Balance & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Vote className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-secondary">Total Cast</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCastAmount.toFixed(3)} CAST</p>
            <p className="text-sm text-muted-foreground">Across {userBets.length} positions</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-500">Truth Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resolvedCasts.length > 0 ? `${winRate.toFixed(1)}%` : '0.0%'}
            </p>
            <p className="text-sm text-muted-foreground">Verification success rate</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">P&L</span>
            </div>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(3)} CAST
            </p>
            <p className="text-sm text-muted-foreground">
              {winRate.toFixed(1)}% win rate
            </p>
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
            Cast History
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

          {/* Recent Activity */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Truth Casts
              </CardTitle>
              <CardDescription>Your latest verification positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userBets.slice(0, 5).map((cast) => (
                  <div key={cast.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(cast.status)}
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{cast.marketClaim || 'Market position'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getPositionBadge(cast.position)}
                          <span className="text-sm text-muted-foreground">
                            {cast.amount} CAST @ {cast.odds || 2.0}x
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        cast.status === 'won' ? 'text-green-500' : 
                        cast.status === 'lost' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {cast.status === 'won' && cast.actualWinning ? 
                          `+${cast.actualWinning.toFixed(3)} CAST` :
                          cast.status === 'lost' ? 
                            `-${cast.amount.toFixed(3)} CAST` :
                            `${(cast.potentialWinning || cast.potentialReturn || 0).toFixed(3)} CAST`
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(cast.placedAt)}
                      </div>
                    </div>
                  </div>
                ))}
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
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-3 w-3" />
                        View Market
                      </Button>

                      {/* NFT is auto-minted on bet placement - Show "Sell Position" button directly */}
                      {cast.nftTokenId && (
                        <>
                          {/* NFT Badge */}
                          <Badge variant="secondary" className="gap-1">
                            <Tag className="h-3 w-3" />
                            NFT #{cast.nftTokenId}
                          </Badge>

                          {/* Check if listed */}
                          {(() => {
                            const listing = nftListings.get(cast.nftTokenId!);

                            if (listing && listing.active) {
                              // NFT is listed - show listing price and cancel button
                              return (
                                <>
                                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Listed: {listing.priceFormatted} HBAR
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleCancelListing(cast)}
                                    disabled={cancelingListing === cast.id}
                                  >
                                    <X className="h-3 w-3" />
                                    {cancelingListing === cast.id ? 'Canceling...' : 'Cancel'}
                                  </Button>
                                </>
                              );
                            } else {
                              // NFT not listed - show "Sell Position" button
                              return (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                                  onClick={() => setListingNFT(cast)}
                                >
                                  <ShoppingBag className="h-3 w-3" />
                                  Sell Position
                                </Button>
                              );
                            }
                          })()}
                        </>
                      )}
                    </div>
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
                          <div className={`font-semibold ${cast.status === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                            {cast.status === 'won' ? 'CORRECT' : 'INCORRECT'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P&L:</span>
                          <div className={`font-semibold ${
                            cast.status === 'won' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {cast.status === 'won' ? 
                              `+${(cast.actualWinning! - cast.amount).toFixed(3)} CAST` :
                              `-${cast.amount.toFixed(3)} CAST`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>

                      {/* Claim button for won bets */}
                      {cast.status === 'won' && cast.marketContractAddress && (
                        <>
                          {cast.winningsClaimed ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Claimed
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleClaimWinnings(cast)}
                              disabled={claimingBet === cast.id}
                              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <DollarSign className="h-3 w-3" />
                              {claimingBet === cast.id ? 'Claiming...' : `Claim ${cast.actualWinning?.toFixed(3)}`}
                            </Button>
                          )}
                        </>
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