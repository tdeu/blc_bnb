export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'improvement' | 'policy' | 'technical' | 'community';
  author: {
    username: string;
    reputation: string;
    country: string;
  };
  status: 'active' | 'passed' | 'failed' | 'pending';
  votes: {
    for: number;
    against: number;
    abstain: number;
    total: number;
  };
  threshold: number;
  deadline: Date;
  createdAt: Date;
  impact: 'low' | 'medium' | 'high';
  tags: string[];
  userVote?: 'for' | 'against' | 'abstain';
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  participationRate: number;
  successRate: number;
  avgVotingTime: number;
}

export const mockProposals: Proposal[] = [
  {
    id: 'prop-1',
    title: 'Expand Truth Verification to French-Speaking African Countries',
    description: 'Proposal to add comprehensive French language support and establish verification networks in Senegal, Côte d\'Ivoire, Mali, and Burkina Faso. This includes hiring native French speakers as moderators and creating country-specific fact-checking partnerships.',
    type: 'improvement',
    author: {
      username: 'AfricanUnity_SN',
      reputation: 'expert',
      country: 'Senegal'
    },
    status: 'active',
    votes: {
      for: 12847,
      against: 2341,
      abstain: 892,
      total: 16080
    },
    threshold: 15000,
    deadline: new Date('2025-02-15'),
    createdAt: new Date('2025-01-10'),
    impact: 'high',
    tags: ['Expansion', 'French', 'West Africa', 'Localization']
  },
  {
    id: 'prop-2',
    title: 'Implement AI Confidence Threshold for Auto-Resolution',
    description: 'Establish a minimum AI confidence threshold of 95% for automatic truth market resolution. Markets below this threshold would require community validation before resolution. This aims to improve accuracy and reduce disputes.',
    type: 'technical',
    author: {
      username: 'TechLead_KE',
      reputation: 'authority',
      country: 'Kenya'
    },
    status: 'active',
    votes: {
      for: 8934,
      against: 4567,
      abstain: 1234,
      total: 14735
    },
    threshold: 12000,
    deadline: new Date('2025-02-20'),
    createdAt: new Date('2025-01-15'),
    impact: 'medium',
    tags: ['AI', 'Technical', 'Accuracy', 'Resolution']
  },
  {
    id: 'prop-3',
    title: 'Create African Language Incentive Program',
    description: 'Establish a reward system for contributors who provide high-quality translations and verifications in indigenous African languages including Swahili, Hausa, Yoruba, Amharic, and Wolof. 10% of platform fees would fund this program.',
    type: 'community',
    author: {
      username: 'LinguistExpert_NG',
      reputation: 'trusted',
      country: 'Nigeria'
    },
    status: 'passed',
    votes: {
      for: 18923,
      against: 3456,
      abstain: 1876,
      total: 24255
    },
    threshold: 18000,
    deadline: new Date('2025-01-25'),
    createdAt: new Date('2025-01-01'),
    impact: 'high',
    tags: ['Languages', 'Incentives', 'Community', 'Diversity']
  },
  {
    id: 'prop-4',
    title: 'Establish Truth Verification Standards for News Sources',
    description: 'Create a comprehensive framework for evaluating and ranking news sources across Africa. Sources would be rated based on accuracy, bias, fact-checking record, and editorial standards. This affects how AI weights different sources.',
    type: 'policy',
    author: {
      username: 'MediaWatcher_ZA',
      reputation: 'expert',
      country: 'South Africa'
    },
    status: 'active',
    votes: {
      for: 7823,
      against: 5432,
      abstain: 2345,
      total: 15600
    },
    threshold: 14000,
    deadline: new Date('2025-02-28'),
    createdAt: new Date('2025-01-20'),
    impact: 'high',
    tags: ['Media', 'Standards', 'Sources', 'Quality']
  },
  {
    id: 'prop-5',
    title: 'Reduce Minimum Stake for Truth Markets',
    description: 'Lower the minimum stake for creating truth markets from 0.1 ETH to 0.05 ETH to encourage more participation from users with limited funds. This would make the platform more accessible to users across Africa.',
    type: 'improvement',
    author: {
      username: 'AccessAdvocate_GH',
      reputation: 'trusted',
      country: 'Ghana'
    },
    status: 'failed',
    votes: {
      for: 9876,
      against: 14523,
      abstain: 1789,
      total: 26188
    },
    threshold: 20000,
    deadline: new Date('2025-01-30'),
    createdAt: new Date('2025-01-05'),
    impact: 'medium',
    tags: ['Accessibility', 'Staking', 'Participation', 'Economics']
  }
];

export const governanceStats: GovernanceStats = {
  totalProposals: 47,
  activeProposals: 12,
  totalVoters: 28493,
  participationRate: 67.8,
  successRate: 72.3,
  avgVotingTime: 6.4
};