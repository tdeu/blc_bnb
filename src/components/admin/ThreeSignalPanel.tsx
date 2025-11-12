import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Target,
  TrendingUp,
  FileText,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SignalScores, calculateThreeSignals, getResolutionScore } from '../../services/threeSignalCalculator';
import { approvedMarketsService } from '../../utils/approvedMarketsService';
import { BettingMarket } from '../betting/BettingMarkets';
import { toast } from 'sonner';

interface ThreeSignalPanelProps {
  userProfile?: {
    walletAddress: string;
    displayName?: string;
  };
}

const ThreeSignalPanel: React.FC<ThreeSignalPanelProps> = ({ userProfile }) => {
  const [markets, setMarkets] = useState<BettingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingMarket, setCalculatingMarket] = useState<string | null>(null);
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [signalResults, setSignalResults] = useState<Record<string, SignalScores>>({});

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const allMarkets = await approvedMarketsService.getApprovedMarkets();

      // Filter markets that are in dispute period or ready for resolution
      const now = new Date();
      const resolutionReadyMarkets = allMarkets.filter(market => {
        const isExpired = market.expiresAt && market.expiresAt <= now;
        const needsResolution =
          market.status === 'pending_resolution' ||
          market.status === 'disputable' ||
          (market.status === 'active' && isExpired);
        return needsResolution;
      });

      setMarkets(resolutionReadyMarkets);

      // Load existing signal scores from database
      const scores: Record<string, SignalScores> = {};
      for (const market of resolutionReadyMarkets) {
        const existingScore = await getResolutionScore(market.id);
        if (existingScore) {
          scores[market.id] = existingScore;
        }
      }
      setSignalResults(scores);
    } catch (error) {
      console.error('Error loading markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSignals = async (marketId: string) => {
    try {
      setCalculatingMarket(marketId);
      toast.info('Calculating three-signal analysis...');

      const signals = await calculateThreeSignals(marketId);

      // Update local state
      setSignalResults(prev => ({
        ...prev,
        [marketId]: signals
      }));

      toast.success('Three-signal analysis complete!');
      setExpandedMarket(marketId); // Auto-expand to show results
    } catch (error: any) {
      console.error('Error calculating signals:', error);
      toast.error(`Failed to calculate signals: ${error.message}`);
    } finally {
      setCalculatingMarket(null);
    }
  };

  const SignalBar = ({
    label,
    score,
    maxScore,
    percentage,
    icon: Icon,
    warnings = []
  }: {
    label: string;
    score: number;
    maxScore: number;
    percentage: number;
    icon: any;
    warnings?: string[];
  }) => {
    const progressPercent = (score / maxScore) * 100;
    const direction = percentage > 50 ? 'YES' : 'NO';
    const directionColor = percentage > 50 ? 'text-green-600' : 'text-red-600';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${directionColor}`}>
              {percentage.toFixed(1)}% {direction}
            </span>
            <span className="text-sm text-muted-foreground">
              {score.toFixed(1)}/{maxScore}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {warnings.length > 0 && (
          <div className="flex items-start gap-1 mt-1">
            <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-600">
              {warnings.map((warning, idx) => (
                <div key={idx}>{warning}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const MarketSignalCard = ({ market }: { market: BettingMarket }) => {
    const signals = signalResults[market.id];
    const isExpanded = expandedMarket === market.id;
    const isCalculating = calculatingMarket === market.id;
    const hasSignals = !!signals;

    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base mb-2">{market.claim}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{market.category}</Badge>
                {market.expiresAt && (
                  <span className="text-xs text-muted-foreground">
                    Expired: {new Date(market.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasSignals && (
                <Badge
                  variant={
                    signals.combined.confidence >= 90 ? 'default' :
                    signals.combined.confidence >= 60 ? 'secondary' : 'outline'
                  }
                  className={`text-xs ${
                    signals.combined.confidence >= 90 ? 'bg-green-100 text-green-800' :
                    signals.combined.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {signals.combined.confidence.toFixed(0)}% confidence
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCalculateSignals(market.id)}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Target className="h-3 w-3 mr-1" />
                    {hasSignals ? 'Recalculate' : 'Calculate Signals'}
                  </>
                )}
              </Button>
              {hasSignals && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedMarket(isExpanded ? null : market.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {hasSignals && isExpanded && (
          <CardContent className="space-y-6">
            {/* Individual Signals */}
            <div className="space-y-4">
              <SignalBar
                label="Signal #1: Betting Volumes"
                score={signals.betting.score}
                maxScore={25}
                percentage={signals.betting.percentage}
                icon={TrendingUp}
                warnings={signals.betting.warnings}
              />
              <SignalBar
                label="Signal #2: Evidence Submissions"
                score={signals.evidence.score}
                maxScore={45}
                percentage={signals.evidence.percentage}
                icon={FileText}
                warnings={signals.evidence.warnings}
              />
              <SignalBar
                label="Signal #3: External APIs"
                score={signals.api.score}
                maxScore={30}
                percentage={signals.api.percentage}
                icon={Globe}
                warnings={signals.api.warnings}
              />
            </div>

            {/* Combined Result */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Combined Analysis
                </h4>
                {signals.combined.allSignalsAligned && (
                  <Badge className="text-xs bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All Signals Aligned (+{signals.combined.alignmentBonus} bonus)
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Total Score</span>
                  <span className="text-lg font-bold">
                    {signals.combined.totalScore.toFixed(1)}/108
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium">Recommended Outcome</span>
                  <Badge
                    variant={signals.combined.recommendedOutcome === 'YES' ? 'default' : 'secondary'}
                    className={`text-sm font-bold ${
                      signals.combined.recommendedOutcome === 'YES' ? 'bg-green-600' :
                      signals.combined.recommendedOutcome === 'NO' ? 'bg-red-600' : 'bg-gray-600'
                    }`}
                  >
                    {signals.combined.recommendedOutcome}
                  </Badge>
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    {signals.combined.confidence >= 95 ? (
                      <p><strong>High Confidence:</strong> This market is ready for automatic resolution.</p>
                    ) : signals.combined.confidence >= 60 ? (
                      <p><strong>Medium Confidence:</strong> Admin review recommended before resolution.</p>
                    ) : (
                      <p><strong>Low Confidence:</strong> Manual investigation required before resolution.</p>
                    )}
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View detailed breakdown
                  </summary>
                  <div className="mt-2 space-y-2 p-3 bg-muted/30 rounded">
                    <div>
                      <strong>Betting Volume:</strong> {signals.betting.volume.yes} YES / {signals.betting.volume.no} NO
                    </div>
                    <div>
                      <strong>Evidence Weight:</strong> {signals.evidence.weightedYes.toFixed(2)} YES / {signals.evidence.weightedNo.toFixed(2)} NO
                    </div>
                    <div>
                      <strong>Evidence Count:</strong> {signals.evidence.submissions.yes} YES / {signals.evidence.submissions.no} NO
                    </div>
                    <div>
                      <strong>API Articles:</strong> {signals.api.articleCount} analyzed
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Markets Ready for Resolution</h3>
        <p className="text-sm text-muted-foreground">
          Markets will appear here when they expire or enter dispute period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Three-Signal Resolution Analysis
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Combines betting volumes, evidence submissions, and external APIs to determine market outcomes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMarkets}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">Signal #1: Betting (0-25)</span>
          </div>
          <p className="text-muted-foreground">On-chain betting volumes and consensus</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="font-semibold">Signal #2: Evidence (0-45)</span>
          </div>
          <p className="text-muted-foreground">Weighted by credibility and contrarian analysis</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-purple-600" />
            <span className="font-semibold">Signal #3: APIs (0-30)</span>
          </div>
          <p className="text-muted-foreground">Real-world data from news and verified sources</p>
        </div>
      </div>

      <div className="space-y-4">
        {markets.map(market => (
          <MarketSignalCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  );
};

export default ThreeSignalPanel;
