import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy,
  Eye,
  EyeOff,
  Brain,
  Zap,
  Shield
} from 'lucide-react';

interface AISetupGuideProps {
  onComplete?: () => void;
}

export const AISetupGuide: React.FC<AISetupGuideProps> = ({ onComplete }) => {
  const [showKeys, setShowKeys] = React.useState(false);

  // Check environment variables
  const hasHederaCredentials = 
    (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) ||
    (import.meta.env?.VITE_HEDERA_TESTNET_ACCOUNT_ID && import.meta.env?.VITE_HEDERA_TESTNET_PRIVATE_KEY);

  const hasOpenAI = import.meta.env?.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const hasAnthropic = import.meta.env?.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const hasAIProvider = hasOpenAI || hasAnthropic;

  const allReady = hasHederaCredentials && hasAIProvider;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const envExamples = {
    hedera: `# Hedera Testnet Credentials (Required)
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=0x...YOUR_PRIVATE_KEY

# OR use VITE_ prefixed versions for Vite
VITE_HEDERA_TESTNET_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID  
VITE_HEDERA_TESTNET_PRIVATE_KEY=0x...YOUR_PRIVATE_KEY`,

    openai: `# OpenAI API Key (Choose one AI provider)
OPENAI_API_KEY=sk-proj-...YOUR_OPENAI_KEY

# OR use VITE_ prefix for client-side access
VITE_OPENAI_API_KEY=sk-proj-...YOUR_OPENAI_KEY`,

    anthropic: `# Anthropic API Key (Alternative to OpenAI)
ANTHROPIC_API_KEY=sk-ant-...YOUR_ANTHROPIC_KEY

# OR use VITE_ prefix for client-side access  
VITE_ANTHROPIC_API_KEY=sk-ant-...YOUR_ANTHROPIC_KEY`
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                BlockCast AI Agent Setup
              </CardTitle>
              <CardDescription>
                Configure your environment for AI-powered dispute resolution
              </CardDescription>
            </div>
            <Badge variant={allReady ? "default" : "secondary"}>
              {allReady ? "Ready" : "Setup Required"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <Zap className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <h3 className="font-medium">Multi-Language AI</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Analyze evidence in English, French, Swahili, Arabic
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <Shield className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <h3 className="font-medium">Cultural Context</h3>
              <p className="text-xs text-muted-foreground mt-1">
                African regional expertise and sensitivity
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
              <Brain className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <h3 className="font-medium">Blockchain Integration</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Direct Hedera operations with full audit trail
              </p>
            </div>
          </div>

          {/* Status Checks */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Setup Status</h3>
            
            {/* Hedera Status */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {hasHederaCredentials ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <p className="font-medium">Hedera Blockchain Credentials</p>
                <p className="text-sm text-muted-foreground">
                  {hasHederaCredentials ? 
                    "✅ Configured and ready" : 
                    "❌ Missing - Required for blockchain operations"}
                </p>
              </div>
              <Badge variant={hasHederaCredentials ? "default" : "destructive"}>
                {hasHederaCredentials ? "Ready" : "Required"}
              </Badge>
            </div>

            {/* AI Provider Status */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {hasAIProvider ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <p className="font-medium">AI Provider API Key</p>
                <p className="text-sm text-muted-foreground">
                  {hasAIProvider ? 
                    `✅ ${hasOpenAI ? 'OpenAI' : 'Anthropic'} configured` : 
                    "❌ Missing - Required for AI analysis"}
                </p>
              </div>
              <Badge variant={hasAIProvider ? "default" : "destructive"}>
                {hasAIProvider ? "Ready" : "Required"}
              </Badge>
            </div>
          </div>

          {/* Setup Instructions */}
          {!allReady && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Setup Instructions</h3>
              
              {/* Hedera Setup */}
              {!hasHederaCredentials && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p><strong>Step 1: Get Hedera Testnet Credentials</strong></p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Go to <a href="https://portal.hedera.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          Hedera Portal <ExternalLink className="h-3 w-3" />
                        </a></li>
                        <li>Create a testnet account (free)</li>
                        <li>Copy your Account ID and Private Key</li>
                        <li>Add to your <code>.env</code> file:</li>
                      </ol>
                      
                      <div className="relative">
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                          {showKeys ? envExamples.hedera : envExamples.hedera.replace(/0\.0\..*|0x.*/g, '***HIDDEN***')}
                        </pre>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowKeys(!showKeys)}
                            className="h-6 w-6 p-0"
                          >
                            {showKeys ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(envExamples.hedera)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* AI Provider Setup */}
              {!hasAIProvider && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p><strong>Step 2: Choose an AI Provider</strong></p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded p-3">
                          <h4 className="font-medium flex items-center gap-2">
                            OpenAI GPT-4
                            <Badge variant="secondary">Recommended</Badge>
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">Best for complex reasoning</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs">
                            <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI API Keys</a></li>
                            <li>Create new API key</li>
                            <li>Add to .env:</li>
                          </ol>
                          <pre className="bg-muted p-2 rounded text-xs mt-2">
                            OPENAI_API_KEY=sk-proj-...
                          </pre>
                        </div>

                        <div className="border rounded p-3">
                          <h4 className="font-medium">Anthropic Claude</h4>
                          <p className="text-xs text-muted-foreground mb-2">Good alternative option</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs">
                            <li>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a></li>
                            <li>Create new API key</li>
                            <li>Add to .env:</li>
                          </ol>
                          <pre className="bg-muted p-2 rounded text-xs mt-2">
                            ANTHROPIC_API_KEY=sk-ant-...
                          </pre>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Success State */}
          {allReady && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p><strong>🎉 All systems ready!</strong></p>
                    <p className="text-sm">Your BlockCast AI Agent is configured and ready to use.</p>
                  </div>
                  {onComplete && (
                    <Button onClick={onComplete} className="ml-4">
                      Start Using AI Agent
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Test Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              After setup, restart your development server to apply changes
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISetupGuide;