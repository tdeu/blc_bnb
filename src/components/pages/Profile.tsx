import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Edit, Save, X, Wallet, TrendingUp, Target, Activity } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { userDataService } from '../../utils/userDataService';
import { toast } from 'sonner@2.0.3';
import { Textarea } from '../ui/textarea';

interface ProfileProps {
  userBalance?: number;
}

export default function Profile({ userBalance = 0 }: ProfileProps) {
  const { profile, updateUserProfile, loading } = useUser();
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userStats, setUserStats] = useState({
    marketsCreated: 0,
    totalBetsPlaced: 0,
    correctPredictions: 0,
    totalWinnings: 0,
    reputationScore: 0
  });
  
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    avatar: ''
  });

  // Load user stats and profile data
  useEffect(() => {
    if (profile && !editingProfile) {
      setProfileForm({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatar: profile.avatar || ''
      });
      loadUserStats();
    }
  }, [profile, editingProfile]);

  const loadUserStats = async () => {
    if (!profile?.walletAddress) return;
    
    try {
      const stats = await userDataService.getUserStats(profile.walletAddress);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      await updateUserProfile({
        displayName: profileForm.displayName,
        username: profileForm.username,
        bio: profileForm.bio,
        avatar: profileForm.avatar
      });
      setEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);
    // Reset form to current profile values
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatar: profile.avatar || ''
      });
    }
  };

  const updateProfileForm = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.displayName?.charAt(0)?.toUpperCase() || 
                   profile?.username?.charAt(0)?.toUpperCase() || 
                   'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileForm.displayName}
                        onChange={(e) => updateProfileForm('displayName', e.target.value)}
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => updateProfileForm('username', e.target.value)}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => updateProfileForm('bio', e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-foreground">
                      {profile?.displayName || profile?.username || 'Anonymous User'}
                    </h1>
                    {profile?.username && profile?.displayName !== profile?.username && (
                      <p className="text-muted-foreground">@{profile.username}</p>
                    )}
                    <p className="text-muted-foreground">
                      {profile?.bio || 'Truth verifier and prediction market participant'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Truth Verifier</Badge>
                      <Badge variant="secondary">Reputation: {userStats.reputationScore}</Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {editingProfile ? (
                <>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    onClick={handleCancelEdit} 
                    variant="outline"
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setEditingProfile(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{userBalance.toFixed(3)} HBAR</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-secondary">Markets Created</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{userStats.marketsCreated}</p>
            <p className="text-sm text-muted-foreground">Truth markets</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-500">Predictions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{userStats.correctPredictions}/{userStats.totalBetsPlaced}</p>
            <p className="text-sm text-muted-foreground">
              {userStats.totalBetsPlaced > 0 ? `${((userStats.correctPredictions / userStats.totalBetsPlaced) * 100).toFixed(1)}% accuracy` : 'No predictions yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Total Winnings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{userStats.totalWinnings.toFixed(3)} HBAR</p>
            <p className="text-sm text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Information */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Information
          </CardTitle>
          <CardDescription>Your connected wallet details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Wallet Address</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <code className="text-sm font-mono">
                {profile?.walletAddress || 'Not connected'}
              </code>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div>
              <Label className="text-sm text-muted-foreground">Member Since</Label>
              <p className="font-medium">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Last Active</Label>
              <p className="font-medium">
                {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Today'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Account Status</Label>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}