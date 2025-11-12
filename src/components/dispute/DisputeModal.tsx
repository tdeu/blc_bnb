import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { 
  AlertTriangle, 
  Upload, 
  DollarSign, 
  Calculator,
  Info,
  CheckCircle,
  ExternalLink,
  Loader2,
  Brain,
  Zap,
  Target,
  Globe
} from 'lucide-react';
import { BettingMarket } from '../betting/BettingMarkets';
import { MarketResolution } from '../../utils/supabase';
import { toast } from 'sonner@2.0.3';
import { AIAgentSimple } from '../ai/AIAgentSimple';
import { useBlockCastAI } from '../../hooks/useBlockCastAI';
import DisputeBondService, { disputeBondService, DisputeValidationResult } from '../../utils/disputeBondService';
import TokenService from '../../utils/tokenService';
import { DISPUTE_PERIOD } from '../../config/constants';

interface DisputeModalProps {
  isOpen: boolean;
  marketId: string;
  market: BettingMarket;
  resolution: MarketResolution;
  onSubmit: (disputeData: DisputeFormData) => Promise<void>;
  onClose: () => void;
  userAddress?: string;
  marketAddress?: string;
  showBondCalculator?: boolean;
  isSubmitting?: boolean;
  enableAIAssistance?: boolean;
}

export interface DisputeFormData {
  reason: string;
  evidenceUrl?: string;
  evidenceDescription?: string;
  disputeType: 'evidence' | 'interpretation' | 'api_error';
}

interface BondCalculatorProps {
  disputeType: 'evidence' | 'interpretation' | 'api_error';
  userReputationScore?: number;
  onBondCalculated: (amount: number) => void;
}

function DisputeBondCalculator({ disputeType, userReputationScore = 50, onBondCalculated }: BondCalculatorProps) {
  const [bondInfo, setBondInfo] = useState<any>(null);

  useEffect(() => {
    // Get bond info from the new dispute bond service
    const bondDisplayInfo = DisputeBondService.getBondDisplayInfo();
    setBondInfo(bondDisplayInfo);

    // Use standardized bond amount from constants
    const finalAmount = parseFloat(DISPUTE_PERIOD.BOND_AMOUNT_CAST);
    onBondCalculated(finalAmount);
  }, [disputeType, onBondCalculated]);

  if (!bondInfo) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Dispute Bond Requirement
        </CardTitle>
        <CardDescription>
          Required bond amount standardized across all disputes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Bond Amount ({bondInfo.displayToken})</Label>
            <div className="font-medium">{bondInfo.displayAmount} {bondInfo.displayToken}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contract Token</Label>
            <div className="font-medium">{bondInfo.contractAmount} {bondInfo.contractToken}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Dispute Period</Label>
            <div className="font-medium">{DISPUTE_PERIOD.HOURS} hours</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="font-bold text-lg text-blue-600">Fixed Rate</div>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-500" />
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Bond Policy:</div>
              <ul className="space-y-1">
                <li>• Successful disputes: Full refund</li>
                <li>• Failed disputes: Bond forfeited</li>
                <li>• Expired disputes: Full refund</li>
                <li>• {DISPUTE_PERIOD.HOURS}-hour dispute period</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">{bondInfo.explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DisputeModal({
  isOpen,
  marketId,
  market,
  resolution,
  onSubmit,
  onClose,
  userAddress,
  marketAddress,
  showBondCalculator = true,
  isSubmitting = false,
  enableAIAssistance = true
}: DisputeModalProps) {
  const [formData, setFormData] = useState<DisputeFormData>({
    reason: '',
    evidenceUrl: '',
    evidenceDescription: '',
    disputeType: 'evidence'
  });
  const [calculatedBondAmount, setCalculatedBondAmount] = useState(100);
  const [bondValidation, setBondValidation] = useState<DisputeValidationResult | null>(null);
  const [isValidatingBond, setIsValidatingBond] = useState(false);
  const [castBalance, setCastBalance] = useState('0');
  
  // AI Agent integration
  const { 
    processCommand, 
    status: aiStatus, 
    isProcessing: aiProcessing, 
    lastResult: aiResult 
  } = useBlockCastAI();
  const [aiAssessment, setAIAssessment] = useState<any>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);

  // Validate bond requirements when modal opens or user/market changes
  useEffect(() => {
    async function validateBondRequirements() {
      if (!isOpen || !userAddress || !marketAddress) {
        return;
      }

      setIsValidatingBond(true);
      try {
        // Get user's CAST balance
        const balance = await disputeBondService.getUserCastBalance(userAddress);
        setCastBalance(balance);

        // Validate dispute creation on chain
        const validation = await disputeBondService.validateDisputeCreationOnChain(userAddress, marketAddress);
        setBondValidation(validation);

        // Update calculated bond amount
        if (validation.requiredBond) {
          setCalculatedBondAmount(parseFloat(validation.requiredBond));
        }

      } catch (error) {
        console.error('Error validating bond requirements:', error);
        setBondValidation({
          isValid: false,
          error: 'Failed to validate bond requirements. Please try again.'
        });
      } finally {
        setIsValidatingBond(false);
      }
    }

    validateBondRequirements();

    // Re-validate every 10 seconds while modal is open to catch any changes
    const intervalId = setInterval(() => {
      if (isOpen && userAddress && marketAddress) {
        validateBondRequirements();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isOpen, userAddress, marketAddress]);

  const disputeTypeOptions = [
    {
      value: 'evidence',
      label: 'Incorrect Evidence',
      description: 'The API data or source information is factually wrong'
    },
    {
      value: 'interpretation',
      label: 'Wrong Interpretation',
      description: 'The outcome interpretation of the data is incorrect'
    },
    {
      value: 'api_error',
      label: 'API/Technical Error',
      description: 'The API source had technical issues or returned invalid data'
    }
  ];

  const handleSubmit = async () => {
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    if (formData.reason.length < 20) {
      toast.error('Dispute reason must be at least 20 characters');
      return;
    }

    // Check bond validation
    if (!bondValidation?.isValid) {
      toast.error(bondValidation?.error || 'Bond validation failed');
      return;
    }

    if (!userAddress || !marketAddress) {
      toast.error('User address and market address are required');
      return;
    }

    // Re-validate dispute creation right before submission to prevent race conditions
    setIsValidatingBond(true);
    try {
      const finalValidation = await disputeBondService.validateDisputeCreationOnChain(userAddress, marketAddress);

      if (!finalValidation.isValid) {
        setBondValidation(finalValidation);
        toast.error(finalValidation.error || 'Cannot create dispute at this time');
        setIsValidatingBond(false);
        return;
      }

      setIsValidatingBond(false);

      await onSubmit(formData);
      setFormData({
        reason: '',
        evidenceUrl: '',
        evidenceDescription: '',
        disputeType: 'evidence'
      });
      onClose();
      toast.success('Dispute submitted successfully');
    } catch (error) {
      console.error('Error submitting dispute:', error);
      setIsValidatingBond(false);
      toast.error('Failed to submit dispute. Please try again.');
    }
  };

  const formatOutcome = (outcome?: string) => {
    if (!outcome) return 'Unknown';
    return outcome.toUpperCase();
  };

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

  const handleAIAssessment = async () => {
    if (aiStatus !== 'ready') {
      return;
    }

    setIsAssessing(true);
    try {
      const command = `Assess dispute quality for market: "${market.claim}". 
      Current resolution: ${resolution.outcome} (${resolution.confidence} confidence, source: ${resolution.source}). 
      Market context: ${market.description}. 
      Country/Region: ${market.country || market.region}. 
      Analyze the likelihood of dispute success, recommend dispute type, and provide reasoning based on cultural context and multi-language evidence analysis.`;
      
      const result = await processCommand(command);
      setAIAssessment({
        successProbability: result?.confidence || Math.floor(Math.random() * 30) + 40, // Mock fallback
        reasoning: result?.reasoning || 'Analysis based on resolution confidence and source credibility',
        recommendedType: result?.recommendedType || 'evidence',
        typeReasoning: result?.typeReasoning || 'Based on resolution source and confidence level',
        culturalFactors: result?.culturalFactors
      });
    } catch (error) {
      console.error('AI assessment failed:', error);
      // Provide fallback assessment
      setAIAssessment({
        successProbability: 45,
        reasoning: 'Unable to complete full AI analysis. Consider dispute carefully.',
        recommendedType: 'evidence',
        typeReasoning: 'Standard recommendation for evidence-based disputes'
      });
    } finally {
      setIsAssessing(false);
    }
  };

  const generateAISuggestions = async () => {
    if (aiStatus !== 'ready') {
      return;
    }

    try {
      const command = `Generate 3 dispute reason suggestions for market: "${market.claim}". 
      Current resolution: ${resolution.outcome} (${resolution.confidence} confidence). 
      Dispute type: ${formData.disputeType}. 
      Focus on cultural context and multi-language evidence. Each suggestion should be detailed and specific.`;
      
      const result = await processCommand(command);
      const suggestions = result?.suggestions || [
        `The current resolution appears to lack sufficient cultural context for ${market.country || market.region}. Local sources suggest different evidence that contradicts the ${resolution.outcome} outcome.`,
        `The ${resolution.confidence} confidence rating seems inconsistent with available multi-language sources from the region, particularly in local news coverage.`,
        `The resolution methodology may not have adequately considered regional reporting patterns and cultural factors that affect how this type of event is documented.`
      ];
      setAISuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Dispute Market Resolution
          </DialogTitle>
          <DialogDescription>
            Challenge the current resolution for this market. A bond is required to prevent spam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Market Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Claim</Label>
                <p className="text-sm font-medium">{market.claim}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Outcome</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={resolution.outcome === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {formatOutcome(resolution.outcome)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Confidence</Label>
                  <div>{getConfidenceBadge(resolution.confidence)}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Source</Label>
                <p className="text-sm capitalize">{resolution.source}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Dispute Assessment */}
          {enableAIAssistance && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Dispute Assistant
                  </CardTitle>
                  <AIAgentSimple compact={true} />
                </div>
                <CardDescription>
                  Get AI-powered analysis and suggestions for your dispute
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleAIAssessment}
                  disabled={isAssessing || aiProcessing || aiStatus !== 'ready'}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isAssessing ? 'Analyzing Dispute...' : 'Analyze Dispute Quality'}
                </Button>
                
                {/* AI Assessment Process */}
                {isAssessing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">AI Assessment in Progress...</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analyzing market context, resolution data, and cultural factors...
                    </p>
                  </div>
                )}
                
                {/* AI Assessment Results */}
                {aiAssessment && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg border ${
                      aiAssessment.successProbability > 70 ? 'bg-green-50 dark:bg-green-900/10 border-green-200' :
                      aiAssessment.successProbability > 40 ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200' :
                      'bg-red-50 dark:bg-red-900/10 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Success Probability</span>
                        <span className={`text-xs font-bold ${
                          aiAssessment.successProbability > 70 ? 'text-green-600' :
                          aiAssessment.successProbability > 40 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {aiAssessment.successProbability}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {aiAssessment.reasoning}
                      </div>
                    </div>
                    
                    {aiAssessment.recommendedType && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-200">
                        <div className="text-xs font-medium text-purple-700 dark:text-purple-400">Recommended Dispute Type</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {aiAssessment.recommendedType} - {aiAssessment.typeReasoning}
                        </div>
                      </div>
                    )}
                    
                    {aiSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium">AI Suggestions:</div>
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setFormData({...formData, reason: suggestion});
                              setAISuggestions([]);
                            }}
                            className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs border"
                          >
                            <Target className="h-3 w-3 inline mr-1" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {aiStatus !== 'ready' && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      AI Agent setup required for dispute assistance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Dispute Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="disputeType">Dispute Type *</Label>
              <Select 
                value={formData.disputeType} 
                onValueChange={(value: 'evidence' | 'interpretation' | 'api_error') => 
                  setFormData({ ...formData, disputeType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dispute type" />
                </SelectTrigger>
                <SelectContent>
                  {disputeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="reason">Dispute Reason *</Label>
                {enableAIAssistance && aiStatus === 'ready' && (
                  <Button 
                    onClick={generateAISuggestions}
                    disabled={aiProcessing}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    AI Suggestions
                  </Button>
                )}
              </div>
              <Textarea
                id="reason"
                placeholder="Explain why you believe this resolution is incorrect. Include specific details and sources if possible. (Minimum 20 characters)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="min-h-[100px]"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formData.reason.length}/20 minimum characters
              </div>
            </div>

            <div>
              <Label htmlFor="evidenceUrl">Supporting Evidence URL (Optional)</Label>
              <Input
                id="evidenceUrl"
                placeholder="https://example.com/evidence"
                value={formData.evidenceUrl}
                onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="evidenceDescription">Evidence Description (Optional)</Label>
              <Textarea
                id="evidenceDescription"
                placeholder="Describe your evidence and how it supports your dispute"
                value={formData.evidenceDescription}
                onChange={(e) => setFormData({ ...formData, evidenceDescription: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Bond Calculator */}
          {showBondCalculator && (
            <DisputeBondCalculator
              disputeType={formData.disputeType}
              onBondCalculated={setCalculatedBondAmount}
            />
          )}

          {/* Bond Validation Status */}
          <Card className={
            isValidatingBond ? 'border-blue-200' :
            bondValidation?.isValid ? 'border-green-200' : 'border-red-200'
          }>
            <CardContent className="pt-4">
              {isValidatingBond ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Validating bond requirements...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">CAST Token Balance</div>
                      <div className="text-xs text-muted-foreground">
                        Required: {calculatedBondAmount} CAST
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        bondValidation?.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {castBalance} CAST
                      </div>
                      {bondValidation?.isValid ? (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sufficient balance
                        </div>
                      ) : (
                        <div className="text-xs text-red-600">
                          {bondValidation?.error || 'Insufficient balance'}
                        </div>
                      )}
                    </div>
                  </div>

                  {bondValidation && !bondValidation.isValid && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-red-700 mb-1">
                            Cannot Submit Dispute
                          </div>
                          <div className="text-xs text-red-700">
                            {bondValidation.error}
                          </div>
                          {bondValidation.error?.includes('already has active dispute') && (
                            <div className="text-xs text-red-600 mt-2">
                              💡 <strong>Tip:</strong> You can only have one active dispute per market at a time.
                              Wait for your existing dispute to be resolved or expired before submitting a new one.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {bondValidation?.userActiveBonds && parseFloat(bondValidation.userActiveBonds) > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700">
                        <strong>Active Bonds:</strong> {bondValidation.userActiveBonds} CAST
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Information */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Bond Token:</span>
                <span className="font-mono ml-2">CAST</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dispute Period:</span>
                <span className="ml-2">{DISPUTE_PERIOD.HOURS} hours</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.reason.trim() ||
              formData.reason.length < 20 ||
              !bondValidation?.isValid ||
              isValidatingBond ||
              isSubmitting
            }
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : isValidatingBond ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Submit Dispute ({calculatedBondAmount} CAST)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}