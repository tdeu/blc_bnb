import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  TrendingUp,
  Users,
  Loader2,
  RefreshCw,
  Eye,
  Award,
  Slash,
  Clock,
  Gavel
} from 'lucide-react';
import { useBlockCastAI } from '../../hooks/useBlockCastAI';
import { AIAgentStatus } from './AIAgentStatus';
import type { AdminRecommendationRequest } from '../services/blockcastAIAgent';

interface AIAdminRecommendationsProps {
  marketId: string;
  marketData?: {
    claim: string;
    region?: string;
    category?: string;
    aiResolution?: {
      primaryOutcome: string;
      confidence: number;
      reasoning: string;
    };
    disputes?: Array<{
      disputeId: string;
      disputerAddress: string;
      validity?: string;
      qualityScore?: number;
      bondAmount: number;
      evidence?: string;
    }>;
  };
  onRecommendationReceived?: (recommendation: any) => void;
}

export const AIAdminRecommendations: React.FC<AIAdminRecommendationsProps> = ({
  marketId,
  marketData,
  onRecommendationReceived
}) => {
  const { status, isProcessing, processCommand } = useBlockCastAI();
  const [recommendations, setRecommendations] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Generate recommendations when component mounts or data changes
  useEffect(() => {
    if (status === 'ready' && marketData && !isProcessing) {
      generateRecommendations();
    }
  }, [status, marketId, marketData]);

  const generateRecommendations = async () => {
    if (!marketData || status !== 'ready') return;

    try {
      const command = `Generate admin recommendations for market ${marketId}.
        AI Resolution: ${JSON.stringify(marketData.aiResolution)}
        Disputes: ${marketData.disputes?.length || 0}
        Region: ${marketData.region || 'general'}`;

      const result = await processCommand(command);
      setRecommendations({ success: true, recommendations: result });

      if (onRecommendationReceived) {
        onRecommendationReceived(result);
      }
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      setRecommendations({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'CONFIRM_AI':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'OVERRIDE_TO_YES':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'OVERRIDE_TO_NO':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'REQUEST_MORE_TIME':
      case 'EXTEND_REVIEW':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'CONFIRM_AI':
        return 'default';
      case 'OVERRIDE_TO_YES':
        return 'secondary';
      case 'OVERRIDE_TO_NO':
        return 'destructive';
      case 'REQUEST_MORE_TIME':
      case 'EXTEND_REVIEW':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (status !== 'ready') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered admin recommendations and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {status === 'initializing' && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Status: {status}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Agent Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5" />
              AI Admin Assistant
            </CardTitle>
            <AIAgentStatus compact={true} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Multi-language analysis with cultural context
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateRecommendations}
              disabled={isProcessing || !marketData}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-medium">AI Analysis in Progress</p>
                <p className="text-sm text-muted-foreground">Analyzing market data and generating recommendations...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {recommendations && recommendations.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Analysis for market: {marketData?.claim || marketId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Recommendation */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getRecommendationIcon('CONFIRM_AI')} {/* Default icon, would parse from AI response */}
                <Badge variant={getRecommendationColor('CONFIRM_AI')}>
                  Primary Recommendation
                </Badge>
              </div>
              <p className="text-sm font-medium mb-2">
                {typeof recommendations.recommendations === 'string' 
                  ? recommendations.recommendations.split('\n')[0] 
                  : 'AI recommendation available'}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on multi-language evidence analysis and cultural context
              </p>
            </div>

            {/* Market Analysis Summary */}
            {marketData?.aiResolution && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">AI Outcome</p>
                  <p className="font-medium">{marketData.aiResolution.primaryOutcome}</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <Award className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-medium">{(marketData.aiResolution.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                  <Users className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Disputes</p>
                  <p className="font-medium">{marketData.disputes?.length || 0}</p>
                </div>
              </div>
            )}

            {/* Dispute Analysis */}
            {marketData?.disputes && marketData.disputes.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Dispute Quality Analysis
                </h4>
                <div className="space-y-2">
                  {marketData.disputes.map((dispute, index) => (
                    <div key={dispute.disputeId} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">
                          {dispute.disputeId.slice(0, 8)}...
                        </span>
                        <Badge 
                          variant={dispute.validity === 'VALID' ? 'default' : 
                                  dispute.validity === 'INVALID' ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {dispute.validity || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Quality: {((dispute.qualityScore || 0.5) * 100).toFixed(0)}%</span>
                        <span>Bond: {dispute.bondAmount} CAST</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cultural Context Indicators */}
            {marketData?.region && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Cultural Context
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {marketData.region}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {marketData.category || 'General'}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Accept AI Recommendation
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Review Evidence
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Re-analyze
              </Button>
            </div>

            {/* Full AI Response (collapsible) */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View Full AI Analysis
              </summary>
              <div className="mt-2 p-3 bg-muted/30 rounded text-xs font-mono whitespace-pre-wrap">
                {typeof recommendations.recommendations === 'string' 
                  ? recommendations.recommendations 
                  : JSON.stringify(recommendations.recommendations, null, 2)}
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {recommendations && !recommendations.success && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to generate AI recommendations</span>
            </div>
            {recommendations.error && (
              <p className="text-xs text-muted-foreground mt-1">{recommendations.error}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateRecommendations}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAdminRecommendations;