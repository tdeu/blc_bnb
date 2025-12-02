import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, TrendingUp, Activity, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'sonner';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export default function UsersDashboard() {
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    setLoading(true);

    try {
      if (!supabase) {
        toast.error('Database not configured');
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total users count
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (users who have placed bets or created markets)
      const { data: activeBettors } = await supabase
        .from('market_predictions')
        .select('user_address')
        .gte('created_at', weekAgo.toISOString());

      const { data: activeCreators } = await supabase
        .from('approved_markets')
        .select('creator_address')
        .gte('created_at', weekAgo.toISOString());

      const activeWallets = new Set([
        ...(activeBettors?.map(b => b.user_address) || []),
        ...(activeCreators?.map(m => m.creator_address) || [])
      ]);

      // Get new users counts
      const { count: newToday } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: newThisWeek } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: newThisMonth } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeWallets.size,
        newUsersToday: newToday || 0,
        newUsersThisWeek: newThisWeek || 0,
        newUsersThisMonth: newThisMonth || 0
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadUserStats();
    toast.success('User stats refreshed!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-500" />
            User Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Platform user statistics and growth metrics
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Users */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All registered users
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users (7d)</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeUsers.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Users who placed bets/created markets
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Users Today */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Today</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.newUsersToday.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered in last 24h
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Growth
          </CardTitle>
          <CardDescription>
            New user registrations over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-xl font-bold text-blue-600">{stats.newUsersThisWeek} new users</p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Last 7 days
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-purple-600">{stats.newUsersThisMonth} new users</p>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                Last 30 days
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
