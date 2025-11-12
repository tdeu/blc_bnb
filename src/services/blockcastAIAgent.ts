// Stub file for BSC migration - AI agent will be rewritten for BSC without Hedera Agent Kit
console.log('⚠️ blockcastAIAgent stubbed - will be rewritten for BSC');

interface BlockCastAIConfig {
  aiProvider?: 'openai' | 'anthropic' | 'auto';
  model?: string;
  mode?: string;
  hederaAccountId?: string;
  hederaPrivateKey?: string;
  customPrompts?: {
    system?: string;
    marketResolution?: string;
    disputeAnalysis?: string;
  };
}

interface MarketResolutionRequest {
  marketId: string;
  region?: string;
  languages?: string[];
  evidenceTopics?: string[];
  culturalContext?: string;
  marketType?: string;
  complexity?: 'low' | 'medium' | 'high';
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

interface DisputeProcessingRequest {
  disputeId: string;
  marketId: string;
  disputerAddress: string;
  ipfsHash: string;
  language: string;
  aiResolution: {
    primaryOutcome: string;
    confidence: number;
    reasoning: string;
  };
  marketCloseTime: string;
  bondAmount: number;
}

interface AdminRecommendationRequest {
  marketId: string;
  question: string;
  aiResolution: any;
  disputes: any[];
  evidence: any[];
}

export class BlockCastAIAgent {
  constructor(config?: BlockCastAIConfig) {
    console.log('⚠️ BlockCastAIAgent disabled during BSC migration');
  }

  async resolveMarket(request: MarketResolutionRequest): Promise<any> {
    console.log('⚠️ resolveMarket disabled - use direct Claude API');
    return {
      recommendation: 'INVALID',
      confidence: 0,
      reasoning: 'AI agent disabled during migration',
      evidence: []
    };
  }

  async processDispute(request: DisputeProcessingRequest): Promise<any> {
    console.log('⚠️ processDispute disabled - use direct Claude API');
    return {
      isValid: false,
      reasoning: 'Dispute processing disabled during migration'
    };
  }

  async recommendAdminDecision(request: AdminRecommendationRequest): Promise<any> {
    console.log('⚠️ recommendAdminDecision disabled - use direct Claude API');
    return {
      recommendation: 'INVALID',
      confidence: 0,
      reasoning: 'Admin recommendations disabled during migration'
    };
  }
}

export const blockcastAIAgent = new BlockCastAIAgent();
