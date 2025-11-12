// Hedera HCS imports removed - using localStorage only for BSC implementation
// TODO: Reimplement with BSC-compatible storage solution if needed

// HCS service is no longer available - using localStorage fallback
let hcsService: any = null;

export interface UserProfile {
  walletAddress: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string; // IPFS hash or URL
  preferences: {
    language: 'en' | 'fr' | 'sw';
    currency: 'HBAR' | 'USD' | 'EUR';
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  stats: {
    marketsCreated: number;
    totalBetsPlaced: number;
    correctPredictions: number;
    totalWinnings: number;
    reputationScore: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface UserProfileUpdate {
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

class UserProfileService {
  private profileCache = new Map<string, UserProfile>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Create a new user profile
   */
  async createProfile(walletAddress: string, initialData: Partial<UserProfileUpdate> = {}): Promise<UserProfile> {
    const profile: UserProfile = {
      walletAddress: walletAddress.toLowerCase(),
      username: initialData.username || '',
      displayName: initialData.displayName || '',
      bio: initialData.bio || '',
      avatar: initialData.avatar || '',
      preferences: {
        language: 'en',
        currency: 'HBAR',
        notifications: true,
        theme: 'system',
        ...initialData.preferences
      },
      stats: {
        marketsCreated: 0,
        totalBetsPlaced: 0,
        correctPredictions: 0,
        totalWinnings: 0,
        reputationScore: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Submit to HCS
    await this.submitProfileToHCS(profile, 'create');
    
    // Update cache
    this.profileCache.set(walletAddress.toLowerCase(), profile);
    this.cacheTimestamps.set(walletAddress.toLowerCase(), Date.now());

    return profile;
  }

  /**
   * Update an existing user profile
   */
  async updateProfile(walletAddress: string, updates: UserProfileUpdate): Promise<UserProfile> {
    const existingProfile = await this.getProfile(walletAddress);
    
    if (!existingProfile) {
      throw new Error('Profile not found. Create profile first.');
    }

    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
      preferences: {
        ...existingProfile.preferences,
        ...updates.preferences
      },
      updatedAt: Date.now()
    };

    // Submit to HCS
    await this.submitProfileToHCS(updatedProfile, 'update');
    
    // Update cache
    this.profileCache.set(walletAddress.toLowerCase(), updatedProfile);
    this.cacheTimestamps.set(walletAddress.toLowerCase(), Date.now());

    return updatedProfile;
  }

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<UserProfile | null> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Check cache first
    if (this.isCacheValid(normalizedAddress)) {
      return this.profileCache.get(normalizedAddress) || null;
    }

    // Fetch from HCS
    try {
      const profile = await this.fetchProfileFromHCS(normalizedAddress);
      
      if (profile) {
        this.profileCache.set(normalizedAddress, profile);
        this.cacheTimestamps.set(normalizedAddress, Date.now());
      }
      
      return profile;
    } catch (error) {
      console.error('Error fetching profile from HCS:', error);
      return null;
    }
  }

  /**
   * Update user statistics (called after placing bets, creating markets, etc.)
   */
  async updateStats(walletAddress: string, statUpdates: Partial<UserProfile['stats']>): Promise<void> {
    const profile = await this.getProfile(walletAddress);
    
    if (!profile) {
      console.warn('Cannot update stats: profile not found for', walletAddress);
      return;
    }

    const updatedStats = {
      ...profile.stats,
      ...statUpdates
    };

    await this.updateProfile(walletAddress, { 
      // Keep other profile data unchanged, just update stats
    });

    // Update the profile with new stats
    profile.stats = updatedStats;
    profile.updatedAt = Date.now();
    
    await this.submitProfileToHCS(profile, 'stats_update');
    
    // Update cache
    this.profileCache.set(walletAddress.toLowerCase(), profile);
    this.cacheTimestamps.set(walletAddress.toLowerCase(), Date.now());
  }

  /**
   * Check if profile exists for wallet address
   */
  async profileExists(walletAddress: string): Promise<boolean> {
    const profile = await this.getProfile(walletAddress);
    return profile !== null;
  }

  /**
   * Delete user profile (for GDPR compliance)
   */
  async deleteProfile(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Submit deletion record to HCS
    const deletionRecord = {
      type: 'profile_deletion',
      walletAddress: normalizedAddress,
      deletedAt: Date.now(),
      reason: 'user_requested'
    };

    await hcsService.submitMessage('user_profiles', deletionRecord);
    
    // Clear from cache
    this.profileCache.delete(normalizedAddress);
    this.cacheTimestamps.delete(normalizedAddress);
  }

  /**
   * Get profile summary for display (minimal data)
   */
  async getProfileSummary(walletAddress: string): Promise<{ 
    displayName: string; 
    username: string; 
    reputationScore: number; 
    avatar?: string 
  } | null> {
    const profile = await this.getProfile(walletAddress);
    
    if (!profile) return null;
    
    return {
      displayName: profile.displayName || profile.username || `User ${walletAddress.slice(-6)}`,
      username: profile.username,
      reputationScore: profile.stats.reputationScore,
      avatar: profile.avatar
    };
  }

  /**
   * Submit profile data to HCS
   */
  private async submitProfileToHCS(profile: UserProfile, action: 'create' | 'update' | 'stats_update'): Promise<void> {
    const hcsMessage = {
      type: 'user_profile',
      action,
      walletAddress: profile.walletAddress,
      data: profile,
      timestamp: Date.now()
    };

    try {
      if (hcsService) {
        await hcsService.submitMessage('user_profiles', hcsMessage);
      }
    } catch (error) {
      console.warn('Failed to submit to HCS, using localStorage fallback:', error);
    }

    // Always store in localStorage as fallback
    const localStorageKey = `blockcast_profile_${profile.walletAddress}`;
    localStorage.setItem(localStorageKey, JSON.stringify(profile));
  }

  /**
   * Fetch profile from HCS (this would need to query HCS messages)
   */
  private async fetchProfileFromHCS(walletAddress: string): Promise<UserProfile | null> {
    try {
      // In a real implementation, this would query HCS messages for this wallet address
      // For now, we'll implement a basic version that falls back to localStorage if HCS fails
      
      // Try to get from localStorage as fallback
      const localStorageKey = `blockcast_profile_${walletAddress}`;
      const localProfile = localStorage.getItem(localStorageKey);
      
      if (localProfile) {
        return JSON.parse(localProfile);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching profile from HCS:', error);
      
      // Fallback to localStorage
      const localStorageKey = `blockcast_profile_${walletAddress}`;
      const localProfile = localStorage.getItem(localStorageKey);
      
      if (localProfile) {
        return JSON.parse(localProfile);
      }
      
      return null;
    }
  }

  /**
   * Check if cached profile is still valid
   */
  private isCacheValid(walletAddress: string): boolean {
    const cachedProfile = this.profileCache.get(walletAddress);
    const cacheTime = this.cacheTimestamps.get(walletAddress);
    
    if (!cachedProfile || !cacheTime) {
      return false;
    }
    
    return Date.now() - cacheTime < this.CACHE_DURATION;
  }

  /**
   * Clear cache (useful for testing or force refresh)
   */
  clearCache(): void {
    this.profileCache.clear();
    this.cacheTimestamps.clear();
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();