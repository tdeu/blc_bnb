import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  MessageSquare,
  Timer,
  Gavel,
  FileText,
  Activity,
  Brain,
  Zap,
  Loader2
} from 'lucide-react';
import { BettingMarket } from '../betting/BettingMarkets';
import { MarketResolution } from '../../utils/supabase';
import { AIAgentSimple } from '../ai/AIAgentSimple';
import { useBlockCastAI } from '../../hooks/useBlockCastAI';

interface ResolutionStatusProps {
  market: BettingMarket;
  resolution?: MarketResolution;
  onDispute?: () => void;
  hcsTopicId?: string;
  transactionId?: string;
  consensusTimestamp?: Date;
  showTransactionLink?: boolean;
  disputeCount?: number;
  canDispute?: boolean;
  enableAIAnalysis?: boolean;
}

interface StatusInfo {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

export default function ResolutionStatus({
  market,
  resolution,
  onDispute,
  hcsTopicId,
  transactionId,
  consensusTimestamp,
  showTransactionLink = true,
  disputeCount = 0,
  canDispute = true,
  enableAIAnalysis = true
}: ResolutionStatusProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // AI Agent integration
  const { 
    processCommand, 
    status: aiStatus, 
    isProcessing: aiProcessing, 
    lastResult: aiResult 
  } = useBlockCastAI();
  const [aiValidation, setAIValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (resolution?.dispute_period_end) {
      const updateTimer = () => {
        const now = new Date();
        const endTime = new Date(resolution.dispute_period_end);
        const diff = endTime.getTime() - now.getTime();

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining('Expired');
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(timer);
    }
  }, [resolution?.dispute_period_end]);

  const getStatusInfo = (): StatusInfo => {
    const status = market.status || 'active';

    switch (status) {
      case 'active':
        return {
          label: 'Active Trading',
          color: 'bg-blue-500',
          icon: <Activity className="h-4 w-4" />,
          description: 'Market is currently accepting bets'
        };
      case 'pending_resolution':
        return {
          label: 'Pending Resolution',
          color: 'bg-yellow-500',
          icon: <Clock className="h-4 w-4" />,
          description: 'Awaiting outcome verification'
        };
      case 'disputing':
        return {
          label: 'Under Dispute',
          color: 'bg-orange-500',
          icon: <AlertTriangle className="h-4 w-4" />,
          description: `${disputeCount} active dispute${disputeCount !== 1 ? 's' : ''}`
        };
      case 'resolved':
        return {
          label: 'Resolved',
          color: 'bg-green-500',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Market outcome confirmed'
        };
      case 'disputed_resolution':
        return {
          label: 'Resolution Disputed',
          color: 'bg-red-500',
          icon: <Gavel className="h-4 w-4" />,
          description: 'Admin review required'
        };
      case 'locked':
        return {
          label: 'Locked',
          color: 'bg-gray-500',
          icon: <XCircle className="h-4 w-4" />,
          description: 'Market temporarily locked'
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-400',
          icon: <Eye className="h-4 w-4" />,
          description: 'Status unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;

    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[confidence as keyof typeof colors]}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisputePeriodProgress = () => {
    if (!resolution?.dispute_period_end) return 0;

    const start = new Date(resolution.timestamp);
    const end = new Date(resolution.dispute_period_end);
    const now = new Date();
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const handleAIValidation = async () => {
    if (aiStatus !== 'ready') {
      return;
    }

    if (!resolution) {
      return;
    }

    setIsValidating(true);
    try {
      const command = `Validate market resolution for: "${market.claim}". 
      Current resolution: ${resolution.outcome} with ${resolution.confidence} confidence. 
      Source: ${resolution.source}. 
      Market context: ${market.description}. 
      Country/Region: ${market.country || market.region}. 
      Analyze cultural context, cross-reference multi-language sources, and provide validation confidence score with reasoning.`;
      
      const result = await processCommand(command);
      setAIValidation(result);
    } catch (error) {
      console.error('AI validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {statusInfo.icon}
            Resolution Status
          </CardTitle>
          <Badge className={`${statusInfo.color} text-white`}>
            {statusInfo.label}
          </Badge>
        </div>
        <CardDescription>{statusInfo.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Outcome Display */}
        {resolution && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Outcome:</span>
              <Badge 
                className={resolution.outcome === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {resolution.outcome === 'yes' ? 'YES' : 'NO'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Source:</span>
              <span className="text-sm text-muted-foreground capitalize">{resolution.source}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence:</span>
              {getConfidenceBadge(resolution.confidence)}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resolved:</span>
              <span className="text-sm text-muted-foreground">
                {formatTimestamp(resolution.timestamp)}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Dispute Period Information */}
        {resolution && market.status !== 'resolved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Dispute Period
              </span>
              <span className="text-sm text-muted-foreground">
                {timeRemaining}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Started: {formatTimestamp(resolution.timestamp)}</span>
                <span>Ends: {formatTimestamp(resolution.dispute_period_end)}</span>
              </div>
              <Progress value={getDisputePeriodProgress()} className="h-2" />
            </div>

            {disputeCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <MessageSquare className="h-4 w-4" />
                {disputeCount} active dispute{disputeCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Hedera Transaction Information */}
        {(transactionId || hcsTopicId) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Blockchain Details
            </h4>

            {transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Transaction ID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {transactionId.slice(0, 8)}...{transactionId.slice(-8)}
                  </span>
                  {showTransactionLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`https://hashscan.io/testnet/transaction/${transactionId}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {hcsTopicId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">HCS Topic:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {hcsTopicId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`https://hashscan.io/testnet/topic/${hcsTopicId}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {consensusTimestamp && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consensus Time:</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(consensusTimestamp)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dispute actions moved to main market page */}

        {/* AI Resolution Validation */}
        {enableAIAnalysis && resolution && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Resolution Validation
                </h4>
                <AIAgentSimple compact={true} />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAIValidation}
                  disabled={isValidating || aiProcessing || aiStatus !== 'ready'}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-3 w-3" />
                  {isValidating ? 'Validating...' : 'Validate Resolution'}
                </Button>
                {aiValidation && (
                  <Button 
                    onClick={() => setAIValidation(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* AI Validation Process */}
              {isValidating && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-xs font-medium">AI Validation in Progress...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cross-referencing resolution with multi-language sources and cultural context...
                  </p>
                </div>
              )}

              {/* AI Validation Results */}
              {aiValidation && (
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border ${
                    aiValidation.confidence > 80 ? 'bg-green-50 dark:bg-green-900/10 border-green-200' :
                    aiValidation.confidence > 60 ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200' :
                    'bg-red-50 dark:bg-red-900/10 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">AI Confidence Score</span>
                      <span className={`text-xs font-bold ${
                        aiValidation.confidence > 80 ? 'text-green-600' :
                        aiValidation.confidence > 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {aiValidation.confidence}%
                      </span>
                    </div>
                    <Progress value={aiValidation.confidence} className="h-2" />
                  </div>
                  
                  {aiValidation.reasoning && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>AI Analysis:</strong> {aiValidation.reasoning}
                    </p>
                  )}
                  
                  {aiValidation.culturalContext && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 p-2 rounded">
                      <strong>Cultural Context:</strong> {aiValidation.culturalContext}
                    </p>
                  )}
                  
                  {aiValidation.languageSupport && (
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(aiValidation.languageSupport).map(([lang, status]: [string, any]) => (
                        <div key={lang} className="flex items-center gap-1 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            status === 'confirmed' ? 'bg-green-500' : 
                            status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span>{lang}: {status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show error when AI not available */}
              {aiStatus !== 'ready' && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    AI Agent setup required for automated resolution validation.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Admin Notes */}
        {resolution?.admin_notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium">Admin Notes:</span>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {resolution.admin_notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}