import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Users, Share2, MessageCircle, Heart, Award, TrendingUp, Globe, Flag, Gift, Zap, Plus, Search, Filter, Eye, UserPlus, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLanguage } from '../shared/LanguageContext';
import { toast } from 'sonner@2.0.3';

interface SocialPost {
  id: string;
  author: {
    username: string;
    avatar: string;
    reputation: 'novice' | 'trusted' | 'expert' | 'authority';
    country: string;
    verifiedClaims: number;
  };
  content: string;
  type: 'prediction' | 'verification' | 'news' | 'discussion';
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  isLiked?: boolean;
  marketId?: string;
  truthAccuracy?: number;
}

interface Community {
  id: string;
  name: string;
  nameLocal: string;
  description: string;
  members: number;
  country: string;
  flag: string;
  language: string;
  isJoined: boolean;
  activeVerifications: number;
  recentActivity: string;
}

const mockPosts: SocialPost[] = [
  {
    id: '1',
    author: {
      username: 'TruthSeeker_NG',
      avatar: '🇳🇬',
      reputation: 'expert',
      country: 'Nigeria',
      verifiedClaims: 127
    },
    content: 'Just verified the inflation claim for Nigeria - the Central Bank data shows we\'re heading towards 26% by August. The signs are all there: rising food prices, fuel costs, and currency pressure. What do you think? #NigeriaEconomy #TruthVerification',
    type: 'verification',
    timestamp: new Date('2025-01-20T14:30:00'),
    likes: 42,
    comments: 18,
    shares: 7,
    tags: ['Nigeria', 'Economy', 'Inflation'],
    truthAccuracy: 94.2
  },
  {
    id: '2',
    author: {
      username: 'FactChecker_SN',
      avatar: '🇸🇳',
      reputation: 'trusted',
      country: 'Senegal',
      verifiedClaims: 89
    },
    content: 'Le projet TER Dakar-Diamniadio avance bien ! J\'ai vérifié les dernières données du gouvernement et les travaux sont à 78% d\'achèvement. Très optimiste pour décembre 2025. #SenegalDevelopment #Transport',
    type: 'prediction',
    timestamp: new Date('2025-01-20T12:15:00'),
    likes: 31,
    comments: 12,
    shares: 5,
    tags: ['Senegal', 'Transport', 'Infrastructure'],
    truthAccuracy: 87.8
  },
  {
    id: '3',
    author: {
      username: 'CocaoTracker_CI',
      avatar: '🇨🇮',
      reputation: 'authority',
      country: 'Côte d\'Ivoire',
      verifiedClaims: 203
    },
    content: 'Breaking: Nouvelle estimation de production de cacao pour 2025 - nos sources au Conseil Café-Cacao indiquent 3.1M tonnes possibles malgré El Niño. Restez vigilants sur cette prédiction! #CoteDivoire #Cocoa #Agriculture',
    type: 'news',
    timestamp: new Date('2025-01-20T10:45:00'),
    likes: 89,
    comments: 34,
    shares: 23,
    tags: ['Côte d\'Ivoire', 'Agriculture', 'Cocoa'],
    truthAccuracy: 91.3
  },
  {
    id: '4',
    author: {
      username: 'EnergyWatcher_MA',
      avatar: '🇲🇦',
      reputation: 'expert',
      country: 'Morocco',
      verifiedClaims: 156
    },
    content: 'Morocco\'s renewable energy progress is impressive! Just analyzed the latest MASEN data - we\'re at 42% renewable capacity already. The 52% target by end of 2025 looks very achievable. #Morocco #RenewableEnergy #Solar',
    type: 'verification',
    timestamp: new Date('2025-01-20T09:20:00'),
    likes: 67,
    comments: 21,
    shares: 15,
    tags: ['Morocco', 'Energy', 'Solar'],
    truthAccuracy: 96.1
  },
  {
    id: '5',
    author: {
      username: 'KenyaInsider_KE',
      avatar: '🇰🇪',
      reputation: 'trusted',
      country: 'Kenya',
      verifiedClaims: 94
    },
    content: 'The Central Bank of Kenya\'s new monetary policy is working. Shilling showing strength against USD - my analysis suggests we might see KES 140/USD by March 2025. Community thoughts? #Kenya #Currency #CBK',
    type: 'discussion',
    timestamp: new Date('2025-01-19T16:30:00'),
    likes: 55,
    comments: 29,
    shares: 11,
    tags: ['Kenya', 'Currency', 'Economics'],
    truthAccuracy: 88.7
  }
];

const africanCommunities: Community[] = [
  {
    id: 'nigeria',
    name: 'Nigeria Truth Network',
    nameLocal: 'Nigeria Truth Network',
    description: 'Verifying truth across Nigeria - from Lagos to Abuja to Kano',
    members: 12847,
    country: 'Nigeria',
    flag: '🇳🇬',
    language: 'English',
    isJoined: true,
    activeVerifications: 89,
    recentActivity: '234 verifications today'
  },
  {
    id: 'senegal',
    name: 'Senegal Vérité',
    nameLocal: 'Réseau de Vérité du Sénégal',
    description: 'Vérification de la vérité au Sénégal - de Dakar à Saint-Louis',
    members: 8923,
    country: 'Senegal',
    flag: '🇸🇳',
    language: 'Français',
    isJoined: false,
    activeVerifications: 56,
    recentActivity: '128 vérifications aujourd\'hui'
  },
  {
    id: 'cote-divoire',
    name: 'Côte d\'Ivoire Vérité',
    nameLocal: 'Réseau de Vérité de Côte d\'Ivoire',
    description: 'Vérification communautaire en Côte d\'Ivoire - d\'Abidjan à Bouaké',
    members: 7456,
    country: 'Côte d\'Ivoire',
    flag: '🇨🇮',
    language: 'Français',
    isJoined: true,
    activeVerifications: 43,
    recentActivity: '97 vérifications aujourd\'hui'
  },
  {
    id: 'kenya',
    name: 'Kenya Truth Hub',
    nameLocal: 'Kenya Truth Hub',
    description: 'Truth verification across Kenya - from Nairobi to Mombasa',
    members: 9834,
    country: 'Kenya',
    flag: '🇰🇪',
    language: 'English/Swahili',
    isJoined: false,
    activeVerifications: 67,
    recentActivity: '156 verifications today'
  },
  {
    id: 'south-africa',
    name: 'South Africa Truth Coalition',
    nameLocal: 'South Africa Truth Coalition',
    description: 'Fighting misinformation across the Rainbow Nation',
    members: 11290,
    country: 'South Africa',
    flag: '🇿🇦',
    language: 'English/Afrikaans',
    isJoined: true,
    activeVerifications: 78,
    recentActivity: '203 verifications today'
  },
  {
    id: 'morocco',
    name: 'Morocco Truth Network',
    nameLocal: 'شبكة الحقيقة المغربية',
    description: 'Vérification de vérité au Maroc - du Casablanca à Marrakech',
    members: 6789,
    country: 'Morocco',
    flag: '🇲🇦',
    language: 'Français/العربية',
    isJoined: false,
    activeVerifications: 34,
    recentActivity: '89 vérifications aujourd\'hui'
  }
];

export default function Social() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('feed');
  const [newPost, setNewPost] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(
    new Set(africanCommunities.filter(c => c.isJoined).map(c => c.id))
  );

  const getReputationBadge = (reputation: string) => {
    const badges = {
      'novice': { color: 'bg-gray-500/20 text-gray-500', label: 'Novice', icon: '🌱' },
      'trusted': { color: 'bg-blue-500/20 text-blue-500', label: 'Trusted', icon: '🛡️' },
      'expert': { color: 'bg-purple-500/20 text-purple-500', label: 'Expert', icon: '⭐' },
      'authority': { color: 'bg-yellow-500/20 text-yellow-500', label: 'Authority', icon: '👑' }
    };
    
    const badge = badges[reputation as keyof typeof badges] || badges.novice;
    return (
      <Badge className={`${badge.color} border-transparent gap-1`}>
        <span>{badge.icon}</span>
        {badge.label}
      </Badge>
    );
  };

  const getPostTypeIcon = (type: string) => {
    const icons = {
      'prediction': <TrendingUp className="h-4 w-4 text-secondary" />,
      'verification': <Zap className="h-4 w-4 text-primary" />,
      'news': <Globe className="h-4 w-4 text-green-500" />,
      'discussion': <MessageCircle className="h-4 w-4 text-yellow-500" />
    };
    return icons[type as keyof typeof icons];
  };

  const handleLike = (postId: string) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
      toast.success('Like removed');
    } else {
      newLiked.add(postId);
      toast.success('Post liked! ❤️');
    }
    setLikedPosts(newLiked);
  };

  const handleJoinCommunity = (communityId: string) => {
    const newJoined = new Set(joinedCommunities);
    const community = africanCommunities.find(c => c.id === communityId);
    
    if (newJoined.has(communityId)) {
      newJoined.delete(communityId);
      toast.success(`Left ${community?.name}`);
    } else {
      newJoined.add(communityId);
      toast.success(`Joined ${community?.name}! 🎉`);
    }
    setJoinedCommunities(newJoined);
  };

  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    
    toast.success('Post shared with the community! 📢');
    setNewPost('');
  };

  const filteredPosts = mockPosts.filter(post => {
    const matchesSearch = searchQuery === '' || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesFilter = selectedFilter === 'all' || post.type === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <Users className="h-7 w-7" />
            African Truth Community
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect with truth seekers across Africa • Share insights • Combat misinformation together
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2 bg-secondary hover:bg-secondary/90">
            <UserPlus className="h-4 w-4" />
            Invite Friends
          </Button>
          <Button variant="outline" className="gap-2">
            <Gift className="h-4 w-4" />
            Refer & Earn
          </Button>
        </div>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Total Members</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{africanCommunities.reduce((sum, c) => sum + c.members, 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Across {africanCommunities.length} countries</p>
        </div>
        
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-4 rounded-lg border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-secondary">Active Verifications</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{africanCommunities.reduce((sum, c) => sum + c.activeVerifications, 0)}</p>
          <p className="text-sm text-muted-foreground">Happening right now</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-500">Languages</span>
          </div>
          <p className="text-2xl font-bold text-foreground">7+</p>
          <p className="text-sm text-muted-foreground">Supported across Africa</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4 rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-yellow-500">Truth Score</span>
          </div>
          <p className="text-2xl font-bold text-foreground">92.4%</p>
          <p className="text-sm text-muted-foreground">Community accuracy</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Community Feed
          </TabsTrigger>
          <TabsTrigger value="communities" className="gap-2">
            <Flag className="h-4 w-4" />
            African Communities
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Award className="h-4 w-4" />
            Truth Leaders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          {/* Create Post */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Share with Community
              </CardTitle>
              <CardDescription>
                Share your truth verification insights, predictions, or start a discussion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What truth have you discovered today? Share your verification insights, market predictions, or community thoughts..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Prediction
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Verification
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Discussion
                  </Badge>
                </div>
                <Button onClick={handleCreatePost} disabled={!newPost.trim()}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Post
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feed Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts, users, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="verification">Verifications</SelectItem>
                <SelectItem value="prediction">Predictions</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="discussion">Discussions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feed Posts */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Post Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {post.author.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{post.author.username}</span>
                            {getReputationBadge(post.author.reputation)}
                            <span className="text-xs text-muted-foreground">{post.author.country}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTimeAgo(post.timestamp)}</span>
                            <span>•</span>
                            <span>{post.author.verifiedClaims} verifications</span>
                            {post.truthAccuracy && (
                              <>
                                <span>•</span>
                                <span className="text-primary">{post.truthAccuracy}% accuracy</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getPostTypeIcon(post.type)}
                        <Badge variant="outline" className="capitalize">
                          {post.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      <p className="text-foreground leading-relaxed">{post.content}</p>
                      
                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Post Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className={`gap-2 ${likedPosts.has(post.id) ? 'text-red-500' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                          {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          {post.comments}
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                          <Share2 className="h-4 w-4" />
                          {post.shares}
                        </Button>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Thread
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communities" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {africanCommunities.map((community) => (
              <Card key={community.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{community.flag}</div>
                      <div>
                        <CardTitle className="text-lg">{community.name}</CardTitle>
                        <CardDescription className="text-xs">{community.nameLocal}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={joinedCommunities.has(community.id) ? 'default' : 'outline'}>
                      {joinedCommunities.has(community.id) ? 'Joined' : 'Join'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{community.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-foreground">{community.members.toLocaleString()}</div>
                      <div className="text-muted-foreground">Members</div>
                    </div>
                    <div>
                      <div className="font-semibold text-primary">{community.activeVerifications}</div>
                      <div className="text-muted-foreground">Active</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{community.language}</span>
                    </div>
                    <div className="text-xs text-green-500">{community.recentActivity}</div>
                  </div>
                  
                  <Button
                    onClick={() => handleJoinCommunity(community.id)}
                    className="w-full"
                    variant={joinedCommunities.has(community.id) ? 'outline' : 'default'}
                  >
                    {joinedCommunities.has(community.id) ? (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Leave Community
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join Community
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid gap-4">
            {mockPosts
              .map(post => post.author)
              .filter((author, index, self) => 
                index === self.findIndex(a => a.username === author.username)
              )
              .sort((a, b) => b.verifiedClaims - a.verifiedClaims)
              .map((author, index) => (
              <Card key={author.username} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-primary">#{index + 1}</div>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {author.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{author.username}</h3>
                        <div className="flex items-center gap-2">
                          {getReputationBadge(author.reputation)}
                          <Badge variant="outline" className="text-xs">{author.country}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-primary">{author.verifiedClaims}</div>
                        <div className="text-sm text-muted-foreground">Verifications</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-secondary">
                          {(85 + Math.random() * 15).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Accuracy</div>
                      </div>
                      <div className="hidden md:block">
                        <div className="text-xl font-bold text-green-500">
                          {Math.floor(author.verifiedClaims * 23.4)}
                        </div>
                        <div className="text-sm text-muted-foreground">Truth Score</div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Star className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}