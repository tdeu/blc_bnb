export interface MarketComment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  comment: string;
  timestamp: Date;
  likes: number;
  position?: 'yes' | 'no';
  isVerified?: boolean;
}

export interface MarketRule {
  id: string;
  title: string;
  description: string;
  category: 'resolution' | 'eligibility' | 'timing' | 'verification';
}

// Mock comments data for markets
export const generateMockComments = (marketId: string): MarketComment[] => {
  const comments: MarketComment[] = [
    {
      id: 'comment-1',
      userId: 'user-1',
      username: 'TruthSeeker_NG',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      comment: 'Based on my analysis of Nollywood production trends, I believe they can easily surpass 2,500 films. The industry has been growing exponentially with digital platforms.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      likes: 12,
      position: 'yes',
      isVerified: true
    },
    {
      id: 'comment-2',
      userId: 'user-2',
      username: 'AfricaFirst_KE',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b212?w=40&h=40&fit=crop&crop=face',
      comment: 'I love the African focus of this platform! Finally a place where we can verify news that affects our continent directly. 🌍',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      likes: 8,
      isVerified: false
    },
    {
      id: 'comment-3',
      userId: 'user-3',
      username: 'DataAnalyst_GH',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      comment: 'Looking at the data from the Nigerian Film Corporation, production has been increasing by 15% annually. However, economic challenges might impact this.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      likes: 15,
      position: 'no'
    },
    {
      id: 'comment-4',
      userId: 'user-4',
      username: 'CinemaLover_ZA',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
      comment: 'The streaming boom is definitely helping African cinema. Netflix and other platforms are investing heavily in local content.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      likes: 6,
      position: 'yes'
    },
    {
      id: 'comment-5',
      userId: 'user-5',
      username: 'FilmProducer_NG',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      comment: 'As someone in the industry, I can say that while we\'re producing more, quality control and funding remain challenges. 2,500 might be ambitious.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      likes: 18,
      position: 'no',
      isVerified: true
    }
  ];

  return comments;
};

// Market rules templates
export const getMarketRules = (marketId: string): MarketRule[] => {
  const baseRules: MarketRule[] = [
    {
      id: 'resolution-1',
      title: 'Resolution Authority',
      description: 'This market will be resolved based on official data from the Nigerian Film Corporation or recognized industry bodies. Multiple sources will be cross-referenced for accuracy.',
      category: 'resolution'
    },
    {
      id: 'resolution-2',
      title: 'Resolution Timeline',
      description: 'Market will be resolved within 30 days after the end of 2025, allowing time for official statistics compilation and verification.',
      category: 'resolution'
    },
    {
      id: 'verification-1',
      title: 'AI Verification Process',
      description: 'Our AI system continuously monitors news sources, official statements, and industry reports. Community votes and expert analysis contribute to the final determination.',
      category: 'verification'
    },
    {
      id: 'verification-2',
      title: 'Source Credibility',
      description: 'Only verified and reputable sources will be considered for market resolution. This includes government bodies, international organizations, and established media outlets.',
      category: 'verification'
    },
    {
      id: 'eligibility-1',
      title: 'Geographic Scope',
      description: 'This market specifically covers Nigerian film production. Co-productions with other countries count if Nigeria is the primary production base.',
      category: 'eligibility'
    },
    {
      id: 'eligibility-2',
      title: 'Film Definition',
      description: 'Includes feature films, documentaries, and made-for-TV movies. Short films under 40 minutes and web series episodes are excluded from the count.',
      category: 'eligibility'
    },
    {
      id: 'timing-1',
      title: 'Market Duration',
      description: 'This market remains active until December 31, 2025, 11:59 PM WAT. No new positions can be taken after this time.',
      category: 'timing'
    },
    {
      id: 'timing-2',
      title: 'Position Changes',
      description: 'Users can modify or close their positions at any time before market expiration, subject to current odds and liquidity.',
      category: 'timing'
    }
  ];

  return baseRules;
};

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};