import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Settings as SettingsIcon, User, Globe, Palette, Database, Languages, Moon, Sun, Wallet, History, BarChart3, Bell, Shield, Lock, Smartphone, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useLanguage } from '../shared/LanguageContext';
import { toast } from 'sonner';
import BettingPortfolio, { UserBet } from '../betting/BettingPortfolio';
import VerificationHistory, { VerificationResult } from '../verification/VerificationHistory';
import UserCreatedMarkets from '../betting/UserCreatedMarkets';
import CreatorRewards from '../rewards/CreatorRewards';
import { useUser } from '../../contexts/UserContext';
import { userDataService } from '../../utils/userDataService';
import { Textarea } from '../ui/textarea';

interface SettingsProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  userBalance?: number;
  castBalance?: number;
  walletConnected?: boolean;
  userBets?: UserBet[];
  verificationHistory?: VerificationResult[];
  onSelectVerification?: (result: VerificationResult) => void;
  onCreateMarket?: () => void;
}

export default function Settings({ isDarkMode, onToggleDarkMode, userBalance = 0, castBalance = 0, walletConnected = false, userBets = [], verificationHistory = [], onSelectVerification, onCreateMarket }: SettingsProps) {
  const { language, setLanguage, t } = useLanguage();
  const { profile, updateUserProfile, loading } = useUser();
  
  // Get initial tab from URL parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['portfolio', 'markets', 'history', 'rewards', 'preferences', 'notifications', 'privacy', 'data'].includes(tabParam)) {
      return tabParam;
    }
    return 'portfolio';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [realUserBets, setRealUserBets] = useState<UserBet[]>([]);
  const [notifications, setNotifications] = useState({
    soundEnabled: true,
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: false
  });

  // Load real user data when profile loads
  useEffect(() => {
    if (profile) {
      loadUserBets();
    }
  }, [profile]);

  // Listen for URL parameter changes to update active tab
  useEffect(() => {
    const handleUrlChange = () => {
      const newTab = getInitialTab();
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    };
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [activeTab]);

  const loadUserBets = async () => {
    if (!profile?.walletAddress) return;
    
    try {
      const bettingHistory = await userDataService.getUserBettingHistory(profile.walletAddress);
      const convertedBets = userDataService.convertToUserBets(bettingHistory);
      setRealUserBets(convertedBets);
    } catch (error) {
      console.error('Error loading user bets:', error);
    }
  };

  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇬🇧', native: 'English' },
    { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français' },
    { code: 'sw', name: 'Swahili', flag: '🇰🇪', native: 'Kiswahili' },
  ];

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as any);
    toast.success(`Language changed to ${languageOptions.find(l => l.code === newLanguage)?.native}`);
  };


  const handleExportData = () => {
    toast.success('Data export started! You will receive an email when ready.');
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion requires email confirmation. Check your inbox.');
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
    toast.success(`${key} ${value ? 'enabled' : 'disabled'}`);
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage your account, preferences, and privacy settings
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // Update URL to reflect the current tab
        const url = new URL(window.location);
        url.searchParams.set('tab', value);
        window.history.replaceState({}, '', url);
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="portfolio" className="gap-2">
            <Wallet className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="markets" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            My Markets
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Trophy className="h-4 w-4" />
            Rewards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-6">
          <BettingPortfolio 
            userBalance={userBalance} 
            userBets={realUserBets.length > 0 ? realUserBets : userBets} 
          />
        </TabsContent>

        <TabsContent value="markets" className="space-y-6">
          {profile?.walletAddress && (
            <UserCreatedMarkets
              walletAddress={profile.walletAddress}
              onCreateNewMarket={onCreateMarket}
              onViewMarket={(marketId) => {
                // Navigate to market details
                console.log('View market:', marketId);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <VerificationHistory 
            verificationHistory={verificationHistory} 
            onSelectVerification={onSelectVerification}
          />
        </TabsContent>


        <TabsContent value="preferences" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your Blockcast experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Language & Region</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Interface Language</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="mr-2">{lang.flag}</span>
                            {lang.native}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Currency Display</Label>
                    <Select defaultValue="usd">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="ngn">Nigerian Naira (₦)</SelectItem>
                        <SelectItem value="kes">Kenyan Shilling (KSh)</SelectItem>
                        <SelectItem value="zar">South African Rand (R)</SelectItem>
                        <SelectItem value="ghs">Ghanaian Cedi (₵)</SelectItem>
                        <SelectItem value="xof">CFA Franc (CFA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Theme Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Appearance</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark theme for better night viewing</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleDarkMode}
                    className="gap-2"
                  >
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {isDarkMode ? 'Dark' : 'Light'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Show more content in less space</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">Play sounds for interactions</p>
                  </div>
                  <Switch 
                    checked={notifications.soundEnabled}
                    onCheckedChange={(checked) => handleNotificationChange('soundEnabled', checked)}
                  />
                </div>
              </div>

              <Separator />

              {/* Mobile Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Mobile Experience</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-rotate</Label>
                    <p className="text-sm text-muted-foreground">Automatically rotate content on mobile</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Haptic Feedback</Label>
                    <p className="text-sm text-muted-foreground">Vibrate on interactions (mobile only)</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Email Notifications</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Market Resolution Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when your truth casts resolve</p>
                    </div>
                    <Switch 
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) => handleNotificationChange('emailAlerts', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Performance Reports</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of your truth casting activity</p>
                    </div>
                    <Switch 
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => handleNotificationChange('weeklyReports', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Push Notifications</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Real-time alerts in your browser</p>
                  </div>
                  <Switch 
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Visibility */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Profile Visibility</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Public Profile</Label>
                      <p className="text-sm text-muted-foreground">Allow others to view your truth casting statistics</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Betting History</Label>
                      <p className="text-sm text-muted-foreground">Display your resolved truth casts publicly</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Sharing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Data Sharing</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Analytics</Label>
                      <p className="text-sm text-muted-foreground">Share anonymous usage data to improve Blockcast</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Performance Metrics</Label>
                      <p className="text-sm text-muted-foreground">Allow aggregated performance data for research</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Wallet Privacy */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Wallet Privacy</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Hide Wallet Address</Label>
                    <p className="text-sm text-muted-foreground">Don't display your full wallet address publicly</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Creator Rewards
              </CardTitle>
              <CardDescription>
                Earn CAST tokens by creating successful prediction markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current Balance */}
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-primary">Your CAST Balance</h3>
                      <p className="text-sm text-muted-foreground">Available rewards tokens</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {castBalance || 0} CAST
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <div className="space-y-4">
                  <h4 className="font-semibold">How Creator Rewards Work</h4>
                  <div className="grid gap-4">
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h5 className="font-medium">Create a Market</h5>
                        <p className="text-sm text-muted-foreground">Submit a prediction market for approval</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h5 className="font-medium">Get Approved</h5>
                        <p className="text-sm text-muted-foreground">Market gets reviewed and approved by admins</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h5 className="font-medium">Earn 100 CAST</h5>
                        <p className="text-sm text-muted-foreground">Receive 100 CAST tokens when market resolves</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <p className="text-sm text-muted-foreground">Markets Created</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">0</div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export, backup, or delete your account data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Export */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Data Export</h4>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your Blockcast data including verification history, posts, and settings.
                </p>
                
                <Button onClick={handleExportData} className="w-full" variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </div>

              <Separator />

              {/* Storage Usage */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Storage Usage</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Verification History</span>
                    <span className="text-sm font-medium">2.4 MB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Community Posts</span>
                    <span className="text-sm font-medium">856 KB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Truth Market Data</span>
                    <span className="text-sm font-medium">1.2 MB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache & Temporary</span>
                    <span className="text-sm font-medium">432 KB</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Usage</span>
                    <span>4.9 MB</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  Clear Cache & Temporary Data
                </Button>
              </div>

              <Separator />

              {/* Account Deletion */}
              <div className="space-y-4">
                <h4 className="font-semibold text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  These actions are permanent and cannot be undone.
                </p>
                
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h5 className="font-semibold text-destructive mb-2">Delete Account</h5>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be reversed.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    className="w-full"
                  >
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}