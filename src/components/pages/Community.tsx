import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Users, MessageCircle, TrendingUp, Award, Target, Vote, Brain, AlertTriangle, CheckCircle, XCircle, Clock, Search, Filter, ThumbsUp, ThumbsDown, Share2, BookOpen, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CommunityVerification {
  id: string;
  claim: string;
  submittedBy: string;
  submittedAt: Date;
  category: string;
  status: 'voting' | 'ai-analyzing' | 'completed' | 'conflicted';
  votes: {
    total: number;
    trueVotes: number;
    falseVotes: number;
  };
  aiVerdict?: 'true' | 'false' | 'mixed';
  aiConfidence?: number;
  conflictLevel?: 'none' | 'low' | 'high';
  sources?: number;
  discussionCount: number;
  tags: string[];
  userVote?: 'true' | 'false';
  priority: 'low' | 'medium' | 'high';
}

interface TopContributor {
  id: string;
  username: string;
  avatar: string;
  truthScore: number;
  verifiedClaims: number;
  accuracy: number;
  reputation: 'novice' | 'trusted' | 'expert' | 'authority';
  badges: string[];
}

const mockVerifications: CommunityVerification[] = [
  {
    id: '1',
    claim: 'Nigeria\'s new digital currency eNaira will replace physical cash by 2026',
    submittedBy: 'TruthSeeker_NG',
    submittedAt: new Date('2025-01-15'),
    category: 'African Economy',
    status: 'voting',
    votes: { total: 1247, trueVotes: 423, falseVotes: 824 },
    aiVerdict: 'false',
    aiConfidence: 78,
    conflictLevel: 'high',
    sources: 8,
    discussionCount: 89,
    tags: ['Nigeria', 'CBDC', 'Economy', 'Future'],
    priority: 'high'
  },
  {
    id: '2',
    claim: 'Kenya\'s geothermal energy will provide 100% renewable electricity by 2030',
    submittedBy: 'ClimateWatcher_KE',
    submittedAt: new Date('2025-01-14'),
    category: 'Environment',
    status: 'ai-analyzing',
    votes: { total: 892, trueVotes: 567, falseVotes: 325 },
    sources: 12,
    discussionCount: 56,
    tags: ['Kenya', 'Renewable Energy', 'Geothermal', '2030'],
    priority: 'medium'
  },
  {
    id: '3',
    claim: 'South Africa\'s unemployment rate dropped below 20% in December 2024',
    submittedBy: 'EconAnalyst_ZA',
    submittedAt: new Date('2025-01-13'),
    category: 'African Economy',
    status: 'completed',
    votes: { total: 2156, trueVotes: 1034, falseVotes: 1122 },
    aiVerdict: 'false',
    aiConfidence: 92,
    conflictLevel: 'low',
    sources: 15,
    discussionCount: 143,
    tags: ['South Africa', 'Unemployment', 'Statistics'],
    userVote: 'false',
    priority: 'high'
  },
  {
    id: '4',
    claim: 'Ghana\'s cocoa production increased by 40% in 2024 due to new farming techniques',
    submittedBy: 'AgriTech_GH',
    submittedAt: new Date('2025-01-12'),
    category: 'Agriculture',
    status: 'conflicted',
    votes: { total: 743, trueVotes: 378, falseVotes: 365 },
    aiVerdict: 'true',
    aiConfidence: 65,
    conflictLevel: 'high',
    sources: 6,
    discussionCount: 91,
    tags: ['Ghana', 'Cocoa', 'Agriculture', 'Innovation'],
    priority: 'medium'
  }
];

const topContributors: TopContributor[] = [
  {
    id: '1',
    username: 'TruthMaster_NG',
    avatar: '🇳🇬',
    truthScore: 2847,
    verifiedClaims: 156,
    accuracy: 94.2,
    reputation: 'authority',
    badges: ['Fact Champion', 'Nigeria Expert', 'Top Verifier']
  },
  {
    id: '2',
    username: 'FactChecker_KE',
    avatar: '🇰🇪',
    truthScore: 2134,
    verifiedClaims: 98,
    accuracy: 91.8,
    reputation: 'expert',
    badges: ['Kenya Specialist', 'Truth Seeker', 'Reliable Source']
  },
  {
    id: '3',
    username: 'Verifier_ZA',
    avatar: '🇿🇦',
    truthScore: 1892,
    verifiedClaims: 87,
    accuracy: 89.5,
    reputation: 'expert',
    badges: ['SA Economy Expert', 'Data Analyst', 'Truth Guardian']
  },
  {
    id: '4',
    username: 'SourceHunter_GH',
    avatar: '🇬🇭',
    truthScore: 1456,
    verifiedClaims: 72,
    accuracy: 87.3,
    reputation: 'trusted',
    badges: ['Ghana Insider', 'Source Validator', 'Rising Star']
  }
];

export default function Community() {
  const [activeTab, setActiveTab] = useState('voting');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userVotes, setUserVotes] = useState<Record<string, 'true' | 'false'>>({});
  const [aiLearningStats, setAiLearningStats] = useState({
    totalCorrections: 1247,
    accuracyImprovement: 12.4,
    communityContributions: 5689,
    conflictsResolved: 89
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAiLearningStats(prev => ({
        ...prev,
        communityContributions: prev.communityContributions + Math.floor(Math.random() * 3),
        conflictsResolved: prev.conflictsResolved + (Math.random() > 0.9 ? 1 : 0)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleVote = (verificationId: string, vote: 'true' | 'false') => {
    setUserVotes(prev => ({ ...prev, [verificationId]: vote }));
    
    toast.success(
      <div className="flex items-center gap-2">
        <Vote className="h-4 w-4 text-primary" />
        <span>Vote cast! Contributing to truth verification 🗳️</span>
      </div>
    );

    // Simulate AI learning from vote
    setTimeout(() => {
      toast.info(
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-secondary" />
          <span>AI is learning from your vote...</span>
        </div>
      );
    }, 1500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'voting':
        return <Vote className="h-4 w-4 text-primary" />;
      case 'ai-analyzing':
        return <Brain className="h-4 w-4 text-secondary animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'conflicted':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'voting':
        return <Badge className="bg-primary/20 text-primary border-primary/30">COMMUNITY VOTING</Badge>;
      case 'ai-analyzing':
        return <Badge className="bg-secondary/20 text-secondary border-secondary/30">AI ANALYZING</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">COMPLETED</Badge>;
      case 'conflicted':
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">CONFLICT DETECTED</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const getConflictAlert = (verification: CommunityVerification) => {
    if (verification.status !== 'conflicted' || verification.conflictLevel === 'none') return null;

    const communityTruePercent = (verification.votes.trueVotes / verification.votes.total) * 100;
    const aiSaysTrue = verification.aiVerdict === 'true';
    const communitySaysTrue = communityTruePercent > 50;

    if (aiSaysTrue !== communitySaysTrue) {
      return (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-500">Truth Conflict Detected</p>
              <p className="text-sm text-muted-foreground">
                AI says <span className="font-medium">{verification.aiVerdict}</span> ({verification.aiConfidence}% confidence), 
                but community leans <span className="font-medium">{communitySaysTrue ? 'true' : 'false'}</span> ({communityTruePercent.toFixed(1)}% voted true)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This helps our AI learn and improve its accuracy
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getReputationBadge = (reputation: string) => {
    const badges = {
      'novice': { color: 'bg-gray-500/20 text-gray-500', label: 'Novice' },
      'trusted': { color: 'bg-blue-500/20 text-blue-500', label: 'Trusted' },
      'expert': { color: 'bg-purple-500/20 text-purple-500', label: 'Expert' },
      'authority': { color: 'bg-yellow-500/20 text-yellow-500', label: 'Authority' }
    };
    
    const badge = badges[reputation as keyof typeof badges] || badges.novice;
    return <Badge className={`${badge.color} border-transparent`}>{badge.label}</Badge>;
  };

  const filteredVerifications = mockVerifications.filter(verification => {
    const matchesSearch = verification.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         verification.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || verification.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || verification.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <Users className="h-7 w-7" />
            Community Truth Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Collective intelligence for truth verification • Vote on claims • Help AI learn • Build credibility
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Vote className="h-4 w-4" />
          Submit for Verification
        </Button>
      </div>

      {/* AI Learning Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">AI Corrections</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{aiLearningStats.totalCorrections.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">From community feedback</p>
        </div>
        
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-4 rounded-lg border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-secondary">Accuracy Gain</span>
          </div>
          <p className="text-2xl font-bold text-foreground">+{aiLearningStats.accuracyImprovement}%</p>
          <p className="text-sm text-muted-foreground">This month</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-500">Contributions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{aiLearningStats.communityContributions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Community verifications</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 rounded-lg border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-orange-500">Conflicts Resolved</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{aiLearningStats.conflictsResolved}</p>
          <p className="text-sm text-muted-foreground">AI vs community</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="voting" className="gap-2">
            <Vote className="h-4 w-4" />
            Truth Voting
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Award className="h-4 w-4" />
            Top Contributors
          </TabsTrigger>
          <TabsTrigger value="ai-learning" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Learning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims, tags, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="African Economy">African Economy</SelectItem>
                <SelectItem value="Environment">Environment</SelectItem>
                <SelectItem value="Agriculture">Agriculture</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Politics">Politics</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="voting">Community Voting</SelectItem>
                <SelectItem value="ai-analyzing">AI Analyzing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="conflicted">Conflicted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Verification Claims */}
          <div className="space-y-4">
            {filteredVerifications.map((verification) => (
              <Card key={verification.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(verification.status)}
                        <Badge variant="outline">{verification.category}</Badge>
                        {verification.priority === 'high' && (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">HIGH PRIORITY</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight">{verification.claim}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {verification.submittedBy}</span>
                        <span>{verification.submittedAt.toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {verification.votes.total} votes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {verification.discussionCount} comments
                        </span>
                        {verification.sources && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {verification.sources} sources
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(verification.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Conflict Alert */}
                  {getConflictAlert(verification)}

                  {/* Voting Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Community Consensus:</span>
                      <span className="text-sm text-muted-foreground">
                        {verification.votes.total} total votes
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          TRUE
                        </span>
                        <span className="font-medium text-green-500">
                          {verification.votes.trueVotes} ({((verification.votes.trueVotes / verification.votes.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={(verification.votes.trueVotes / verification.votes.total) * 100} 
                        className="h-2"
                      />
                      
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          FALSE
                        </span>
                        <span className="font-medium text-red-500">
                          {verification.votes.falseVotes} ({((verification.votes.falseVotes / verification.votes.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={(verification.votes.falseVotes / verification.votes.total) * 100} 
                        className="h-2 [&>div]:bg-red-500"
                      />
                    </div>
                  </div>

                  {/* AI vs Community Comparison */}
                  {verification.aiVerdict && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                          <Brain className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-medium">AI Verdict</span>
                        </div>
                        <div className="text-lg font-bold text-secondary">
                          {verification.aiVerdict.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {verification.aiConfidence}% confidence
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Community</span>
                        </div>
                        <div className="text-lg font-bold text-primary">
                          {verification.votes.trueVotes > verification.votes.falseVotes ? 'TRUE' : 'FALSE'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.max(
                            (verification.votes.trueVotes / verification.votes.total) * 100,
                            (verification.votes.falseVotes / verification.votes.total) * 100
                          ).toFixed(1)}% consensus
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {verification.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {verification.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Voting Interface */}
                  {verification.status === 'voting' && !userVotes[verification.id] && (
                    <div className="flex gap-3 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg">
                      <Button 
                        onClick={() => handleVote(verification.id, 'true')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Cast TRUE
                      </Button>
                      <Button 
                        onClick={() => handleVote(verification.id, 'false')}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Cast FALSE
                      </Button>
                    </div>
                  )}

                  {/* User Vote Confirmation */}
                  {userVotes[verification.id] && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">
                          You voted: <span className="font-bold">{userVotes[verification.id].toUpperCase()}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Join Discussion
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Globe className="h-4 w-4" />
                      View Sources
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid gap-4">
            {topContributors.map((contributor, index) => (
              <Card key={contributor.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-primary">#{index + 1}</div>
                      <div className="text-2xl">{contributor.avatar}</div>
                      <div>
                        <h3 className="font-semibold text-foreground">{contributor.username}</h3>
                        {getReputationBadge(contributor.reputation)}
                      </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-primary">{contributor.truthScore.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Truth Score</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-secondary">{contributor.verifiedClaims}</div>
                        <div className="text-sm text-muted-foreground">Verified</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-500">{contributor.accuracy}%</div>
                        <div className="text-sm text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contributor.badges.map((badge, badgeIndex) => (
                      <Badge key={badgeIndex} variant="outline" className="text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-learning" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-secondary" />
                AI Learning Dashboard
              </CardTitle>
              <CardDescription>
                How community feedback helps our AI become more accurate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Learning Progress</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Overall Accuracy</span>
                      <span className="font-medium">94.2% (+6.8%)</span>
                    </div>
                    <Progress value={94.2} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">African Context Understanding</span>
                      <span className="font-medium">91.5% (+12.4%)</span>
                    </div>
                    <Progress value={91.5} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Source Reliability Assessment</span>
                      <span className="font-medium">96.8% (+8.1%)</span>
                    </div>
                    <Progress value={96.8} className="h-2" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Community Impact</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">1,247</div>
                      <div className="text-sm text-muted-foreground">AI corrections from community votes</div>
                    </div>
                    
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <div className="text-lg font-bold text-secondary">89</div>
                      <div className="text-sm text-muted-foreground">Conflicts resolved this month</div>
                    </div>
                    
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <div className="text-lg font-bold text-green-500">98.3%</div>
                      <div className="text-sm text-muted-foreground">Community-AI agreement rate</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Recent Learning Examples</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Brain className="h-4 w-4 text-secondary mt-1" />
                      <div>
                        <p className="text-sm font-medium">Improved Nigerian Economic Context</p>
                        <p className="text-xs text-muted-foreground">
                          Community corrections helped AI better understand inflation impact on rural communities
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-sm font-medium">Enhanced Source Credibility Scoring</p>
                        <p className="text-xs text-muted-foreground">
                          Community feedback improved AI's assessment of local African news sources
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-green-500 mt-1" />
                      <div>
                        <p className="text-sm font-medium">Regional Nuance Recognition</p>
                        <p className="text-xs text-muted-foreground">
                          Learning to distinguish between similar claims across different African countries
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}