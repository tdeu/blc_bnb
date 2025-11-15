import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  TrendingUp, TrendingDown, Users, Clock, Target, Star, MessageCircle,
  ArrowLeft, Share2, Heart, Bookmark, Zap, Globe, Shield,
  ThumbsUp, ThumbsDown, Send, Filter, Eye, AlertCircle,
  CheckCircle2, Clock3, FileText, Scale, Loader2, Brain
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../shared/LanguageContext';
import { BettingMarket } from './BettingMarkets';
import { generateMockComments, getMarketRules, formatTimeAgo, MarketComment, MarketRule } from '../../utils/marketData';
import { debugClickHandler, validateButtonState, logCastingOperation } from '../../utils/testHelpers';
import ResolutionStatus from '../shared/ResolutionStatus';
import { MarketResolution } from '../../utils/supabase';
import { resolutionService } from '../../utils/resolutionService';
import { walletService } from '../../utils/walletService';
import { AIAgentSimple } from '../ai/AIAgentSimple';
import { useBlockCastAI } from '../../hooks/useBlockCastAI';
import { userDataService } from '../../utils/userDataService';

interface MarketPageProps {
  market: BettingMarket;
  onPlaceBet: (marketId: string, position: 'yes' | 'no', amount: number) => void;
  userBalance: number;
  onBack: () => void;
  walletConnected?: boolean;
  onConnectWallet?: () => void;
}

const quickCastAmounts = [0.01, 0.05, 0.1, 0.5, 1.0];

export default function MarketPage({ market, onPlaceBet, userBalance, onBack, walletConnected = false, onConnectWallet }: MarketPageProps) {
  const { t, language } = useLanguage();
  const [castPosition, setCastPosition] = useState<'yes' | 'no'>('yes');
  const [castAmount, setCastAmount] = useState<string>('');
  const [profitCalculation, setProfitCalculation] = useState<{ amount: number; potential: number; profit: number } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<'yes' | 'no' | 'neutral'>('neutral');
  const [comments] = useState<MarketComment[]>(generateMockComments(market.id));
  const [rules] = useState<MarketRule[]>(getMarketRules(market.id));
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'rules' | 'analysis' | 'resolution'>('overview');
  
  // Resolution state (simplified - no more disputes/evidence)
  const [resolution, setResolution] = useState<MarketResolution | null>(null);

  // AI Agent integration
  const {
    processCommand,
    status: aiStatus,
    isProcessing: aiProcessing,
    lastResult: aiResult
  } = useBlockCastAI();
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Market activity (bets history)
  const [marketBets, setMarketBets] = useState<any[]>([]);

  // Activity feed state
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(walletConnected);
  const [userWalletBalance, setUserWalletBalance] = useState(0);

  // Helper function to get translated text
  const getTranslatedText = (text: string, translations?: { en: string; fr: string; sw: string }) => {
    if (!translations) return text;
    return translations[language] || translations.en || text;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}k`;
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${formatNumber(amount)}`;
  };

  const isMarketExpired = (): boolean => {
    return new Date(market.expiresAt) <= new Date();
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return t('expired');

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleQuickCast = (position: 'yes' | 'no', amount: number) => {
    if (!walletConnected && onConnectWallet) {
      toast.info('Please connect your wallet to place trades');
      onConnectWallet();
      return;
    }

    // Check if market is open for trading
    if (market.status !== 'active' && market.status !== 'open') {
      toast.error(`Cannot place bets - market is ${market.status}. Only open markets accept new positions.`);
      return;
    }

    if (amount > userBalance) {
      toast.error(t('insufficientBalance') || 'Insufficient balance');
      return;
    }

    onPlaceBet(market.id, position, amount);

    // Success feedback
    const displayPosition = position === 'yes' ? 'TRUE' : 'FALSE';
    toast.success(`Truth position cast: ${displayPosition} with ${amount} CAST`);
  };

  const calculateProfit = (amount: number, position: 'yes' | 'no') => {
    const odds = position === 'yes' ? market.yesOdds : market.noOdds;
    const potentialReturn = amount * odds;
    const profit = potentialReturn - amount;
    return { amount, potential: potentialReturn, profit };
  };

  const handleAmountChange = (value: string) => {
    setCastAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setProfitCalculation(calculateProfit(amount, castPosition));
    } else {
      setProfitCalculation(null);
    }
  };

  const handlePositionChange = (position: 'yes' | 'no') => {
    setCastPosition(position);
    const amount = parseFloat(castAmount);
    if (!isNaN(amount) && amount > 0) {
      setProfitCalculation(calculateProfit(amount, position));
    }
  };

  const handleCustomCast = () => {
    if (!walletConnected && onConnectWallet) {
      toast.info('Please connect your wallet to place trades');
      onConnectWallet();
      return;
    }

    const amount = parseFloat(castAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > userBalance) {
      toast.error(t('insufficientBalance') || 'Insufficient balance');
      return;
    }

    onPlaceBet(market.id, castPosition, amount);
    setCastAmount('');
    setProfitCalculation(null);

    const displayPosition = castPosition === 'yes' ? 'TRUE' : 'FALSE';
    toast.success(`Custom truth position cast: ${displayPosition} with ${amount} CAST`);
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    // Mock comment submission
    toast.success('Comment posted successfully!');
    setNewComment('');
    setCommentPosition('neutral');
  };

  // Resolution handlers (simplified - no more disputes)

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const command = `Analyze market evidence for: "${getTranslatedText(market.claim, market.claimTranslations)}".
      Market details: ${getTranslatedText(market.description, market.descriptionTranslations)}.
      Country: ${market.country || market.region}.
      Current status: ${market.status}.
      Provide confidence score, key factors, cultural context analysis, and multi-language evidence assessment.`;

      const result = await processCommand(command);
      setAIAnalysis(result);

      if (result) {
        toast.success('AI analysis completed successfully');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Evidence and dispute system removed - markets now resolve automatically

  // Load activity feed data
  const loadMarketActivity = async () => {
    setIsLoadingActivity(true);
    try {
      // Evidence is now loaded from on-chain disputes only (no legacy database evidence)

      // Load bet history from localStorage and blockchain if contract address exists
      let bets: any[] = [];
      if (market.contractAddress) {
        try {
          // For BSC, we can query bet events from the contract
          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

          const marketABI = [
            'event BetPlaced(address indexed user, bool position, uint256 amount, uint256 timestamp)'
          ];
          const contract = new ethers.Contract(market.contractAddress, marketABI, provider);

          // Query past events (last 1000 blocks)
          const filter = contract.filters.BetPlaced();
          const events = await contract.queryFilter(filter, -1000);

          const blockchainBets = events.map((event: any) => ({
            id: event.transactionHash,
            walletAddress: event.args.user,
            position: event.args.position ? 'yes' : 'no',
            amount: parseFloat(ethers.formatEther(event.args.amount)),
            placedAt: new Date(Number(event.args.timestamp) * 1000),
            transactionHash: event.transactionHash
          }));

          console.log('📊 Loaded BSC blockchain bets:', blockchainBets);
          bets = blockchainBets;
        } catch (error) {
          console.error('Failed to load BSC bets, falling back to localStorage:', error);
          // Fallback to localStorage bets if blockchain fetch fails
          bets = userDataService.getMarketBets(market.id);
        }
      } else {
        // No contract address, use localStorage bets
        bets = userDataService.getMarketBets(market.id);
      }

      setMarketBets(bets);
      console.log('📊 Total bets loaded:', bets.length);

      // Dispute system removed - using automated AI resolution
    } catch (error) {
      console.error('Failed to load market activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Sync wallet connection state with prop
  React.useEffect(() => {
    setIsWalletConnected(walletConnected);
  }, [walletConnected]);

  // Check wallet connection and balance on component mount
  React.useEffect(() => {
    const checkWalletStatus = async () => {
      const connected = walletService.isConnected();
      setIsWalletConnected(connected);

      if (connected) {
        try {
          const balance = await walletService.getBalance();
          setUserWalletBalance(parseFloat(balance));
        } catch (error) {
          console.error('Failed to get wallet balance:', error);
        }
      }
    };

    checkWalletStatus();
    loadMarketActivity(); // Load activity feed

    // Refresh balance periodically
    const interval = setInterval(checkWalletStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [market.id]);

  const handleConnectWallet = async () => {
    try {
      await walletService.connectMetaMask();
      const connected = walletService.isConnected();
      setIsWalletConnected(connected);

      if (connected) {
        const balance = await walletService.getBalance();
        setUserWalletBalance(parseFloat(balance));
        toast.success('Wallet connected successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  const handleEvidenceSubmit = async () => {
    // Validation
    if (!evidenceText.trim() && evidenceFiles.length === 0) {
      toast.error('Please provide evidence text or upload files');
      return;
    }

    if (evidenceText.trim().length < 20 && evidenceFiles.length === 0) {
      toast.error('Evidence must be at least 20 characters or include files');
      return;
    }

    if (!isWalletConnected) {
      toast.error('Please connect your MetaMask wallet first');
      return;
    }

    const connection = walletService.getConnection();
    if (!connection) {
      toast.error('Wallet connection not found. Please reconnect your wallet.');
      return;
    }

    setIsSubmittingEvidence(true);
    setSubmissionStep('validating');

    try {
      // Step 1: Validate
      setTimeout(() => setSubmissionStep('payment'), 500);

      // Step 2: Upload files to IPFS + Save to database
      setTimeout(() => setSubmissionStep('storing'), 1000);

      const result = await evidenceService.submitEvidence({
        marketId: market.id,
        evidenceText: evidenceText,
        files: evidenceFiles
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit evidence');
      }

      // Step 3: Complete
      setSubmissionStep('complete');

      toast.success(
        <div className="space-y-2">
          <p className="font-semibold">✅ Evidence submitted successfully!</p>
          {result.ipfsHashes && result.ipfsHashes.length > 0 && (
            <p className="text-sm">{result.ipfsHashes.length} file(s) uploaded to IPFS</p>
          )}
          <p className="text-xs text-muted-foreground">
            Evidence ID: {result.evidenceId}
          </p>
        </div>,
        { duration: 5000 }
      );

      // Reset form
      setEvidenceText('');
      setEvidenceFiles([]);
      setEvidenceLinks(['']);

      // Reload evidence list
      setTimeout(() => {
        setSubmissionStep('idle');
        loadMarketActivity();
      }, 2000);

    } catch (error: any) {
      console.error('Evidence submission error:', error);
      toast.error(error.message || 'Failed to submit evidence');
      setSubmissionStep('idle');
    } finally {
      setIsSubmittingEvidence(false);
      if (submissionStep !== 'complete') {
        setSubmissionStep('idle');
      }
    }
  };

  // Mock resolution data based on market status
  const getResolutionData = (): MarketResolution | undefined => {
    if (!market.resolution_data) return undefined;
    
    return {
      id: `resolution-${market.id}`,
      market_id: market.id,
      outcome: market.resolution_data.outcome,
      source: market.resolution_data.source || 'api',
      api_data: null,
      confidence: market.resolution_data.confidence,
      timestamp: market.resolution_data.timestamp || new Date().toISOString(),
      dispute_period_end: market.dispute_period_end || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      final_outcome: market.resolution_data.final_outcome,
      resolved_by: market.resolution_data.resolved_by,
      admin_notes: market.resolution_data.admin_notes,
      hts_token_id: 'mock-token-id',
      contract_id: market.resolution_data.contract_id || '',
      transaction_id: market.resolution_data.transaction_id,
      consensus_timestamp: market.resolution_data.consensus_timestamp,
      created_at: market.resolution_data.timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const handleLikeComment = (commentId: string) => {
    const newLikedComments = new Set(likedComments);
    if (likedComments.has(commentId)) {
      newLikedComments.delete(commentId);
    } else {
      newLikedComments.add(commentId);
    }
    setLikedComments(newLikedComments);
  };

  const getRuleIcon = (category: string) => {
    switch (category) {
      case 'resolution': return CheckCircle2;
      case 'timing': return Clock3;
      case 'eligibility': return FileText;
      case 'verification': return Shield;
      default: return AlertCircle;
    }
  };

  const getRuleColor = (category: string) => {
    switch (category) {
      case 'resolution': return 'text-green-500';
      case 'timing': return 'text-blue-500';
      case 'eligibility': return 'text-yellow-500';
      case 'verification': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('backToMarkets')}
        </Button>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className={`gap-1 ${isLiked ? 'text-red-500' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {formatNumber(Math.floor(Math.random() * 500) + 100)}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`gap-1 ${isBookmarked ? 'text-primary' : ''}`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-1">
            <Share2 className="h-4 w-4" />
            {t('share')}
          </Button>
        </div>
      </div>

      {/* Market Header Card */}
      <Card className="overflow-hidden">
        {market.imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={market.imageUrl}
              alt={getTranslatedText(market.claim, market.claimTranslations)}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />

            {market.trending && (
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {t('trending')}
                </Badge>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4">
              <Badge variant="outline" className="text-xs mb-2 bg-background/80">
                {market.category}
              </Badge>
              <h1 className="text-xl font-bold text-white mb-2">
                {getTranslatedText(market.claim, market.claimTranslations)}
              </h1>
            </div>
          </div>
        )}

        <CardContent className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Market Info */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-muted-foreground">
                {getTranslatedText(market.description, market.descriptionTranslations)}
              </p>

              {/* Location & Source */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{market.country || market.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{market.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{t('expiresIn')} {getTimeRemaining(market.expiresAt)}</span>
                </div>
              </div>

              {/* Pool Distribution */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('truthVerificationPool')}</span>
                  <span className="text-sm font-bold">{formatCurrency(market.totalPool)}</span>
                </div>
                <Progress
                  value={(market.yesPool / market.totalPool) * 100}
                  className="h-3"
                />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary">{t('truthYes')}</span>
                    <span className="font-medium">{formatCurrency(market.yesPool)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">{t('truthNo')}</span>
                    <span className="font-medium">{formatCurrency(market.noPool)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Odds & Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`text-center p-4 rounded-lg border ${isMarketExpired() ? 'bg-gray-500/10 border-gray-500/20 opacity-60' : 'bg-primary/10 border-primary/20'}`}>
                  <div className="text-sm mb-1 text-muted-foreground">{t('truthYes')}</div>
                  <div className={`text-2xl font-bold ${isMarketExpired() ? 'text-gray-500' : 'text-primary'}`}>{market.yesOdds.toFixed(2)}x</div>
                </div>
                <div className={`text-center p-4 rounded-lg border ${isMarketExpired() ? 'bg-gray-500/10 border-gray-500/20 opacity-60' : 'bg-secondary/10 border-secondary/20'}`}>
                  <div className="text-sm mb-1 text-muted-foreground">{t('truthNo')}</div>
                  <div className={`text-2xl font-bold ${isMarketExpired() ? 'text-gray-500' : 'text-secondary'}`}>{market.noOdds.toFixed(2)}x</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{formatNumber(market.totalCasters)} {t('verifiers')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(Math.floor(Math.random() * 10000) + 5000)} {t('views')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{comments.length} {t('comments')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span>{formatNumber(Math.floor(Math.random() * 500) + 100)} {t('likes')}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence/dispute system removed - markets now resolve automatically */}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
        {[
          { id: 'overview', label: t('overview'), icon: Target },
          { id: 'comments', label: t('comments'), icon: MessageCircle, count: comments.length },
          { id: 'rules', label: t('rules'), icon: Scale },
          { id: 'analysis', label: t('aiAnalysis'), icon: Zap },
          ...(isMarketExpired() ? [{ id: 'resolution', label: 'AI Resolution', icon: Brain }] : [])
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 gap-2"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t('marketOverview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Resolution Result - Show prominently for resolved markets */}
                {isMarketExpired() && market.resolution_data && market.resolution_data.final_outcome && (
                  <>
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Resolution</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Powered by Perplexity</p>
                          </div>
                        </div>
                        <Badge
                          className={`text-2xl px-6 py-3 font-bold shadow-lg ${
                            market.resolution_data.final_outcome === 'yes'
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-red-500 hover:bg-red-600'
                          } text-white`}
                        >
                          {market.resolution_data.final_outcome === 'yes' ? 'YES' : 'NO'}
                        </Badge>
                      </div>

                      {market.resolution_data.admin_notes && (
                        <div className="mt-4 p-4 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            AI Analysis:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {market.resolution_data.admin_notes}
                          </p>
                        </div>
                      )}

                      {market.resolution_data.confidence && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Confidence:</span>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              market.resolution_data.confidence === 'high'
                                ? 'border-green-500 text-green-700 dark:text-green-400'
                                : market.resolution_data.confidence === 'medium'
                                ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                                : 'border-orange-500 text-orange-700 dark:text-orange-400'
                            }`}
                          >
                            {market.resolution_data.confidence}
                          </Badge>
                          {market.resolution_data.timestamp && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                              Resolved: {new Date(market.resolution_data.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                <div>
                  <h3 className="font-semibold mb-2">{t('marketDescription')}</h3>
                  <p className="text-muted-foreground">
                    {getTranslatedText(market.description, market.descriptionTranslations)}
                  </p>
                </div>

                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">{t('verificationMethodology')}</h3>
                  <p className="text-muted-foreground">
                    This market uses AI-powered truth verification combined with community consensus. 
                    Our system analyzes multiple credible sources, cross-references data, and incorporates 
                    expert analysis to determine the most accurate outcome.
                  </p>
                </div>
                
                <Separator />

                {/* Resolution Status - Show if market has resolution data or is not active */}
                {(market.status !== 'active' || market.resolution_data) && (
                  <>
                    <ResolutionStatus
                      market={market}
                      resolution={getResolutionData()}
                      onDispute={() => {}}
                      transactionId={market.resolution_data?.transaction_id}
                      consensusTimestamp={market.resolution_data?.consensus_timestamp ? new Date(market.resolution_data.consensus_timestamp) : undefined}
                      disputeCount={market.dispute_count || 0}
                      canDispute={false}
                    />
                    <Separator />
                  </>
                )}

                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">{t('marketStatus')}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={market.status === 'active' ? 'default' : (market.status === 'resolved' ? 'secondary' : 'secondary')}>
                      {market.status.toUpperCase()}
                    </Badge>
                    {(market as any).contractAddress && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {(market as any).contractAddress}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {t('expiresIn')} {getTimeRemaining(market.expiresAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {t('communityDiscussion')} ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Comment */}
                {!isMarketExpired() ? (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label>{t('shareYourThoughts')}</Label>
                    <Textarea
                      placeholder={t('writeCommentPlaceholder')}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-20"
                    />
                    <div className="flex items-center justify-between">
                      <Select value={commentPosition} onValueChange={(value: any) => setCommentPosition(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neutral">{t('neutral')}</SelectItem>
                          <SelectItem value="yes">{t('truthYes')}</SelectItem>
                          <SelectItem value="no">{t('truthNo')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleCommentSubmit} className="gap-2">
                        <Send className="h-4 w-4" />
                        {t('postComment')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border text-center text-sm text-muted-foreground">
                    <AlertCircle className="h-5 w-5 inline-block mr-2" />
                    Market has expired. Comments are read-only.
                  </div>
                )}

                <Separator />

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-card/50 rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.avatar} />
                        <AvatarFallback>{comment.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{comment.username}</span>
                          {comment.isVerified && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                          {comment.position && (
                            <Badge 
                              variant={comment.position === 'yes' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {comment.position === 'yes' ? t('truthYes') : t('truthNo')}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm">{comment.comment}</p>
                        
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikeComment(comment.id)}
                            className={`gap-1 h-8 ${likedComments.has(comment.id) ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                            {comment.likes + (likedComments.has(comment.id) ? 1 : 0)}
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 h-8 text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            {t('reply')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  {t('marketRules')} & {t('conditions')}
                </CardTitle>
                <CardDescription>
                  {t('marketRulesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.map((rule) => {
                  const Icon = getRuleIcon(rule.category);
                  return (
                    <div key={rule.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${getRuleColor(rule.category)}`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{rule.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {rule.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {t('aiAnalysis')} & {t('insights')}
                  </CardTitle>
                  <AIAgentSimple compact={true} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Agent Status and Analysis Trigger */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || aiProcessing}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Zap className="h-4 w-4" />
                    {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
                  </Button>
                  {aiResult && (
                    <Button 
                      onClick={() => setAIAnalysis(null)}
                      variant="outline"
                      size="sm"
                    >
                      Clear Analysis
                    </Button>
                  )}
                </div>

                {/* AI Analysis Results */}
                {isAnalyzing && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium">AI Analysis in Progress...</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analyzing market evidence, cultural context, and multi-language sources...
                    </p>
                  </div>
                )}

                {aiResult && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">AI Confidence Assessment</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={aiResult.confidence || 72} className="flex-1" />
                        <span className="font-bold">{aiResult.confidence || 72}%</span>
                      </div>
                    </div>

                    {aiResult.keyFactors && (
                      <div className="space-y-3">
                        <h4 className="font-semibold">5 facts that may help you to cast your vote</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {aiResult.keyFactors.map((factor: any, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback to mock data when AI is not available */}
                {!aiResult && !isAnalyzing && aiStatus !== 'ready' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        AI Agent setup required for real-time analysis. Showing example analysis below.
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">AI Confidence Assessment</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={74} className="flex-1" />
                        <span className="font-bold">74%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">5 facts that may help you to cast your vote</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          Historical analysis of this topic involves examining multiple scholarly sources and contemporary records
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          Most academic historians distinguish between historical evidence and theological claims
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          Cross-cultural perspectives and regional context should be considered in the analysis
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          The resolution criteria require clear, verifiable evidence from reliable sources
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          Community consensus and expert verification help ensure accuracy of outcomes
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* AI Resolution Tab (only for expired markets) */}
          {activeTab === 'resolution' && isMarketExpired() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  AI Resolution
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  This market has been resolved using AI-powered analysis
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {market.resolution_data ? (
                  <>
                    {/* Resolution Outcome */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Resolution Outcome</h3>
                        <Badge className={`text-lg px-4 py-2 ${market.resolution_data.final_outcome === 'yes' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                          {market.resolution_data.final_outcome === 'yes' ? 'TRUE' : 'FALSE'}
                        </Badge>
                      </div>
                      {market.resolution_data.confidence && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Confidence Level</span>
                            <span className="font-semibold capitalize">{market.resolution_data.confidence}</span>
                          </div>
                          <Progress
                            value={market.resolution_data.confidence === 'high' ? 90 : market.resolution_data.confidence === 'medium' ? 70 : 50}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>

                    {/* AI Reasoning */}
                    {market.resolution_data.admin_notes && (
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          AI Analysis & Reasoning
                        </h4>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {market.resolution_data.admin_notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Source Information */}
                    {market.resolution_data.source && (
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Data Sources
                        </h4>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground">
                            {market.resolution_data.source}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Resolution Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {market.resolution_data.resolved_by && (
                        <div>
                          <div className="text-muted-foreground mb-1">Resolved By</div>
                          <div className="font-medium capitalize">{market.resolution_data.resolved_by}</div>
                        </div>
                      )}
                      {market.resolution_data.timestamp && (
                        <div>
                          <div className="text-muted-foreground mb-1">Resolution Time</div>
                          <div className="font-medium">{new Date(market.resolution_data.timestamp).toLocaleString()}</div>
                        </div>
                      )}
                      {market.resolution_data.transaction_id && (
                        <div className="col-span-2">
                          <div className="text-muted-foreground mb-1">Transaction ID</div>
                          <div className="font-mono text-xs truncate">{market.resolution_data.transaction_id}</div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-blue-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Resolution Pending</h3>
                    <p className="text-sm text-muted-foreground">
                      This market will be resolved automatically by our AI system within seconds of expiration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Casting Interface */}
        <div className="space-y-6">
            {!isMarketExpired() ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {t('castYourPosition')}
                  </CardTitle>
                  <CardDescription>
                    {t('currentBalance')}: {userBalance.toFixed(3)} CAST
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Cast Buttons */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t('quickCastTruth')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {quickCastAmounts.slice(0, 4).map((amount) => (
                        <Button
                          key={`yes-${amount}`}
                          variant="outline"
                          size="sm"
                          className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuickCast('yes', amount);
                          }}
                          disabled={isMarketExpired() || (walletConnected && amount > userBalance)}
                        >
                          <span className="text-primary font-semibold">TRUE</span>
                          <span className="ml-2">{amount} CAST</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t('quickCastFalse')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {quickCastAmounts.slice(0, 4).map((amount) => (
                        <Button
                          key={`no-${amount}`}
                          variant="outline"
                          size="sm"
                          className="bg-secondary/5 border-secondary/20 hover:bg-secondary/10 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuickCast('no', amount);
                          }}
                          disabled={isMarketExpired() || (walletConnected && amount > userBalance)}
                        >
                          <span className="text-secondary font-semibold">FALSE</span>
                          <span className="ml-2">{amount} CAST</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Custom Cast */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t('customAmount')}</Label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Select value={castPosition} onValueChange={(value: any) => handlePositionChange(value)} disabled={isMarketExpired()}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">{t('truth')}</SelectItem>
                            <SelectItem value="no">{t('false')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={castAmount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="flex-1"
                          disabled={isMarketExpired()}
                        />
                      </div>

                      {/* Real-time Profit Calculator */}
                      {profitCalculation && (
                        <div className="p-3 bg-muted/30 rounded-lg border border-border">
                          <h4 className="text-sm font-medium mb-2 text-primary">Profit Calculator</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Your Stake:</span>
                              <span className="font-medium">{profitCalculation.amount.toFixed(3)} CAST</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Odds:</span>
                              <span className="font-medium">{(castPosition === 'yes' ? market.yesOdds : market.noOdds).toFixed(2)}x</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Potential Return:</span>
                              <span className="font-medium text-green-400">{profitCalculation.potential.toFixed(3)} CAST</span>
                            </div>
                            <div className="flex justify-between border-t border-border pt-1 mt-2">
                              <span className="text-muted-foreground">Profit if Correct:</span>
                              <span className="font-bold text-green-400">+{profitCalculation.profit.toFixed(3)} CAST</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loss if Wrong:</span>
                              <span className="font-bold text-red-400">-{profitCalculation.amount.toFixed(3)} CAST</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleCustomCast}
                      className="w-full gap-2"
                      disabled={isMarketExpired() || (walletConnected && (!castAmount || parseFloat(castAmount) > userBalance))}
                    >
                      <Target className="h-4 w-4" />
                      {t('castPosition')}
                    </Button>
                  </div>

                  {/* Potential Return */}
                  {castAmount && !isNaN(parseFloat(castAmount)) && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">{t('potential_return')}</div>
                      <div className="font-semibold text-green-400">
                        {(parseFloat(castAmount) * (castPosition === 'yes' ? market.yesOdds : market.noOdds)).toFixed(3)} CAST
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market Not Active</CardTitle>
                  <CardDescription>
                    This market is {market.status}. Trading new positions is disabled.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Claim Winnings Section - Show for resolved markets */}
            {market.status === 'resolved' && market.resolution_data && (() => {
              // Get user's wallet address
              const connection = walletService.getConnection();
              const userAddress = connection?.signer?.address || connection?.address;

              // Filter user's bets for this market
              const userBets = marketBets.filter((bet: any) =>
                bet.walletAddress?.toLowerCase() === userAddress?.toLowerCase()
              );

              // Calculate winnings
              const resolvedOutcome = market.resolution_data.final_outcome || market.resolution_data.outcome;
              const winningBets = userBets.filter((bet: any) => bet.position === resolvedOutcome);
              const losingBets = userBets.filter((bet: any) => bet.position !== resolvedOutcome);

              const totalBetAmount = userBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
              const totalWinnings = winningBets.reduce((sum: number, bet: any) => {
                const odds = bet.position === 'yes' ? market.yesOdds : market.noOdds;
                return sum + (bet.amount * odds);
              }, 0);

              const netProfit = totalWinnings - totalBetAmount;
              const hasWinnings = totalWinnings > 0;
              const hasLosses = losingBets.length > 0;

              // Don't show if user has no bets on this market
              if (userBets.length === 0) return null;

              return (
                <Card className={hasWinnings
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                  : "border-red-500 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20"
                }>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${hasWinnings ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {hasWinnings ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      {hasWinnings ? 'Claim Your Winnings' : 'Market Result'}
                    </CardTitle>
                    <CardDescription className={hasWinnings ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                      Market resolved: <strong>{resolvedOutcome?.toUpperCase()}</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Show user's positions */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Positions:</div>
                      {userBets.map((bet: any, index: number) => {
                        const isWinning = bet.position === resolvedOutcome;
                        const odds = bet.position === 'yes' ? market.yesOdds : market.noOdds;
                        const payout = isWinning ? bet.amount * odds : 0;

                        return (
                          <div key={index} className={`p-3 rounded-lg border ${isWinning ? 'bg-green-50 dark:bg-green-900/20 border-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-300'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge className={isWinning ? 'bg-green-600' : 'bg-red-600'}>
                                    {bet.position.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {bet.amount.toFixed(2)} CAST @ {odds.toFixed(2)}x
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(bet.placedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                {isWinning ? (
                                  <>
                                    <div className="text-sm font-bold text-green-600">
                                      +{payout.toFixed(2)} CAST
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Profit: {(payout - bet.amount).toFixed(2)} CAST
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-sm font-bold text-red-600">
                                    -{bet.amount.toFixed(2)} CAST
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Summary */}
                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total Bet:</span>
                          <span className="font-medium">{totalBetAmount.toFixed(2)} CAST</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total Winnings:</span>
                          <span className={`font-medium ${hasWinnings ? 'text-green-600' : 'text-gray-600'}`}>
                            {totalWinnings.toFixed(2)} CAST
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="font-semibold">Net Result:</span>
                          <span className={`text-lg font-bold ${netProfit > 0 ? 'text-green-600' : netProfit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)} CAST
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Claim Button - Only show if user has winnings */}
                    {hasWinnings && (
                      <>
                        <Button
                          className="w-full gap-2 bg-green-600 hover:bg-green-700"
                          size="lg"
                          onClick={async () => {
                            try {
                              if (!market.contractAddress) {
                                toast.error('Market contract address not found');
                                return;
                              }

                              // Import ethers and contract service
                              const ethers = await import('ethers');

                              // Connect user's wallet
                              const connection = walletService.getConnection();
                              if (!connection?.signer) {
                                toast.error('Please connect your wallet first');
                                return;
                              }

                              const MARKET_ABI = ["function redeem() external"];
                              const marketContract = new ethers.Contract(market.contractAddress, MARKET_ABI, connection.signer);

                              toast.loading('Claiming your winnings...');
                              const tx = await marketContract.redeem();
                              await tx.wait();

                              toast.success(`${totalWinnings.toFixed(2)} CAST added to your wallet! 🎉`);
                            } catch (error: any) {
                              console.error('Failed to claim winnings:', error);

                              // Check if error is "Not resolved" - market hasn't been resolved on blockchain yet
                              if (error.message && error.message.includes('Not resolved')) {
                                // Automatically resolve on blockchain, then claim
                                try {
                                  toast.loading('Processing your claim...');

                                  // Step 1: Resolve market on blockchain
                                  console.log('🔐 Market not resolved on blockchain yet, resolving now...');
                                  await resolutionService.resolveMarketWithAI(market.id, resolvedOutcome, 80);

                                  // Step 2: Wait a moment for transaction to be confirmed
                                  await new Promise(resolve => setTimeout(resolve, 2000));

                                  // Step 3: Now claim the winnings
                                  toast.loading('Claiming your winnings...');
                                  const tx = await marketContract.redeem();
                                  await tx.wait();

                                  toast.success(`${totalWinnings.toFixed(2)} CAST added to your wallet! 🎉`);
                                } catch (resError: any) {
                                  console.error('Failed to process claim:', resError);
                                  toast.error(`Failed to claim winnings. Please try again.`);
                                }
                              } else {
                                toast.error(`Failed to claim: ${error.message || 'Unknown error'}`);
                              }
                            }
                          }}
                        >
                          <Target className="h-5 w-5" />
                          Claim {totalWinnings.toFixed(2)} CAST
                        </Button>

                        <div className="text-xs text-center text-gray-500">
                          Transaction fee: ~0.001 BNB
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

      </div>

      {/* Market Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Market Activity Timeline
          </CardTitle>
          <CardDescription>
            Complete history of market events, evidence submissions, and blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading activity...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Market Creation Event */}
              <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">Market Created</span>
                    <Badge variant="outline" className="text-xs">
                      Genesis Event
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prediction market created by{' '}
                    <span className="font-mono text-xs bg-muted px-1 rounded">
                      {/* This would come from market creation data */}
                      0x1234...5678
                    </span>
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(market.expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    {market.contractAddress && (
                      <span className="font-mono">
                        Contract: {market.contractAddress.slice(0, 6)}...{market.contractAddress.slice(-4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Betting Activity */}
              {marketBets.map((bet) => (
                <div key={bet.id} className="flex gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      bet.position === 'yes' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {bet.position === 'yes' ? (
                        <ThumbsUp className="h-4 w-4 text-white" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        bet.position === 'yes' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {bet.position === 'yes' ? 'YES' : 'NO'} Prediction Placed
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {bet.amount} CAST
                      </Badge>
                      {bet.odds && (
                        <Badge variant="secondary" className="text-xs">
                          @ {bet.odds.toFixed(2)}x
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cast by{' '}
                      <span className="font-mono text-xs bg-muted px-1 rounded">
                        {bet.walletAddress ? `${bet.walletAddress.slice(0, 6)}...${bet.walletAddress.slice(-4)}` : 'Unknown'}
                      </span>
                      {' '}• Potential return: {bet.potentialReturn ? bet.potentialReturn.toFixed(3) : (bet.amount * 2).toFixed(3)} CAST
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(bet.placedAt).toLocaleDateString()} at {new Date(bet.placedAt).toLocaleTimeString()}</span>
                      {bet.transactionHash && (
                        <span className="font-mono">
                          TX: {bet.transactionHash.slice(0, 8)}...{bet.transactionHash.slice(-6)}
                        </span>
                      )}
                      {bet.tokenId && (
                        <span>NFT #{bet.tokenId}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Secondary Market NFT Listings */}
              {/* TODO: Fetch actual NFT listings from BetNFT contract */}
              {/* This section will show NFT positions listed for sale on the secondary market */}
              {market.status === 'open' && (
                <div className="flex gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400">Secondary Market</span>
                      <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                        NFT Trading
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Users can mint NFTs for their positions and list them for sale on the secondary market
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Go to Settings → Portfolio → Active Casts to mint NFTs for your positions
                    </div>
                  </div>
                </div>
              )}

              {/* Market Expiration Event */}
              {new Date() > market.expiresAt && (
                <div className="flex gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">Market Expired</span>
                      <Badge variant="outline" className="text-xs">
                        Timeline Event
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Prediction period ended, market entered resolution phase
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {market.expiresAt.toLocaleDateString()} at {market.expiresAt.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Dispute system removed - using automated AI resolution */}


              {/* AI Resolution Event - only show for resolved markets */}
              {market.status === 'resolved' && market.resolution_data && (
                <div className="flex gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-700 dark:text-green-400">AI Analysis Complete</span>
                      <Badge variant="outline" className="text-xs">
                        {market.resolution_data.confidence} Confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI analyzed multiple sources and determined outcome:{' '}
                      <span className={`font-semibold ${
                        market.resolution_data.outcome === 'yes' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {market.resolution_data.outcome?.toUpperCase()}
                      </span>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{market.resolution_data.timestamp ? new Date(market.resolution_data.timestamp).toLocaleDateString() : 'Recent'}</span>
                      {market.resolution_data.transaction_id && (
                        <span className="font-mono">
                          BSC TX: {market.resolution_data.transaction_id.slice(0, 8)}...{market.resolution_data.transaction_id.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Final Resolution Event */}
              {market.status === 'resolved' && market.resolution_data?.final_outcome && (
                <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-400">Market 100% Resolved</span>
                      <Badge variant="outline" className="text-xs">
                        Final
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Market resolution finalized by AI and community consensus. Final outcome:{' '}
                      <span className={`font-bold ${
                        market.resolution_data.final_outcome === 'yes' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {market.resolution_data.final_outcome.toUpperCase()}
                      </span>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Resolved by: {market.resolution_data.resolved_by || 'AI + Community'}</span>
                      {market.resolution_data.consensus_timestamp && (
                        <span className="font-mono">
                          Consensus: {new Date(market.resolution_data.consensus_timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!market.resolution_data && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No additional activity yet.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Modal removed - no longer using dispute system */}
    </div>
  );
} 
