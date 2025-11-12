import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import AdminLayout from './AdminLayout';
import AdminOverview from './AdminDashboard';
import MarketApproval from './MarketApproval';
import EvidenceResolutionPanel from './EvidenceResolutionPanel';
import TreasuryDashboard from './TreasuryDashboard';
import { adminService } from '../../utils/adminService';
import { useUser } from '../../contexts/UserContext';
import { toast } from 'sonner';

interface AdminProps {
  walletConnection?: {
    address: string;
    isConnected: boolean;
  } | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Admin: React.FC<AdminProps> = ({
  walletConnection,
  activeTab: propActiveTab = 'overview',
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(propActiveTab);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { profile } = useUser();

  useEffect(() => {
    verifyAdminAccess();
  }, [walletConnection?.address, walletConnection?.isConnected]);

  useEffect(() => {
    setActiveTab(propActiveTab);
  }, [propActiveTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const verifyAdminAccess = () => {
    setIsVerifyingAdmin(true);
    
    // Check if wallet is connected
    if (!walletConnection?.isConnected || !walletConnection?.address) {
      setIsAuthorized(false);
      setIsVerifyingAdmin(false);
      return;
    }

    // Check if wallet address is authorized as admin
    const isAdmin = adminService.isAdmin(walletConnection.address);
    const isSuperAdmin = adminService.isSuperAdmin(walletConnection.address);
    
    if (isAdmin || isSuperAdmin) {
      setIsAuthorized(true);
      toast.success(`Welcome, ${isSuperAdmin ? 'Super Admin' : 'Admin'}!`);
    } else {
      setIsAuthorized(false);
      toast.error('Access denied: Admin privileges required');
    }
    
    setIsVerifyingAdmin(false);
  };

  // Loading state while verifying admin access
  if (isVerifyingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">Verifying Access</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Checking admin privileges...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not connected to wallet
  if (!walletConnection?.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please connect your admin wallet to access the admin panel.
            </p>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authorized (wallet connected but not admin)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Your wallet address is not authorized to access the admin panel.
            </p>
            <p className="text-sm text-gray-500 mb-4 font-mono">
              {walletConnection.address?.slice(0, 10)}...{walletConnection.address?.slice(-8)}
            </p>
            <div className="space-y-2">
              <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
                Return to Home
              </Button>
              <p className="text-xs text-gray-500">
                Contact the super admin if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin authorized - show admin panel
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AdminOverview 
            userProfile={{
              walletAddress: walletConnection.address,
              displayName: profile?.displayName
            }}
          />
        );
      
      case 'markets':
        return (
          <MarketApproval
            userProfile={{
              walletAddress: walletConnection.address,
              displayName: profile?.displayName
            }}
          />
        );

      case 'evidence':
        return (
          <EvidenceResolutionPanel
            userProfile={{
              walletAddress: walletConnection.address,
              displayName: profile?.displayName
            }}
          />
        );

      case 'treasury':
        return (
          <TreasuryDashboard
            isAdmin={true}
          />
        );

      case 'tokens':
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Token Management</h3>
              <p className="text-gray-600 dark:text-gray-400">CAST token minting and management tools coming soon...</p>
            </CardContent>
          </Card>
        );

      case 'users':
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">User Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Coming soon...</p>
            </CardContent>
          </Card>
        );

      default:
        return <AdminOverview userProfile={{ walletAddress: walletConnection.address }} />;
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      userProfile={{
        walletAddress: walletConnection.address,
        displayName: profile?.displayName
      }}
    >
      {renderContent()}
    </AdminLayout>
  );
};

export default Admin;