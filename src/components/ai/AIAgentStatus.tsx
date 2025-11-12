import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, CheckCircle2, Loader2, Brain, Zap, Globe, Shield } from 'lucide-react';
import { useBlockCastAI } from '../../hooks/useBlockCastAI';

interface AIAgentStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const AIAgentStatus: React.FC<AIAgentStatusProps> = ({ 
  compact = false, 
  showDetails = false 
}) => {
  const { status, processing, initializeAgent, checkAgentHealth } = useBlockCastAI();

  const getStatusIcon = () => {
    if (status.loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status.error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (status.initialized) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (status.loading) return 'secondary';
    if (status.error) return 'destructive';
    if (status.initialized) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (status.loading) return 'Initializing AI Agent...';
    if (status.error) return 'AI Agent Error';
    if (status.initialized) return 'AI Agent Ready';
    return 'AI Agent Offline';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Badge variant={getStatusColor()} className="text-xs">
          {processing.processing ? `AI: ${processing.operation}` : getStatusText()}
        </Badge>
        {status.error && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={initializeAgent}
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            BlockCast AI Agent
          </CardTitle>
          <Badge variant={getStatusColor()}>
            {status.initialized ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <CardDescription>
          Multi-language truth verification AI
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        {/* Processing Status */}
        {processing.processing && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {processing.progress}
            </p>
          </div>
        )}

        {/* Error Display */}
        {status.error && (
          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Setup Required
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  {status.error}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeAgent}
              className="mt-2 w-full"
            >
              Retry Initialization
            </Button>
          </div>
        )}

        {/* Capabilities */}
        {status.initialized && showDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">AI Capabilities</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3 w-3 text-blue-500" />
                Multi-Language
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3 w-3 text-green-500" />
                Truth Verification
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-yellow-500" />
                Real-time Analysis
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Brain className="h-3 w-3 text-purple-500" />
                Cultural Context
              </div>
            </div>

            {status.capabilities.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View All Capabilities ({status.capabilities.length})
                </summary>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {status.capabilities.map((capability, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="mt-1">•</span>
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Health Check */}
        {status.initialized && (
          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkAgentHealth}
              className="w-full text-xs"
            >
              Check Health
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAgentStatus;