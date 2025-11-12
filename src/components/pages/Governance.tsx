import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Vote, Users, FileText, Clock, Calendar, MessageSquare, Globe, Award } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useLanguage } from '../shared/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { mockProposals, governanceStats } from '../../utils/governanceData';
import { getStatusBadge, getImpactBadge, getTypeIcon, getTimeRemaining, getVotingProgress } from '../../utils/governanceHelpers';

export default function Governance() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('proposals');
  const [userVotes, setUserVotes] = useState<Record<string, 'for' | 'against' | 'abstain'>>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'passed' | 'failed'>('all');

  const handleVote = (proposalId: string, vote: 'for' | 'against' | 'abstain') => {
    setUserVotes(prev => ({ ...prev, [proposalId]: vote }));
    
    const voteLabels = {
      'for': 'voted in favor! ✅',
      'against': 'voted against ❌',
      'abstain': 'abstained from voting 🤝'
    };
    
    toast.success(`You ${voteLabels[vote]} Your voice matters in governance!`);
  };

  const filteredProposals = mockProposals.filter(proposal => {
    if (selectedFilter === 'all') return true;
    return proposal.status === selectedFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <Vote className="h-7 w-7" />
            Blockcast Governance
          </h1>
          <p className="text-sm text-muted-foreground">
            Shape the future of truth verification in Africa • Vote on proposals • Create positive change
          </p>
        </div>
        <Button className="gap-2 bg-secondary hover:bg-secondary/90">
          <FileText className="h-4 w-4" />
          Submit Proposal
        </Button>
      </div>

      {/* Governance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Total Proposals</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{governanceStats.totalProposals}</p>
          <p className="text-sm text-muted-foreground">{governanceStats.activeProposals} currently active</p>
        </div>
        
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-4 rounded-lg border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-secondary">Active Voters</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{governanceStats.totalVoters.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{governanceStats.participationRate}% participation rate</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Vote className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-500">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{governanceStats.successRate}%</p>
          <p className="text-sm text-muted-foreground">Proposals passed</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4 rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-yellow-500">Avg. Voting Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{governanceStats.avgVotingTime}</p>
          <p className="text-sm text-muted-foreground">Days to reach threshold</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposals" className="gap-2">
            <Vote className="h-4 w-4" />
            Active Proposals
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            Voting History
          </TabsTrigger>
          <TabsTrigger value="delegation" className="gap-2">
            <Award className="h-4 w-4" />
            Delegation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-6">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'passed', 'failed'] as const).map((filter) => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
                className="capitalize"
              >
                {filter === 'all' ? 'All Proposals' : filter}
              </Button>
            ))}
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {filteredProposals.map((proposal) => {
              const { progressPercent } = getVotingProgress(proposal);
              const userVote = userVotes[proposal.id];
              
              return (
                <Card key={proposal.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(proposal.status)}
                          {getImpactBadge(proposal.impact)}
                          <Badge variant="outline" className="gap-1 capitalize">
                            {getTypeIcon(proposal.type)}
                            {proposal.type}
                          </Badge>
                        </div>
                        
                        <CardTitle className="text-lg leading-tight">{proposal.title}</CardTitle>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-xs">{proposal.author.country.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            {proposal.author.username}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {new Date(proposal.createdAt).toLocaleDateString()}
                          </span>
                          {proposal.status === 'active' && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Clock className="h-3 w-3" />
                              {getTimeRemaining(proposal.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed">{proposal.description}</p>

                    {/* Tags */}
                    {proposal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {proposal.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Voting Progress */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Voting Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {proposal.votes.total.toLocaleString()} / {proposal.threshold.toLocaleString()} votes
                        </span>
                      </div>
                      
                      <Progress value={progressPercent} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-500">{proposal.votes.for.toLocaleString()}</div>
                          <div className="text-muted-foreground">For ({((proposal.votes.for / proposal.votes.total) * 100).toFixed(1)}%)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-red-500">{proposal.votes.against.toLocaleString()}</div>
                          <div className="text-muted-foreground">Against ({((proposal.votes.against / proposal.votes.total) * 100).toFixed(1)}%)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-500">{proposal.votes.abstain.toLocaleString()}</div>
                          <div className="text-muted-foreground">Abstain ({((proposal.votes.abstain / proposal.votes.total) * 100).toFixed(1)}%)</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Voting Actions */}
                    {proposal.status === 'active' && !userVote && (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleVote(proposal.id, 'for')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          Vote For
                        </Button>
                        <Button
                          onClick={() => handleVote(proposal.id, 'against')}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        >
                          Vote Against
                        </Button>
                        <Button
                          onClick={() => handleVote(proposal.id, 'abstain')}
                          variant="outline"
                          className="flex-1"
                        >
                          Abstain
                        </Button>
                      </div>
                    )}

                    {/* User Vote Confirmation */}
                    {userVote && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Vote className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary">
                            You voted: <span className="font-bold uppercase">{userVote}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Discussion (12)
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Your Voting History</CardTitle>
              <CardDescription>
                Track your participation in Blockcast governance decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No Voting History</h3>
                <p className="text-muted-foreground">
                  Start participating in governance by voting on active proposals above.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegation" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Vote Delegation</CardTitle>
              <CardDescription>
                Delegate your voting power to trusted community members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">Delegation Coming Soon</h3>
                <p className="text-muted-foreground">
                  Vote delegation features will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}