import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userProfileService, UserProfile } from '../utils/userProfileService';
import { userDataService } from '../utils/userDataService';
import { WalletConnection } from '../utils/walletService';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  loadUserProfile: (walletAddress: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  incrementStats: (statType: keyof UserProfile['stats'], amount?: number) => Promise<void>;
  clearProfile: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
  walletConnection: WalletConnection | null;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children, walletConnection }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Load profile when wallet is connected
  useEffect(() => {
    if (walletConnection?.address && walletConnection.isConnected) {
      console.log('🔄 Wallet connected, loading user profile for:', walletConnection.address);
      loadUserProfile(walletConnection.address);
    } else if (!walletConnection?.isConnected) {
      console.log('🔌 Wallet disconnected, clearing profile');
      clearProfile();
    }
  }, [walletConnection?.address, walletConnection?.isConnected]);

  const loadUserProfile = async (walletAddress: string) => {
    try {
      setLoading(true);
      console.log('📋 Loading profile for wallet:', walletAddress);
      
      let userProfile = await userProfileService.getProfile(walletAddress);
      
      // Create profile if it doesn't exist
      if (!userProfile) {
        console.log('👤 Profile not found, creating new profile');
        // Get real stats from userDataService
        const realStats = await userDataService.getUserStats(walletAddress);
        userProfile = await userProfileService.createProfile(walletAddress, {
          displayName: `User ${walletAddress.slice(-6)}`,
          preferences: {
            language: 'en',
            currency: 'CAST',
            notifications: true,
            theme: 'system'
          }
        });
        // Update with real stats
        userProfile.stats = realStats;
        console.log('✅ New profile created');
      } else {
        // Update stats with real data
        console.log('🔄 Updating profile with real stats');
        const realStats = await userDataService.getUserStats(walletAddress);
        userProfile.stats = realStats;
        console.log('✅ Profile loaded successfully');
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!profile || !walletConnection?.address) return;

    try {
      console.log('🔄 Updating user profile');
      const updatedProfile = await userProfileService.updateProfile(walletConnection.address, updates);
      setProfile(updatedProfile);
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  };

  const incrementStats = async (statType: keyof UserProfile['stats'], amount: number = 1) => {
    if (!profile || !walletConnection?.address) return;

    try {
      const currentValue = profile.stats[statType] as number;
      const newValue = currentValue + amount;
      
      const statUpdates = { [statType]: newValue };
      
      await userProfileService.updateStats(walletConnection.address, statUpdates);
      
      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          [statType]: newValue
        },
        updatedAt: Date.now()
      } : null);
      
      console.log(`✅ Stats updated: ${statType} = ${newValue}`);
    } catch (error) {
      console.error('❌ Error updating stats:', error);
    }
  };

  const clearProfile = () => {
    setProfile(null);
    setLoading(false);
  };

  const contextValue: UserContextType = {
    profile,
    loading,
    loadUserProfile,
    updateUserProfile,
    incrementStats,
    clearProfile
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider;