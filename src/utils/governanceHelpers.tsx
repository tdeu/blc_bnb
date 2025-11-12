import { Badge } from '../components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, Zap, Gavel } from 'lucide-react';
import { Proposal } from './governanceData';

export const getStatusBadge = (status: string) => {
  const badges = {
    'active': { color: 'bg-yellow-500/20 text-yellow-500', icon: <Clock className="h-3 w-3" />, label: 'Active Voting' },
    'passed': { color: 'bg-green-500/20 text-green-500', icon: <CheckCircle className="h-3 w-3" />, label: 'Passed' },
    'failed': { color: 'bg-red-500/20 text-red-500', icon: <XCircle className="h-3 w-3" />, label: 'Failed' },
    'pending': { color: 'bg-blue-500/20 text-blue-500', icon: <AlertTriangle className="h-3 w-3" />, label: 'Pending' }
  };
  
  const badge = badges[status as keyof typeof badges];
  return (
    <Badge className={`${badge.color} border-transparent gap-1`}>
      {badge.icon}
      {badge.label}
    </Badge>
  );
};

export const getImpactBadge = (impact: string) => {
  const colors = {
    'low': 'bg-gray-500/20 text-gray-500',
    'medium': 'bg-orange-500/20 text-orange-500',
    'high': 'bg-red-500/20 text-red-500'
  };
  
  return (
    <Badge className={`${colors[impact as keyof typeof colors]} border-transparent`}>
      {impact.toUpperCase()} Impact
    </Badge>
  );
};

export const getTypeIcon = (type: string) => {
  const icons = {
    'improvement': <TrendingUp className="h-4 w-4 text-primary" />,
    'policy': <Gavel className="h-4 w-4 text-secondary" />,
    'technical': <Zap className="h-4 w-4 text-yellow-500" />,
    'community': <Users className="h-4 w-4 text-green-500" />
  };
  return icons[type as keyof typeof icons];
};

export const getTimeRemaining = (deadline: Date) => {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} days left`;
  if (hours > 0) return `${hours} hours left`;
  return 'Voting ends soon';
};

export const getVotingProgress = (proposal: Proposal) => {
  const { votes, threshold } = proposal;
  const totalVotes = votes.total;
  const progressPercent = (totalVotes / threshold) * 100;
  const supportPercent = totalVotes > 0 ? (votes.for / totalVotes) * 100 : 0;
  
  return { progressPercent: Math.min(progressPercent, 100), supportPercent };
};