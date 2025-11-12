import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { User, Settings, BarChart3, Trophy, Edit, Save, X } from 'lucide-react';
import { userProfileService, UserProfile, UserProfileUpdate } from '../../utils/userProfileService';

interface UserProfileProps {
  walletAddress: string;
  onClose?: () => void;
}

export const UserProfileComponent: React.FC<UserProfileProps> = ({ walletAddress, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<UserProfileUpdate>({});

  useEffect(() => {
    loadProfile();
  }, [walletAddress]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      let userProfile = await userProfileService.getProfile(walletAddress);
      
      // Create profile if it doesn't exist
      if (!userProfile) {
        userProfile = await userProfileService.createProfile(walletAddress);
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!profile) return;
    
    setEditForm({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      preferences: { ...profile.preferences }
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!profile || !editForm) return;

    try {
      setSaving(true);
      const updatedProfile = await userProfileService.updateProfile(walletAddress, editForm);
      setProfile(updatedProfile);
      setEditing(false);
      setEditForm({});
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({});
  };

  const updateEditForm = (field: keyof UserProfileUpdate, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePreferences = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading profile...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p>Failed to load profile.</p>
            <Button onClick={loadProfile} className="mt-4">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            {!editing && (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={editing ? editForm.avatar : profile.avatar} />
                  <AvatarFallback>
                    {(editing ? editForm.displayName : profile.displayName)?.charAt(0)?.toUpperCase() || 
                     (editing ? editForm.username : profile.username)?.charAt(0)?.toUpperCase() || 
                     'U'}
                  </AvatarFallback>
                </Avatar>
                {editing && (
                  <Input
                    placeholder="Avatar URL"
                    value={editForm.avatar || ''}
                    onChange={(e) => updateEditForm('avatar', e.target.value)}
                    className="w-48"
                  />
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  {editing ? (
                    <Input
                      id="displayName"
                      value={editForm.displayName || ''}
                      onChange={(e) => updateEditForm('displayName', e.target.value)}
                      placeholder="Your display name"
                    />
                  ) : (
                    <p className="text-lg font-medium">
                      {profile.displayName || profile.username || 'Anonymous User'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  {editing ? (
                    <Input
                      id="username"
                      value={editForm.username || ''}
                      onChange={(e) => updateEditForm('username', e.target.value)}
                      placeholder="@username"
                    />
                  ) : (
                    <p className="text-gray-600">
                      {profile.username ? `@${profile.username}` : 'No username set'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="walletAddress">Wallet Address</Label>
                  <p className="font-mono text-sm text-gray-500 bg-gray-100 p-2 rounded">
                    {walletAddress}
                  </p>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  {editing ? (
                    <Textarea
                      id="bio"
                      value={editForm.bio || ''}
                      onChange={(e) => updateEditForm('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-600">
                      {profile.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              <div>
                <Label>Language</Label>
                {editing ? (
                  <Select
                    value={editForm.preferences?.language || profile.preferences.language}
                    onValueChange={(value: 'en' | 'fr' | 'sw') => updatePreferences('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="sw">Kiswahili</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{
                    profile.preferences.language === 'en' ? 'English' :
                    profile.preferences.language === 'fr' ? 'Français' :
                    'Kiswahili'
                  }</p>
                )}
              </div>

              <div>
                <Label>Preferred Currency</Label>
                {editing ? (
                  <Select
                    value={editForm.preferences?.currency || profile.preferences.currency}
                    onValueChange={(value: 'HBAR' | 'USD' | 'EUR') => updatePreferences('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HBAR">HBAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{profile.preferences.currency}</p>
                )}
              </div>

              <div>
                <Label>Theme</Label>
                {editing ? (
                  <Select
                    value={editForm.preferences?.theme || profile.preferences.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => updatePreferences('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="capitalize">{profile.preferences.theme}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label>Notifications</Label>
                {editing ? (
                  <Switch
                    checked={editForm.preferences?.notifications ?? profile.preferences.notifications}
                    onCheckedChange={(checked) => updatePreferences('notifications', checked)}
                  />
                ) : (
                  <Badge variant={profile.preferences.notifications ? 'default' : 'secondary'}>
                    {profile.preferences.notifications ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{profile.stats.marketsCreated}</div>
                  <div className="text-xs text-gray-500">Markets Created</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{profile.stats.totalBetsPlaced}</div>
                  <div className="text-xs text-gray-500">Bets Placed</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{profile.stats.correctPredictions}</div>
                  <div className="text-xs text-gray-500">Correct Predictions</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{profile.stats.totalWinnings.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total Winnings (HBAR)</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{profile.stats.reputationScore}</div>
                  <div className="text-xs text-gray-500">Reputation Score</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Profile Created</h3>
              <p className="text-gray-600">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Last Updated</h3>
              <p className="text-gray-600">
                {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UserProfileComponent;