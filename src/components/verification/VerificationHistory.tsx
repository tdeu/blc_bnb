import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle, XCircle, AlertCircle, Search, Filter, Calendar } from 'lucide-react';
import type { VerificationResult } from './VerificationResults';

interface VerificationHistoryProps {
  verificationHistory: VerificationResult[];
  onSelectVerification?: (result: VerificationResult) => void;
}

export default function VerificationHistory({ verificationHistory = [], onSelectVerification }: VerificationHistoryProps) {
  // Use the correct prop name and provide default value
  const history = verificationHistory;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'true':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'false':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'mixed':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    const colors = {
      true: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      false: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      mixed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      unverified: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[verdict as keyof typeof colors] || colors.unverified;
  };

  // Filter and sort history
  const filteredAndSortedHistory = history
    .filter(item => {
      const matchesSearch = item.claim.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterVerdict === 'all' || item.verdict === filterVerdict;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });

  const getStats = () => {
    const total = history.length;
    const trueCount = history.filter(h => h.verdict === 'true').length;
    const falseCount = history.filter(h => h.verdict === 'false').length;
    const mixedCount = history.filter(h => h.verdict === 'mixed').length;
    
    return { total, trueCount, falseCount, mixedCount };
  };

  const stats = getStats();

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Verifications Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start verifying claims to see your history here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.trueCount}</div>
            <p className="text-xs text-muted-foreground">True Claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.falseCount}</div>
            <p className="text-xs text-muted-foreground">False Claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.mixedCount}</div>
            <p className="text-xs text-muted-foreground">Mixed/Partial</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterVerdict} onValueChange={setFilterVerdict}>
              <SelectTrigger className="w-full md:w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="confidence">By Confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-4">
        {filteredAndSortedHistory.map((result) => (
          <Card key={result.id} className={`${onSelectVerification ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}>
            <CardContent 
              className="pt-6" 
              onClick={() => onSelectVerification && onSelectVerification(result)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm flex-1 line-clamp-2">{result.claim}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getVerdictIcon(result.verdict)}
                    <Badge className={getVerdictBadge(result.verdict)}>
                      {result.verdict.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{result.timestamp.toLocaleDateString()} at {result.timestamp.toLocaleTimeString()}</span>
                  <span>{result.confidence}% confidence</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedHistory.length === 0 && history.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No results match your search criteria</p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => {
              setSearchTerm('');
              setFilterVerdict('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}