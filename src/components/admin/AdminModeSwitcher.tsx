import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Shield, User, ChevronRight, Settings } from 'lucide-react';
import { adminService } from '../../utils/adminService';

interface AdminModeSwitcherProps {
  walletAddress: string;
  currentMode: 'user' | 'admin';
  onModeChange: (mode: 'user' | 'admin') => void;
}

const AdminModeSwitcher: React.FC<AdminModeSwitcherProps> = ({
  walletAddress,
  currentMode,
  onModeChange
}) => {
  const adminRole = adminService.getAdminRole(walletAddress);
  
  // Don't show if user is not an admin
  if (adminRole === 'user') {
    return null;
  }

  const roleDisplayName = adminRole === 'super_admin' ? 'Super Admin' : 'Admin';

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {roleDisplayName} Access
              </span>
            </div>
            <Badge variant={currentMode === 'admin' ? 'default' : 'secondary'}>
              {currentMode === 'admin' ? 'Admin Mode' : 'User Mode'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={currentMode === 'user' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('user')}
              className="flex items-center space-x-1"
            >
              <User className="h-4 w-4" />
              <span>User</span>
            </Button>
            
            <ChevronRight className="h-4 w-4 text-gray-400" />
            
            <Button
              variant={currentMode === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('admin')}
              className="flex items-center space-x-1"
            >
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Button>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          {currentMode === 'admin' ? (
            <span>🔐 You're in admin mode - you can manage markets, users, and platform settings</span>
          ) : (
            <span>👤 You're browsing as a regular user - switch to admin mode to access management features</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminModeSwitcher;