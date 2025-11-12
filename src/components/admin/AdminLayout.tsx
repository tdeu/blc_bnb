import React from 'react';
import { Shield, BarChart3, Users, FileCheck, Brain, Wallet, Coins } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userProfile?: {
    walletAddress: string;
    displayName?: string;
  };
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  userProfile 
}) => {
  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'markets', label: 'Market Approval', icon: FileCheck },
    { id: 'evidence', label: 'Evidence & Resolution', icon: Brain },
    { id: 'treasury', label: 'Treasury', icon: Wallet },
    { id: 'tokens', label: 'Token Management', icon: Coins },
    { id: 'users', label: 'User Management', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                BlockCast Admin
              </h1>
              <Badge variant="destructive" className="ml-2">
                ADMIN MODE
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {userProfile && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">
                    {userProfile.displayName || `Admin ${userProfile.walletAddress.slice(-6)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation Menu */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  className="flex-shrink-0 flex items-center space-x-2"
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;