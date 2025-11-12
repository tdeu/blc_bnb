import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import {
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  Gavel,
  ArrowRight,
  Timer,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { BettingMarket } from '../betting/BettingMarkets';
import { approvedMarketsService } from '../../utils/approvedMarketsService';
import { resolutionService } from '../../utils/resolutionService';

interface TwoStageResolutionPanelProps {
  userProfile: {
    walletAddress: string;
    displayName?: string;
  };
}

interface MarketForResolution extends BettingMarket {
  dispute_period_end?: string;
  resolution_data?: {
    outcome?: string;
    confidence?: number;
    resolved_by?: string;
    preliminary_outcome?: string;
    preliminary_time?: string;
  };
}

const TwoStageResolutionPanel: React.FC<TwoStageResolutionPanelProps> = ({ userProfile }) => {
  const [activeMarkets, setActiveMarkets] = useState<MarketForResolution[]>([]);
  const [pendingMarkets, setPendingMarkets] = useState<MarketForResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingMarketId, setProcessingMarketId] = useState<string | null>(null);

  // Resolution state
  const [selectedMarket, setSelectedMarket] = useState<MarketForResolution | null>(null);
  const [resolutionStep, setResolutionStep] = useState<'preliminary' | 'final'>('preliminary');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  const [confidence, setConfidence] = useState<number>(85);
  const [reasoning, setReasoning] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const markets = await approvedMarketsService.getApprovedMarkets();

      const now = new Date();

      // Step 1: Markets in dispute period - match homepage logic
      const disputePeriodMarkets = markets.filter(market => {
        // Include markets that are: disputable, pending_resolution, disputing, or expired active markets
        const isExpired = market.expiresAt && market.expiresAt <= now && market.status === 'active';
        const hasDisputeStatus = ['disputable', 'pending_resolution', 'disputing'].includes(market.status);
        const hasDisputePeriod = market.dispute_period_end;

        // Must be in dispute state AND have dispute period active
        const inDisputeState = hasDisputeStatus || isExpired;
        const disputePeriodActive = hasDisputePeriod && new Date(market.dispute_period_end) > now;

        return inDisputeState && disputePeriodActive;
      });

      // Step 2: Markets ready for final resolution (dispute period expired)
      const finalResolutionMarkets = markets.filter(market => {
        const isExpired = market.expiresAt && market.expiresAt <= now && market.status === 'active';
        const hasDisputeStatus = ['disputable', 'pending_resolution', 'disputing'].includes(market.status);
        const inDisputeState = hasDisputeStatus || isExpired;

        if (!inDisputeState || !market.dispute_period_end) return false;

        const disputePeriodEnd = new Date(market.dispute_period_end);
        return now > disputePeriodEnd;
      });

      setActiveMarkets(disputePeriodMarkets);
      setPendingMarkets(finalResolutionMarkets);
    } catch (error) {
      console.error('Error loading markets:', error);
      toast.error('Failed to load markets for resolution');
    } finally {
      setLoading(false);
    }
  };

  const handlePreliminaryResolve = async () => {
    if (!selectedMarket) return;

    try {
      setProcessingMarketId(selectedMarket.id);

      await resolutionService.preliminaryResolveMarket(
        selectedMarket.id,
        selectedOutcome,
        userProfile.walletAddress
      );

      toast.success(`Preliminary resolution submitted: ${selectedOutcome.toUpperCase()}. Dispute period started (7 days).`);

      // Refresh markets
      await loadMarkets();
      setSelectedMarket(null);
      setShowConfirmDialog(false);

    } catch (error) {
      console.error('Error in preliminary resolution:', error);
      toast.error('Failed to submit preliminary resolution');
    } finally {
      setProcessingMarketId(null);
    }
  };

  const handleFinalResolve = async () => {
    if (!selectedMarket) return;

    try {
      setProcessingMarketId(selectedMarket.id);

      await resolutionService.finalResolveMarket(
        selectedMarket.id,
        selectedOutcome,
        confidence,
        userProfile.walletAddress
      );

      toast.success(`Final resolution completed: ${selectedOutcome.toUpperCase()} with ${confidence}% confidence.`);

      // Refresh markets
      await loadMarkets();
      setSelectedMarket(null);
      setShowConfirmDialog(false);

    } catch (error) {
      console.error('Error in final resolution:', error);
      toast.error('Failed to submit final resolution');
    } finally {
      setProcessingMarketId(null);
    }
  };

  const openResolutionDialog = (market: MarketForResolution, step: 'preliminary' | 'final') => {
    setSelectedMarket(market);
    setResolutionStep(step);
    setSelectedOutcome('yes');
    setConfidence(85);
    setReasoning('');
    setShowConfirmDialog(true);
  };

  const isDisputePeriodExpired = (market: MarketForResolution): boolean => {
    if (!market.dispute_period_end) return false;
    return new Date() > new Date(market.dispute_period_end);
  };

  const getTimeRemaining = (endTime: string): string => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading markets for resolution...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Evidence Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Step 1: Evidence Review
            <Badge variant="outline">{activeMarkets.length} markets</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeMarkets.length === 0 ? (
            <p className="text-muted-foreground">No markets in dispute period.</p>
          ) : (
            <div className="space-y-4">
              {activeMarkets.map((market) => {
                const timeRemaining = market.dispute_period_end ? getTimeRemaining(market.dispute_period_end) : '';

                return (
                  <div key={market.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{market.claim}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {market.dispute_period_end
                                ? `Dispute period: ${timeRemaining} remaining`
                                : `Status: ${market.status} - Awaiting dispute period setup`
                              }
                            </span>
                          </div>
                          <Badge variant="secondary">{market.category}</Badge>
                        </div>
                        {market.resolution_data?.preliminary_outcome !== undefined && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Preliminary: {String(market.resolution_data.preliminary_outcome).toUpperCase()}
                            </Badge>
                          </div>
                        )}
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            📄 Review user-submitted evidence during dispute period. No action required until dispute period expires.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Confirm Final Resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Step 2: Confirm Final Resolution
            <Badge variant="outline">{pendingMarkets.length} markets</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMarkets.length === 0 ? (
            <p className="text-muted-foreground">No markets ready for final resolution.</p>
          ) : (
            <div className="space-y-4">
              {pendingMarkets.map((market) => {
                return (
                  <div key={market.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{market.claim}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Dispute period ended - ready for final resolution</span>
                          </div>
                          <Badge variant="secondary">{market.category}</Badge>
                        </div>
                        {market.resolution_data?.preliminary_outcome !== undefined && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Preliminary: {String(market.resolution_data.preliminary_outcome).toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => openResolutionDialog(market, 'final')}
                        disabled={processingMarketId === market.id}
                        className="ml-4"
                      >
                        {processingMarketId === market.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Gavel className="h-4 w-4 mr-2" />
                        )}
                        Final Resolution
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolutionStep === 'preliminary' ? 'Preliminary Resolution' : 'Final Resolution'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMarket?.claim}
            </AlertDialogDescription>
            {resolutionStep === 'final' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  🏛️ Final resolution will be sent to the blockchain and trigger payouts to winners.
                </p>
              </div>
            )}
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Outcome Selection */}
            <div>
              <Label>Resolution Outcome</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={selectedOutcome === 'yes' ? 'default' : 'outline'}
                  onClick={() => setSelectedOutcome('yes')}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  TRUE
                </Button>
                <Button
                  variant={selectedOutcome === 'no' ? 'default' : 'outline'}
                  onClick={() => setSelectedOutcome('no')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  FALSE
                </Button>
              </div>
            </div>

            {/* Confidence Score (only for final resolution) */}
            {resolutionStep === 'final' && (
              <div>
                <Label>Confidence Score: {confidence}%</Label>
                <Slider
                  value={[confidence]}
                  onValueChange={(value) => setConfidence(value[0])}
                  max={100}
                  min={50}
                  step={5}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Higher confidence indicates more certainty in the resolution
                </p>
              </div>
            )}

            {/* Reasoning */}
            <div>
              <Label>Reasoning (Optional)</Label>
              <Textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain the decision basis..."
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Information */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  {resolutionStep === 'preliminary' ? (
                    <p>This will start a 7-day dispute period where users can submit counter-evidence.</p>
                  ) : (
                    <p>This will finalize the market resolution on the blockchain and trigger payouts to winners.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resolutionStep === 'preliminary' ? handlePreliminaryResolve : handleFinalResolve}
            >
              {resolutionStep === 'preliminary' ? 'Submit Preliminary' : 'Confirm Final Resolution'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TwoStageResolutionPanel;