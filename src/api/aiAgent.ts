// API service to connect frontend to BlockCast AI Agent
import { getBlockCastAIAgent, MarketResolutionRequest, DisputeProcessingRequest, AdminRecommendationRequest } from '../services/blockcastAIAgent';

class AIAgentAPI {
  private agent = getBlockCastAIAgent({
    aiProvider: 'auto',
    mode: 'AUTONOMOUS'
  });

  async initialize() {
    try {
      await this.agent.initialize();
      return { success: true, status: this.agent.getStatus() };
    } catch (error) {
      console.error('AI Agent initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async resolveMarket(request: MarketResolutionRequest) {
    try {
      return await this.agent.resolveMarket(request);
    } catch (error) {
      console.error('Market resolution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Market resolution failed'
      };
    }
  }

  async processDispute(request: DisputeProcessingRequest) {
    try {
      return await this.agent.processDispute(request);
    } catch (error) {
      console.error('Dispute processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Dispute processing failed'
      };
    }
  }

  async generateAdminRecommendations(request: AdminRecommendationRequest) {
    try {
      return await this.agent.generateAdminRecommendations(request);
    } catch (error) {
      console.error('Admin recommendations failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Admin recommendations failed'
      };
    }
  }

  async executeAutonomousResolution(marketId: string, outcome: 'YES' | 'NO' | 'INVALID', confidence: number, disputes: any[] = []) {
    try {
      return await this.agent.executeAutonomousResolution(marketId, outcome, confidence, disputes);
    } catch (error) {
      console.error('Autonomous resolution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Autonomous resolution failed'
      };
    }
  }

  getStatus() {
    return this.agent.getStatus();
  }

  async cleanup() {
    await this.agent.cleanup();
  }
}

// Export singleton
export const aiAgentAPI = new AIAgentAPI();