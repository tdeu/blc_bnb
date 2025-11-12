import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  Plus, 
  Eye, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3
} from 'lucide-react';
import { userDataService, UserCreatedMarket } from '../../utils/userDataService';

interface UserCreatedMarketsProps {
  walletAddress: string;
  onCreateNewMarket?: () => void;
  onViewMarket?: (marketId: string) => void;
}

export const UserCreatedMarkets: React.FC<UserCreatedMarketsProps> = ({ 
  walletAddress, 
  onCreateNewMarket,
  onViewMarket 
}) => {
  const [markets, setMarkets] = useState<UserCreatedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadUserMarkets();
  }, [walletAddress]);

  const loadUserMarkets = async () => {
    try {
      setLoading(true);
      const userMarkets = await userDataService.getUserCreatedMarkets(walletAddress);
      setMarkets(userMarkets);
    } catch (error) {
      console.error('Error loading user markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'resolving':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">RESOLVED</Badge>;
      case 'resolving':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">RESOLVING</Badge>;
      case 'active':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">ACTIVE</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const getResolutionBadge = (resolution: string | null) => {
    if (!resolution) return null;
    
    return resolution === 'yes' ? 
      <Badge className="bg-primary/20 text-primary border-primary/30">RESOLVED: TRUE</Badge> :
      <Badge className="bg-secondary/20 text-secondary border-secondary/30">RESOLVED: FALSE</Badge>;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  const formatExpiresIn = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Expiring soon';
  };

  const filteredMarkets = markets.filter(market => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return market.status === 'active';
    if (activeTab === 'resolved') return market.status === 'resolved';
    return true;
  });

  const stats = {
    total: markets.length,
    active: markets.filter(m => m.status === 'active').length,
    resolved: markets.filter(m => m.status === 'resolved').length,
    resolving: markets.filter(m => m.status === 'resolving').length
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading your markets...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Your Created Markets
          </h2>
          <p className="text-sm text-muted-foreground">
            Track the truth verification markets you've created
          </p>
        </div>
        {onCreateNewMarket && (
          <Button onClick={onCreateNewMarket} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Market
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Created</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.resolving}</div>
            <div className="text-xs text-muted-foreground">Resolving</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Markets List */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Your Markets</CardTitle>
          <CardDescription>
            Markets you've submitted and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({stats.resolved})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredMarkets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">
                    {activeTab === 'all' ? 'No Markets Created' : `No ${activeTab} Markets`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'all' ? 
                      "You haven't created any truth verification markets yet." :
                      `You don't have any ${activeTab} markets right now.`
                    }
                  </p>
                  {onCreateNewMarket && (
                    <Button onClick={onCreateNewMarket} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Market
                    </Button>
                  )}
                </div>
              ) : (
                filteredMarkets.map((market) => (
                  <Card key={market.id} className="border-border/50 bg-muted/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(market.status)}
                            {getResolutionBadge(market.resolution)}
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Created {formatTimeAgo(market.createdAt)}
                            </Badge>
                            <Badge variant="outline">
                              {market.category}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold text-foreground leading-tight">
                            {market.claim}
                          </h3>
                          
                          {market.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {market.description}
                            </p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <div className="font-semibold text-foreground capitalize">{market.status}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expires:</span>
                              <div className="font-semibold text-foreground">{formatExpiresIn(market.expiresAt)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Region:</span>
                              <div className="font-semibold text-foreground">{market.country}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confidence:</span>
                              <div className="font-semibold text-foreground">{market.confidenceLevel}</div>
                            </div>
                          </div>

                          {market.volume !== undefined && (
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Volume:</span>
                                <span className="font-semibold">{market.volume.toFixed(2)} HBAR</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Participants:</span>
                                <span className="font-semibold">{market.participants || 0}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {onViewMarket && (
                            <Button 
                              onClick={() => onViewMarket(market.id)} 
                              variant="outline" 
                              size="sm" 
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserCreatedMarkets;