import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import {
  Clock,
  Brain,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { supabase, ApprovedMarket, MarketEvidence } from '../../utils/supabase';
import { evidenceService } from '../../services/evidenceService';

interface PendingMarket extends ApprovedMarket {
  evidence_count?: number;
}

export default function PendingResolutionManager() {
  const [pendingMarkets, setPendingMarkets] = useState<PendingMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [marketEvidences, setMarketEvidences] = useState<MarketEvidence[]>([]);
  const [isLoadingEvidences, setIsLoadingEvidences] = useState(false);
  const [isResolvingMarket, setIsResolvingMarket] = useState<string | null>(null);

  // Load pending markets
  const loadPendingMarkets = async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        toast.error('Supabase not configured');
        return;
      }

      const { data, error } = await supabase
        .from('approved_markets')
        .select('*')
        .eq('status', 'evidence_collection')
        .order('evidence_period_end', { ascending: true });

      if (error) {
        console.error('Error loading pending markets:', error);
        toast.error('Failed to load pending markets');
        return;
      }

      // Get evidence counts for each market
      const marketsWithCounts: PendingMarket[] = [];
      for (const market of data || []) {
        const count = await evidenceService.getEvidenceCount(market.id);
        marketsWithCounts.push({ ...market, evidence_count: count });
      }

      setPendingMarkets(marketsWithCounts);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingMarkets();
    // Refresh every 5 minutes
    const interval = setInterval(loadPendingMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load evidences for a specific market
  const loadMarketEvidences = async (marketId: string) => {
    setIsLoadingEvidences(true);
    setSelectedMarket(marketId);

    const result = await evidenceService.getMarketEvidences(marketId);
    if (result.success && result.evidences) {
      setMarketEvidences(result.evidences);
    } else {
      setMarketEvidences([]);
      toast.error(result.error || 'Failed to load evidences');
    }

    setIsLoadingEvidences(false);
  };

  // Check if 48h period has ended
  const isPeriodEnded = (endDate: string | undefined) => {
    if (!endDate) return false;
    return new Date(endDate) <= new Date();
  };

  // Calculate time remaining
  const getTimeRemaining = (endDate: string | undefined) => {
    if (!endDate) return 'Unknown';
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Period ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  // Re-run AI resolution with evidences
  const handleRerunAIResolution = async (market: PendingMarket) => {
    if (!isPeriodEnded(market.evidence_period_end)) {
      toast.error('Evidence collection period has not ended yet');
      return;
    }

    setIsResolvingMarket(market.id);

    try {
      // Compile evidence summary
      const evidenceSummary = await evidenceService.compileEvidenceSummary(market.id);

      console.log('🤖 Re-running AI resolution with evidences...');
      console.log('📋 Evidence Summary:', evidenceSummary);

      // Call the re-run endpoint
      const response = await fetch('/api/resolve-with-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: market.id,
          claim: market.claim,
          description: market.description,
          contractAddress: market.contract_address,
          evidenceSummary
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve market');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Market resolved: ${result.outcome.toUpperCase()} (${result.confidence}% confidence)`);
        // Reload markets
        await loadPendingMarkets();
      } else {
        toast.error(result.error || 'Resolution failed');
      }
    } catch (error) {
      console.error('Resolution error:', error);
      toast.error('Failed to re-run AI resolution');
    } finally {
      setIsResolvingMarket(null);
    }
  };

  // Manual resolution by admin (YES or NO)
  const handleManualResolution = async (market: PendingMarket, outcome: 'yes' | 'no') => {
    if (!isPeriodEnded(market.evidence_period_end)) {
      toast.error('Evidence collection period has not ended yet');
      return;
    }

    if (!market.contract_address) {
      toast.error('No contract address found for this market');
      return;
    }

    const confirmMessage = `Are you sure you want to resolve this market as ${outcome.toUpperCase()}?\n\nThis will trigger automatic payouts to all winners.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsResolvingMarket(market.id);

    try {
      console.log(`🔧 Admin manually resolving market as ${outcome.toUpperCase()}`);

      // Import resolution service
      const { resolutionService } = await import('../../utils/resolutionService');

      // Call blockchain resolution with 100% confidence (admin decision)
      const result = await resolutionService.resolveMarketWithAI(
        market.id,
        outcome,
        100 // Admin decision = 100% confidence
      );

      toast.success(`Market resolved as ${outcome.toUpperCase()}! Payouts triggered.`);
      console.log('✅ Resolution TX:', result.transactionId);

      // Update market status in database
      if (supabase) {
        await supabase
          .from('approved_markets')
          .update({
            status: 'resolved',
            resolution_data: {
              ...market.resolution_data,
              final_outcome: outcome,
              resolved_by: 'admin',
              admin_resolution_note: `Admin manually resolved after reviewing ${market.evidence_count || 0} evidences`,
              resolved_at: new Date().toISOString()
            }
          })
          .eq('id', market.id);
      }

      // Reload markets
      await loadPendingMarkets();
    } catch (error) {
      console.error('Manual resolution error:', error);
      toast.error('Failed to resolve market on blockchain');
    } finally {
      setIsResolvingMarket(null);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAIOpinions = (resolutionData: any) => {
    if (!resolutionData) return null;

    const opinions = [];

    if (resolutionData.perplexity_result) {
      opinions.push({
        name: 'Perplexity',
        outcome: resolutionData.perplexity_result.outcome,
        confidence: resolutionData.perplexity_result.confidence,
        reasoning: resolutionData.perplexity_result.reasoning
      });
    }

    if (resolutionData.gemini_result) {
      opinions.push({
        name: 'Gemini',
        outcome: resolutionData.gemini_result.outcome,
        confidence: resolutionData.gemini_result.confidence,
        reasoning: resolutionData.gemini_result.reasoning
      });
    }

    return opinions;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Pending Resolution - Evidence Collection
              </CardTitle>
              <CardDescription>
                Markets with low AI confidence requiring evidence review before resolution
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadPendingMarkets} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading pending markets...</span>
            </div>
          ) : pendingMarkets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-medium">No markets pending resolution</p>
              <p className="text-sm">All markets have been resolved automatically</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingMarkets.map((market) => (
                <Card key={market.id} className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Market Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{market.claim}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{market.description}</p>
                        </div>
                        <Badge className="bg-yellow-500 text-white">
                          Evidence Collection
                        </Badge>
                      </div>

                      {/* Time and Evidence Stats */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Time Remaining</div>
                          <div className={`font-medium ${isPeriodEnded(market.evidence_period_end) ? 'text-red-500' : 'text-orange-500'}`}>
                            {getTimeRemaining(market.evidence_period_end)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Evidences Submitted</div>
                          <div className="font-medium">{market.evidence_count || 0} files</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Period Ends</div>
                          <div className="font-medium">{formatDate(market.evidence_period_end)}</div>
                        </div>
                      </div>

                      {/* AI Opinions */}
                      {market.resolution_data && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Original AI Analysis:</div>
                          <div className="grid grid-cols-2 gap-3">
                            {getAIOpinions(market.resolution_data)?.map((opinion) => (
                              <div key={opinion.name} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{opinion.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {opinion.confidence}%
                                  </Badge>
                                </div>
                                <Badge className={opinion.outcome === 'yes' ? 'bg-green-500' : 'bg-red-500'}>
                                  {opinion.outcome?.toUpperCase()}
                                </Badge>
                                {opinion.reasoning && (
                                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                                    {opinion.reasoning}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadMarketEvidences(market.id)}
                          disabled={isLoadingEvidences && selectedMarket === market.id}
                        >
                          {isLoadingEvidences && selectedMarket === market.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4 mr-2" />
                          )}
                          View Evidences ({market.evidence_count})
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleRerunAIResolution(market)}
                          disabled={
                            !isPeriodEnded(market.evidence_period_end) ||
                            isResolvingMarket === market.id
                          }
                          className={isPeriodEnded(market.evidence_period_end) ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          {isResolvingMarket === market.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Brain className="h-4 w-4 mr-2" />
                          )}
                          {isPeriodEnded(market.evidence_period_end)
                            ? 'Re-run AI with Evidence'
                            : 'Wait for period to end'}
                        </Button>
                      </div>

                      {/* Manual Resolution Buttons - Only show when period ended */}
                      {isPeriodEnded(market.evidence_period_end) && (
                        <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border">
                          <div className="text-sm font-medium mb-2">Manual Admin Resolution:</div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleManualResolution(market, 'yes')}
                              disabled={isResolvingMarket === market.id}
                              className="bg-green-600 hover:bg-green-700 flex-1"
                            >
                              {isResolvingMarket === market.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Resolve as YES
                            </Button>

                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleManualResolution(market, 'no')}
                              disabled={isResolvingMarket === market.id}
                              className="bg-red-600 hover:bg-red-700 flex-1"
                            >
                              {isResolvingMarket === market.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 mr-2" />
                              )}
                              Resolve as NO
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Review evidences above, then click to resolve. This will trigger automatic payouts.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Viewer */}
      {selectedMarket && marketEvidences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submitted Evidences ({marketEvidences.length})
            </CardTitle>
            <CardDescription>
              Review user-submitted evidence for market resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {marketEvidences.map((evidence) => (
                <div key={evidence.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{evidence.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {evidence.evidence_type.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge variant="outline">{formatDate(evidence.created_at)}</Badge>
                  </div>

                  {evidence.description && (
                    <p className="text-sm">{evidence.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Submitted by: {evidence.user_address.slice(0, 8)}...{evidence.user_address.slice(-6)}</span>
                    {evidence.file_size && (
                      <span>• Size: {(evidence.file_size / 1024).toFixed(1)} KB</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(evidenceService.getEvidenceUrl(evidence.ipfs_hash), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on IPFS
                    </Button>
                    {evidence.source_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(evidence.source_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Source
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
