import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink, Shield, Zap, Brain, Globe, Users, TrendingUp, ChevronDown, ChevronUp, RefreshCw, Eye, BookOpen, Activity, Target, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { toast } from 'sonner@2.0.3';

export interface VerificationResult {
  id: string;
  claim: string;
  verdict: 'true' | 'false' | 'mixed' | 'unverified';
  confidence: number;
  aiAnalysis: string;
  sources: {
    title: string;
    url: string;
    credibility: number;
    scrapedContent?: string;
    lastScraped?: Date;
    conflictLevel?: 'low' | 'medium' | 'high';
  }[];
  blockchainHash: string;
  timestamp: Date;
  verificationTime: number;
  communityVotes?: {
    total: number;
    trueVotes: number;
    falseVotes: number;
    userVote?: 'true' | 'false';
  };
  aiLearningMetrics?: {
    previousAccuracy: number;
    currentAccuracy: number;
    learningProgress: number;
    sourcesAnalyzed: number;
    conflictsDetected: number;
    communityCorrections: number;
  };
  webScrapingStatus?: {
    sitesScraped: number;
    totalSites: number;
    lastUpdate: Date;
    isLive: boolean;
    scrapingSpeed: number;
  };
  aiSelfLearning?: {
    adaptationRate: number;
    errorCorrections: number;
    biasReductions: number;
    contextImprovements: number;
  };
}

interface VerificationResultsProps {
  result: VerificationResult;
  onNewVerification: () => void;
}

// Enhanced mock sources with realistic African and international sources
const enhancedSources = [
  {
    title: "Reuters Africa Fact Check",
    url: "https://reuters.com/fact-check/africa",
    credibility: 96,
    scrapedContent: "Independent verification shows moderate correlation with peer-reviewed studies from African medical institutions...",
    lastScraped: new Date(),
    conflictLevel: 'low' as const
  },
  {
    title: "African Union Health Observatory",
    url: "https://au-health.org/research",
    credibility: 94,
    scrapedContent: "Continental health data indicates regional variations in findings across 15 African countries...",
    lastScraped: new Date(Date.now() - 180000), // 3 minutes ago
    conflictLevel: 'low' as const
  },
  {
    title: "WHO Africa Regional Office",
    url: "https://who.int/africa/health-topics",
    credibility: 98,
    scrapedContent: "World Health Organization African region confirms methodology but notes demographic considerations...",
    lastScraped: new Date(Date.now() - 300000), // 5 minutes ago
    conflictLevel: 'medium' as const
  },
  {
    title: "PubMed Medical Database",
    url: "https://pubmed.ncbi.nlm.nih.gov",
    credibility: 97,
    scrapedContent: "Database contains 4,847 studies with 78% consensus on primary claims, geographic bias noted...",
    lastScraped: new Date(Date.now() - 120000), // 2 minutes ago
    conflictLevel: 'low' as const
  },
  {
    title: "African Medical Research Foundation",
    url: "https://amref.org/research",
    credibility: 91,
    scrapedContent: "Local research institutions provide contradictory evidence based on African population studies...",
    lastScraped: new Date(Date.now() - 420000), // 7 minutes ago
    conflictLevel: 'high' as const
  },
  {
    title: "BBC Reality Check",
    url: "https://bbc.com/news/reality_check",
    credibility: 89,
    scrapedContent: "Cross-reference with international fact-checking networks shows partial alignment with claim...",
    lastScraped: new Date(Date.now() - 240000), // 4 minutes ago
    conflictLevel: 'medium' as const
  },
  {
    title: "Africa Check Fact-Checking",
    url: "https://africacheck.org",
    credibility: 93,
    scrapedContent: "African-focused fact-checking reveals context-specific nuances not captured in global studies...",
    lastScraped: new Date(Date.now() - 360000), // 6 minutes ago
    conflictLevel: 'high' as const
  }
];

export default function VerificationResults({ result, onNewVerification }: VerificationResultsProps) {
  const [showSources, setShowSources] = useState(false);
  const [showAIMetrics, setShowAIMetrics] = useState(false);
  const [showLearningDetails, setShowLearningDetails] = useState(false);
  const [userVote, setUserVote] = useState<'true' | 'false' | null>(result.communityVotes?.userVote || null);
  const [isScrapingLive, setIsScrapingLive] = useState(true);
  const [scrapingProgress, setScrapingProgress] = useState(result.webScrapingStatus?.sitesScraped || 0);
  const [aiLearningProgress, setAiLearningProgress] = useState(0);
  const [conflictDetected, setConflictDetected] = useState(false);

  // Enhanced result with comprehensive learning metrics
  const enhancedResult: VerificationResult = {
    ...result,
    sources: enhancedSources,
    communityVotes: result.communityVotes || {
      total: Math.floor(Math.random() * 800) + 200,
      trueVotes: Math.floor(Math.random() * 400) + 100,
      falseVotes: Math.floor(Math.random() * 400) + 100,
      userVote: userVote || undefined
    },
    aiLearningMetrics: {
      previousAccuracy: 84.7,
      currentAccuracy: 91.3,
      learningProgress: 18.5,
      sourcesAnalyzed: 247,
      conflictsDetected: 23,
      communityCorrections: 156
    },
    webScrapingStatus: {
      sitesScraped: scrapingProgress,
      totalSites: 18,
      lastUpdate: new Date(),
      isLive: isScrapingLive,
      scrapingSpeed: 2.3
    },
    aiSelfLearning: {
      adaptationRate: 94.2,
      errorCorrections: 47,
      biasReductions: 12,
      contextImprovements: 89
    }
  };

  // Simulate live web scraping with realistic progression
  useEffect(() => {
    if (isScrapingLive && scrapingProgress < 18) {
      const interval = setInterval(() => {
        setScrapingProgress(prev => {
          const next = prev + 1;
          if (next >= 18) {
            setIsScrapingLive(false);
            toast.success(
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span>Web scraping complete! All sources verified across 6 countries</span>
              </div>
            );
          }
          return next;
        });
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [isScrapingLive, scrapingProgress]);

  // Simulate AI learning process
  useEffect(() => {
    const learningInterval = setInterval(() => {
      setAiLearningProgress(prev => {
        const next = Math.min(prev + 2, 100);
        if (next === 100) {
          toast.info(
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-secondary" />
              <span>AI learning cycle complete! Accuracy improved by +2.1%</span>
            </div>
          );
        }
        return next;
      });
    }, 800);

    setTimeout(() => clearInterval(learningInterval), 10000);
    return () => clearInterval(learningInterval);
  }, []);

  const getVerdictIcon = () => {
    switch (enhancedResult.verdict) {
      case 'true':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'false':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'mixed':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getVerdictColor = () => {
    switch (enhancedResult.verdict) {
      case 'true':
        return 'text-green-500';
      case 'false':
        return 'text-red-500';
      case 'mixed':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getVerdictBadge = () => {
    switch (enhancedResult.verdict) {
      case 'true':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">AI VERIFIED TRUE</Badge>;
      case 'false':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">AI VERIFIED FALSE</Badge>;
      case 'mixed':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">MIXED EVIDENCE</Badge>;
      default:
        return <Badge className="bg-muted/20 text-muted-foreground border-muted/30">UNDER VERIFICATION</Badge>;
    }
  };

  const getCommunityConsensus = () => {
    if (!enhancedResult.communityVotes) return null;
    const { trueVotes, falseVotes, total } = enhancedResult.communityVotes;
    const truePercentage = (trueVotes / total) * 100;
    const falsePercentage = (falseVotes / total) * 100;
    
    if (truePercentage > 65) return 'true';
    if (falsePercentage > 65) return 'false';
    return 'mixed';
  };

  const handleCommunityVote = (vote: 'true' | 'false') => {
    setUserVote(vote);
    
    // Check for conflict with AI verdict
    if (vote !== enhancedResult.verdict) {
      setConflictDetected(true);
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Your vote conflicts with AI assessment - contributing to learning!</span>
        </div>
      );
    } else {
      toast.success(
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Vote cast! Reinforcing AI accuracy 🗳️</span>
        </div>
      );
    }
    
    // Simulate AI learning from community feedback
    setTimeout(() => {
      toast.info(
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-secondary" />
          <span>AI adapting based on community feedback...</span>
        </div>
      );
    }, 2000);
  };

  const getConflictIndicator = () => {
    const aiVerdict = enhancedResult.verdict;
    const communityConsensus = getCommunityConsensus();
    
    if (aiVerdict !== communityConsensus && communityConsensus) {
      return (
        <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div className="flex-1">
            <p className="font-semibold text-orange-500">AI-Community Consensus Conflict Detected</p>
            <p className="text-sm text-muted-foreground">
              AI Assessment: <span className="font-medium text-orange-500">{aiVerdict.toUpperCase()}</span> ({enhancedResult.confidence}% confidence) • 
              Community Leans: <span className="font-medium text-orange-500">{communityConsensus.toUpperCase()}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              🤖 This conflict helps our AI learn African context and cultural nuances
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Verification Result */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted/20 rounded-lg">
              {getVerdictIcon()}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {getVerdictBadge()}
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {enhancedResult.confidence}% AI Confidence
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {enhancedResult.verificationTime}ms
                </Badge>
                {conflictDetected && (
                  <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Learning Conflict
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{enhancedResult.claim}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  AI Analysis Complete
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {enhancedResult.sources.length} Sources Verified
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {enhancedResult.communityVotes?.total || 0} Community Votes
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Learning Active
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Conflict Indicator */}
          {getConflictIndicator()}

          {/* Real-time Web Scraping Status */}
          {enhancedResult.webScrapingStatus && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">Live Web Scraping</span>
                  {isScrapingLive && <RefreshCw className="h-4 w-4 text-primary animate-spin" />}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isScrapingLive ? "default" : "outline"}>
                    {isScrapingLive ? "ACTIVE" : "COMPLETE"}
                  </Badge>
                  {enhancedResult.webScrapingStatus.scrapingSpeed && (
                    <Badge variant="outline">
                      {enhancedResult.webScrapingStatus.scrapingSpeed} sites/min
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>African & International Sources:</span>
                  <span className="font-medium">{scrapingProgress}/{enhancedResult.webScrapingStatus.totalSites}</span>
                </div>
                <Progress value={(scrapingProgress / enhancedResult.webScrapingStatus.totalSites) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Covering: WHO Africa, Reuters, BBC, Africa Check, AU Health, PubMed, AMREF
                </p>
              </div>
            </div>
          )}

          {/* AI Self-Learning Progress */}
          {aiLearningProgress > 0 && (
            <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-secondary" />
                  <span className="font-semibold text-secondary">AI Self-Learning in Progress</span>
                </div>
                <Badge variant="outline">
                  {aiLearningProgress}% Complete
                </Badge>
              </div>
              <div className="space-y-2">
                <Progress value={aiLearningProgress} className="h-2 [&>div]:bg-secondary" />
                <p className="text-xs text-muted-foreground">
                  Analyzing community feedback • Adjusting bias parameters • Improving African context understanding
                </p>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-secondary" />
              AI Truth Analysis
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {enhancedResult.aiAnalysis}
            </p>
          </div>

          {/* Community vs AI Consensus */}
          {enhancedResult.communityVotes && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Community Truth Consensus vs AI Assessment
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* AI Verdict */}
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-secondary" />
                    <span className="font-medium">AI Assessment</span>
                  </div>
                  <div className={`text-2xl font-bold ${getVerdictColor()}`}>
                    {enhancedResult.verdict.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {enhancedResult.confidence}% confidence
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Based on {enhancedResult.sources.length} sources
                  </div>
                </div>

                {/* Community Verdict */}
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">Community Consensus</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {getCommunityConsensus()?.toUpperCase() || 'MIXED'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {enhancedResult.communityVotes.total} total votes
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    African community perspective
                  </div>
                </div>
              </div>

              {/* Vote Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Community Vote Distribution:</span>
                  <span className="text-xs text-muted-foreground">
                    {enhancedResult.communityVotes.total} verifiers participated
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-500">TRUE Votes:</span>
                    <span className="font-semibold text-green-500">
                      {enhancedResult.communityVotes.trueVotes} 
                      ({((enhancedResult.communityVotes.trueVotes / enhancedResult.communityVotes.total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={(enhancedResult.communityVotes.trueVotes / enhancedResult.communityVotes.total) * 100} 
                    className="h-2" 
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-500">FALSE Votes:</span>
                    <span className="font-semibold text-red-500">
                      {enhancedResult.communityVotes.falseVotes} 
                      ({((enhancedResult.communityVotes.falseVotes / enhancedResult.communityVotes.total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={(enhancedResult.communityVotes.falseVotes / enhancedResult.communityVotes.total) * 100} 
                    className="h-2 [&>div]:bg-red-500" 
                  />
                </div>
              </div>

              {/* User Voting Interface */}
              {!userVote && (
                <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">Cast Your Truth Vote</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Help improve AI accuracy by voting on this claim's truthfulness. Your African perspective matters!
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleCommunityVote('true')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      Vote TRUE
                    </Button>
                    <Button 
                      onClick={() => handleCommunityVote('false')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                      Vote FALSE
                    </Button>
                  </div>
                </div>
              )}

              {/* User Vote Confirmation */}
              {userVote && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      You voted: <span className="font-bold">{userVote.toUpperCase()}</span>
                    </span>
                    {conflictDetected && (
                      <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 ml-2">
                        Helping AI Learn
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced AI Learning Metrics */}
          {enhancedResult.aiLearningMetrics && (
            <Collapsible open={showAIMetrics} onOpenChange={setShowAIMetrics}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    AI Learning & Self-Improvement Metrics
                  </span>
                  {showAIMetrics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium">Accuracy Evolution</span>
                    </div>
                    <div className="text-xl font-bold text-secondary">
                      +{(enhancedResult.aiLearningMetrics.currentAccuracy - enhancedResult.aiLearningMetrics.previousAccuracy).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      From {enhancedResult.aiLearningMetrics.previousAccuracy}% to {enhancedResult.aiLearningMetrics.currentAccuracy}%
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Learning Velocity</span>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      +{enhancedResult.aiLearningMetrics.learningProgress}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      This verification cycle
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {enhancedResult.aiLearningMetrics.sourcesAnalyzed}
                    </div>
                    <div className="text-sm text-muted-foreground">Sources Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {enhancedResult.aiLearningMetrics.conflictsDetected}
                    </div>
                    <div className="text-sm text-muted-foreground">Conflicts Detected</div>
                  </div>
                </div>

                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {enhancedResult.aiLearningMetrics.communityCorrections}
                    </div>
                    <div className="text-sm text-muted-foreground">Community Corrections Applied</div>
                  </div>
                </div>

                {/* Self-Learning Details */}
                {enhancedResult.aiSelfLearning && (
                  <Collapsible open={showLearningDetails} onOpenChange={setShowLearningDetails}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between text-sm">
                        <span>Self-Learning Breakdown</span>
                        {showLearningDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Adaptation Rate:</span>
                          <span className="font-medium">{enhancedResult.aiSelfLearning.adaptationRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Corrections:</span>
                          <span className="font-medium">{enhancedResult.aiSelfLearning.errorCorrections}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bias Reductions:</span>
                          <span className="font-medium">{enhancedResult.aiSelfLearning.biasReductions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Context Improvements:</span>
                          <span className="font-medium">{enhancedResult.aiSelfLearning.contextImprovements}</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Sources Section */}
          <Collapsible open={showSources} onOpenChange={setShowSources}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  View Verification Sources ({enhancedResult.sources.length})
                </span>
                {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-4">
              {enhancedResult.sources.map((source, index) => (
                <div key={index} className="p-4 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-foreground">{source.title}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {source.credibility}% credibility
                        </Badge>
                        {source.conflictLevel && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              source.conflictLevel === 'high' ? 'border-red-500/30 text-red-500' :
                              source.conflictLevel === 'medium' ? 'border-yellow-500/30 text-yellow-500' :
                              'border-green-500/30 text-green-500'
                            }`}
                          >
                            {source.conflictLevel} conflict
                          </Badge>
                        )}
                        {source.lastScraped && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {Math.floor((Date.now() - source.lastScraped.getTime()) / 60000)}m ago
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  {source.scrapedContent && (
                    <div className="mt-3 p-3 bg-muted/10 rounded border-l-2 border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Live Scraped Content:</span>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        "{source.scrapedContent}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={onNewVerification} className="flex-1">
              <Zap className="h-4 w-4 mr-2" />
              Verify New Claim
            </Button>
            <Button variant="outline" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Join Discussion
            </Button>
          </div>

          {/* Blockchain Verification */}
          <div className="p-3 bg-muted/10 rounded-lg border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Blockchain Verification & AI Learning Record</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Hash: {enhancedResult.blockchainHash}
            </p>
            <p className="text-xs text-muted-foreground">
              Verified at: {enhancedResult.timestamp.toLocaleString()} • Learning cycle: #{Math.floor(Math.random() * 1000) + 1}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}