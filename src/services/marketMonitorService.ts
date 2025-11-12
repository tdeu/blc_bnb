import { ethers } from 'ethers';
import { AnthropicClient } from './anthropicClient';
import { SupabaseService } from './supabaseService';
import { getBlockCastAIAgent, MarketResolutionRequest } from './blockcastAIAgent';
// Hedera imports removed - using BSC implementation
import { calculateThreeSignals, getResolutionScore, SignalScores } from './threeSignalCalculator';
import fs from 'fs';
import path from 'path';

// Market monitoring and automation service
export interface MarketInfo {
  id: string;
  contractAddress: string;
  endTime: Date;
  status: 'active' | 'expired' | 'resolved' | 'pending_resolution';
  question: string;
  creator: string;
  lastChecked: Date;
}

export interface ResolutionJob {
  marketId: string;
  contractAddress: string;
  scheduledAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
}

export class MarketMonitorService {
  private hederaClient: Client;
  private anthropicClient: AnthropicClient;
  private supabaseService: SupabaseService;
  private resolutionQueue: ResolutionJob[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Initialize Hedera client
    this.hederaClient = Client.forTestnet();
    this.hederaClient.setOperator(
      process.env.HEDERA_ACCOUNT_ID!,
      process.env.HEDERA_PRIVATE_KEY!
    );

    // Initialize Anthropic client (using our existing proxy)
    this.anthropicClient = new AnthropicClient();

    // Initialize Supabase service
    this.supabaseService = new SupabaseService();
  }

  /**
   * Start the market monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Market monitor is already running');
      return;
    }

    console.log('🚀 Starting BlockCast Market Monitor Service...');
    this.isRunning = true;

    // Check for expired markets every 60 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkExpiredMarkets();
      this.processResolutionQueue();
    }, 60000);

    console.log('✅ Market monitor service started');
    console.log('📊 Monitoring markets every 60 seconds');
    console.log('🔄 Processing resolution queue...');

    // Run initial check
    this.checkExpiredMarkets();
  }

  /**
   * Run one monitoring cycle immediately (manual tick)
   */
  async runOnce() {
    await this.checkExpiredMarkets();
    await this.processResolutionQueue();
    return this.getStatus();
  }

  /**
   * Stop the market monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Market monitor is not running');
      return;
    }

    console.log('🛑 Stopping Market Monitor Service...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isRunning = false;
    console.log('✅ Market monitor service stopped');
  }

  /**
   * Check for markets that have expired and need resolution
   */
  private async checkExpiredMarkets(): Promise<void> {
    try {
      console.log('🔍 Checking for expired markets...');

      // Get active markets (currently from localStorage, will upgrade to Supabase)
      const activeMarkets = await this.getActiveMarkets();

      const now = new Date();
      const expiredMarkets = activeMarkets.filter(market =>
        market.status === 'active' &&
        market.endTime <= now
      );

      console.log(`📊 Found ${expiredMarkets.length} expired markets out of ${activeMarkets.length} total`);

      for (const market of expiredMarkets) {
        await this.handleExpiredMarket(market);
      }

    } catch (error) {
      console.error('❌ Error checking expired markets:', error);
    }
  }

  /**
   * Handle a single expired market - start evidence submission period
   * NEW: Markets stay disputable indefinitely until 80% confidence threshold is met
   */
  private async handleExpiredMarket(market: MarketInfo): Promise<void> {
    console.log(`⏰ Processing expired market: ${market.id} - "${market.question}"`);

    try {
      const now = new Date();

      // Update market status to 'disputable' (allows evidence submission)
      // Set evidence_period_start to track when evidence collection began
      await this.supabaseService.updateMarketStatus(market.id, 'disputable', {
        evidence_period_start: now.toISOString(),
        expired_at: now.toISOString()
      });

      console.log(`📋 Market ${market.id} status changed to 'disputable'`);
      console.log(`📊 Evidence collection started: ${now.toISOString()}`);
      console.log(`⏱️  Evidence period: Indefinite (minimum 7 days, until 80% confidence reached)`);
      console.log(`🎯 Resolution threshold: 80% confidence minimum`);
      console.log(`⚠️  Refund option available after 30 days if confidence never reaches 80%`);

      // NEW BEHAVIOR: Do NOT automatically schedule resolution
      // Markets will stay disputable until admin manually triggers resolution
      // when confidence >= 80% (after minimum 7 days)
      console.log(`✋ No automatic resolution scheduled - admin will manually trigger when ready`);

    } catch (error) {
      console.error(`❌ Error handling expired market ${market.id}:`, error);
    }
  }

  /**
   * Process the resolution queue - only process jobs whose evidence period has ended
   */
  private async processResolutionQueue(): Promise<void> {
    const now = new Date();
    const pendingJobs = this.resolutionQueue.filter(job =>
      job.status === 'pending' && job.scheduledAt <= now
    );

    if (pendingJobs.length === 0) {
      // Check if there are jobs waiting for evidence period to end
      const waitingJobs = this.resolutionQueue.filter(job =>
        job.status === 'pending' && job.scheduledAt > now
      );
      if (waitingJobs.length > 0) {
        const nextJob = waitingJobs.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
        const waitTime = Math.ceil((nextJob.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        console.log(`⏳ ${waitingJobs.length} markets in evidence period. Next resolution in ${waitTime} hours`);
      }
      return;
    }

    console.log(`🔄 Processing ${pendingJobs.length} resolution jobs (evidence period ended)...`);

    for (const job of pendingJobs.slice(0, 3)) { // Process max 3 at a time
      await this.processResolutionJob(job);
    }
  }

  /**
   * Process a single resolution job
   */
  private async processResolutionJob(job: ResolutionJob): Promise<void> {
    console.log(`🤖 Processing resolution for market ${job.marketId}...`);

    try {
      job.status = 'processing';
      job.attempts += 1;

      // Step 1: Get market data
      const marketData = await this.getMarketData(job.marketId);
      if (!marketData) {
        throw new Error(`Market data not found for ${job.marketId}`);
      }

      // Step 2: Get evidence from HCS (currently mock, will be real later)
      const evidence = await this.getMarketEvidence(job.marketId);

      // Step 3: Get AI resolution analysis
      const aiAnalysis = await this.getAIResolution(marketData, evidence);

      console.log(`🧠 AI Analysis for ${job.marketId}:`, {
        confidence: aiAnalysis.confidence,
        recommendation: aiAnalysis.recommendation,
        reasoning: aiAnalysis.reasoning?.substring(0, 100) + '...'
      });

      // Step 4: Execute resolution based on confidence
      const resolutionResult = await this.executeResolution(job, aiAnalysis);

      if (resolutionResult.success) {
        job.status = 'completed';
        console.log(`✅ Market ${job.marketId} resolved successfully`);
      } else {
        throw new Error(resolutionResult.error || 'Resolution execution failed');
      }

    } catch (error) {
      console.error(`❌ Resolution job failed for ${job.marketId}:`, error);

      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts < 3) {
        job.status = 'pending'; // Retry
        console.log(`🔄 Will retry resolution for ${job.marketId} (attempt ${job.attempts + 1}/3)`);
      } else {
        job.status = 'failed';
        console.log(`💀 Resolution permanently failed for ${job.marketId} after 3 attempts`);

        // TODO: Alert administrators
        await this.alertAdministrators(job);
      }
    }
  }

  /**
   * Get active markets (currently from localStorage, will upgrade to database)
   */
  private async getActiveMarkets(): Promise<MarketInfo[]> {
    try {
      return await this.supabaseService.getActiveMarkets();
    } catch (error) {
      console.error('❌ Failed to get active markets from Supabase, using fallback data:', error);

      // Fallback to mock data if Supabase fails
      const fallbackMarkets: MarketInfo[] = [
        {
          id: 'real-madrid-vs-manchester',
          contractAddress: process.env.CONTRACT_PREDICTION_MARKET_FACTORY!,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'active',
          question: 'Real Madrid is a better team than Manchester United',
          creator: '0x123...',
          lastChecked: new Date()
        },
        {
          id: 'jesus-existence',
          contractAddress: process.env.CONTRACT_PREDICTION_MARKET_FACTORY!,
          endTime: new Date(Date.now() - 60 * 60 * 1000),
          status: 'active',
          question: 'Has Jesus really existed?',
          creator: '0x456...',
          lastChecked: new Date()
        },
        {
          id: 'ai-revolution-2024',
          contractAddress: process.env.CONTRACT_PREDICTION_MARKET_FACTORY!,
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          status: 'active',
          question: 'Will AI agents become mainstream by end of 2024?',
          creator: '0x789...',
          lastChecked: new Date()
        }
      ];

      return fallbackMarkets;
    }
  }

  /**
   * Get market data
   */
  private async getMarketData(marketId: string): Promise<MarketInfo | null> {
    try {
      return await this.supabaseService.getMarket(marketId);
    } catch (error) {
      console.error(`❌ Failed to get market ${marketId} from Supabase:`, error);
      // Fallback to searching in active markets
      const markets = await this.getActiveMarkets();
      return markets.find(m => m.id === marketId) || null;
    }
  }

  /**
   * Get evidence for a market from Supabase and HCS
   */
  private async getMarketEvidence(marketId: string): Promise<any[]> {
    console.log(`📄 Fetching evidence for market ${marketId} from database + HCS...`);

    const combined: any[] = [];

    try {
      // 1) Supabase evidence
      const evidence = await this.supabaseService.getMarketEvidence(marketId);
      for (const e of evidence) {
        combined.push({
          source: 'supabase',
          type: e.evidence_type,
          content: e.content,
          timestamp: new Date(e.created_at),
          credibility: e.credibility_score || 0.5,
          language: e.language,
          submitter: e.submitter_address
        });
      }
    } catch (err) {
      console.warn(`⚠️ Failed to load Supabase evidence for ${marketId}:`, err);
    }

    try {
      // 2) HCS evidence via Mirror Node
      const config = null;
      const hcs = new HCSService(config);
      const hcsEvidence = await hcs.getMarketEvidence(marketId);
      for (const msg of hcsEvidence) {
        combined.push({
          source: 'hcs',
          type: msg.metadata?.evidenceType || 'hcs_evidence',
          content: msg.ipfsHash || '[ipfs]',
          timestamp: new Date(msg.timestamp),
          credibility: 0.6,
          language: 'en',
          submitter: msg.submitter
        });
      }
    } catch (err) {
      console.warn(`⚠️ Failed to load HCS evidence for ${marketId}:`, err);
    }

    if (combined.length === 0) {
      // Fallback mock evidence (keeps pipeline operational)
      console.log(`ℹ️ No evidence found for ${marketId}, using mock evidence`);
      combined.push(
        {
          source: 'mock',
          type: 'user_submission',
          content: 'Statistical analysis shows clear performance metrics',
          timestamp: new Date(),
          credibility: 0.8,
          language: 'en'
        },
        {
          source: 'mock',
          type: 'external_source',
          content: 'Recent match results and trophies comparison',
          timestamp: new Date(),
          credibility: 0.9,
          language: 'en'
        }
      );
    }

    // Sort by timestamp ascending
    combined.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
    console.log(`✅ Evidence items collected: ${combined.length}`);
    return combined;
  }

  /**
   * Get AI resolution analysis using ENHANCED THREE-TIER SYSTEM
   * Priority: Three-Signal > Hedera AI Agent (Direct Tools) > BlockCast AI Agent > Fallback
   */
  private async getAIResolution(marketData: MarketInfo, evidence: any[]): Promise<any> {
    try {
      console.log(`🎯 Using ENHANCED THREE-TIER AI SYSTEM for market ${marketData.id} resolution...`);

      // STEP 1: Try three-signal analysis first
      let threeSignalResult: SignalScores | null = null;
      try {
        // Check if we already have a cached three-signal score
        threeSignalResult = await getResolutionScore(marketData.id);

        if (!threeSignalResult) {
          // Calculate fresh three-signal analysis
          console.log(`📊 Calculating fresh three-signal analysis for ${marketData.id}...`);
          threeSignalResult = await calculateThreeSignals(marketData.id);
        } else {
          console.log(`✅ Using cached three-signal analysis for ${marketData.id}`);
        }

        // Convert three-signal result to AI analysis format
        if (threeSignalResult) {
          const recommendation = threeSignalResult.combined.recommendedOutcome;
          const confidence = threeSignalResult.combined.confidence / 100; // Convert to 0-1 range

          console.log(`✅ Three-Signal Analysis Complete:`, {
            recommendation,
            confidence,
            totalScore: threeSignalResult.combined.totalScore,
            aligned: threeSignalResult.combined.allSignalsAligned
          });

          return {
            recommendation,
            confidence,
            reasoning: `Three-Signal Analysis (${threeSignalResult.combined.totalScore.toFixed(1)}/108 points):
- Betting Signal: ${threeSignalResult.betting.score.toFixed(1)}/25 (${threeSignalResult.betting.percentage.toFixed(1)}% ${threeSignalResult.betting.percentage > 50 ? 'YES' : 'NO'})
- Evidence Signal: ${threeSignalResult.evidence.score.toFixed(1)}/45 (${threeSignalResult.evidence.percentage.toFixed(1)}% ${threeSignalResult.evidence.percentage > 50 ? 'YES' : 'NO'})
- API Signal: ${threeSignalResult.api.score.toFixed(1)}/30 (${threeSignalResult.api.percentage.toFixed(1)}% ${threeSignalResult.api.percentage > 50 ? 'YES' : 'NO'})
${threeSignalResult.combined.allSignalsAligned ? '✅ All signals aligned (+8 bonus)' : '⚠️ Signals not fully aligned'}`,
            riskFactors: [
              ...threeSignalResult.betting.warnings,
              ...threeSignalResult.evidence.warnings,
              ...threeSignalResult.api.warnings
            ],
            threeSignalData: threeSignalResult,
            usedThreeSignalSystem: true
          };
        }
      } catch (threeSignalError) {
        console.warn(`⚠️ Three-Signal System failed, falling back to Hedera AI Agent:`, threeSignalError);
      }

      // STEP 2: Try Hedera AI Agent with direct tool invocation
      try {
        console.log(`🔷 Using Hedera AI Agent (direct tools) for market ${marketData.id} resolution...`);

        const hederaAI = getHederaAIResolutionService();

        const hederaResult = await hederaAI.resolveMarket(
          marketData.id,
          evidence,
          {
            region: 'africa',
            marketType: 'general',
            complexity: evidence.length > 5 ? 'high' : evidence.length > 2 ? 'medium' : 'low',
            culturalContext: 'general_african_context'
          }
        );

        if (hederaResult.metadata.usedHederaAgent) {
          console.log(`✅ Hedera AI Agent resolution complete:`, {
            recommendation: hederaResult.recommendation,
            confidence: hederaResult.confidence,
            toolsInvoked: hederaResult.metadata.toolsInvoked.length,
            hcsSubmissions: hederaResult.metadata.hcsSubmissions.length
          });

          return {
            recommendation: hederaResult.recommendation,
            confidence: hederaResult.confidence,
            reasoning: hederaResult.reasoning,
            riskFactors: hederaResult.riskFactors,
            hederaAgentData: hederaResult,
            usedHederaAgent: true
          };
        }
      } catch (hederaError) {
        console.warn(`⚠️ Hedera AI Agent failed, falling back to BlockCast AI Agent:`, hederaError);
      }

      // STEP 3: Fallback to BlockCast AI Agent (LangChain)
      console.log(`🤖 Using BlockCast AI Agent for market ${marketData.id} resolution...`);

      // Get the BlockCast AI Agent instance
      const aiAgent = getBlockCastAIAgent();

      // Prepare the market resolution request
      const resolutionRequest: MarketResolutionRequest = {
        marketId: marketData.id,
        region: 'africa', // Default to Africa for BlockCast
        languages: ['en', 'fr', 'sw', 'ar'], // Multi-language support
        evidenceTopics: [process.env.HCS_EVIDENCE_TOPIC || 'evidence-topic'],
        culturalContext: 'general_african_context',
        marketType: 'general',
        complexity: evidence.length > 5 ? 'high' : evidence.length > 2 ? 'medium' : 'low',
        timeWindowStart: marketData.endTime.toISOString(),
        timeWindowEnd: new Date().toISOString()
      };

      // Call the sophisticated AI agent
      const aiResult = await aiAgent.resolveMarket(resolutionRequest);

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'AI Agent resolution failed');
      }

      // Parse the AI response - try to extract structured data
      const aiResponse = aiResult.aiResponse;
      let recommendation = 'INVALID';
      let confidence = 0.5;
      let reasoning = 'AI analysis completed via BlockCast Agent';
      let riskFactors: string[] = [];

      // Try to parse structured response or extract from text
      if (typeof aiResponse === 'string') {
        // Extract recommendation
        if (aiResponse.toLowerCase().includes('yes') && !aiResponse.toLowerCase().includes('no')) {
          recommendation = 'YES';
        } else if (aiResponse.toLowerCase().includes('no') && !aiResponse.toLowerCase().includes('yes')) {
          recommendation = 'NO';
        }

        // Extract confidence score (look for patterns like "confidence: 0.85" or "85%")
        const confidenceMatch = aiResponse.match(/confidence[:\s]*([0-9.]+)/i) ||
                              aiResponse.match(/([0-9.]+)%/);
        if (confidenceMatch) {
          const conf = parseFloat(confidenceMatch[1]);
          confidence = conf > 1 ? conf / 100 : conf; // Handle percentage format
        }

        // Use full response as reasoning
        reasoning = aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : '');
      } else if (typeof aiResponse === 'object') {
        // Handle structured response
        recommendation = aiResponse.recommendation || aiResponse.outcome || 'INVALID';
        confidence = aiResponse.confidence || 0.5;
        reasoning = aiResponse.reasoning || aiResponse.analysis || 'AI analysis completed';
        riskFactors = aiResponse.riskFactors || aiResponse.risks || [];
      }

      // Ensure recommendation is valid
      recommendation = recommendation.toUpperCase();
      if (!['YES', 'NO', 'INVALID'].includes(recommendation)) {
        recommendation = 'INVALID';
        confidence = 0.1;
      }

      // Clamp confidence to valid range
      confidence = Math.max(0, Math.min(1, confidence));

      console.log(`✅ BlockCast AI Analysis for ${marketData.id}:`, {
        recommendation,
        confidence,
        reasoning: reasoning.substring(0, 100) + '...'
      });

      return {
        recommendation,
        confidence,
        reasoning,
        riskFactors,
        aiAgentResponse: aiResult,
        usedBlockCastAgent: true
      };

    } catch (error) {
      console.error('❌ All AI systems failed, falling back to simple analysis:', error);

      // STEP 4: Final fallback to simple evidence-based analysis
      const evidenceSupportsYes = evidence.filter(e =>
        e.content.toLowerCase().includes('yes') ||
        e.content.toLowerCase().includes('true') ||
        e.content.toLowerCase().includes('confirm')
      ).length;

      const evidenceSupportsNo = evidence.filter(e =>
        e.content.toLowerCase().includes('no') ||
        e.content.toLowerCase().includes('false') ||
        e.content.toLowerCase().includes('deny')
      ).length;

      let recommendation = 'INVALID';
      let confidence = 0.3;

      if (evidenceSupportsYes > evidenceSupportsNo) {
        recommendation = 'YES';
        confidence = Math.min(0.7, 0.5 + (evidenceSupportsYes - evidenceSupportsNo) * 0.1);
      } else if (evidenceSupportsNo > evidenceSupportsYes) {
        recommendation = 'NO';
        confidence = Math.min(0.7, 0.5 + (evidenceSupportsNo - evidenceSupportsYes) * 0.1);
      }

      return {
        recommendation,
        confidence,
        reasoning: `Fallback analysis: ${evidenceSupportsYes} supporting, ${evidenceSupportsNo} opposing evidence. All AI systems failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskFactors: ['ALL_AI_SYSTEMS_FAILED', 'FALLBACK_ANALYSIS'],
        usedBlockCastAgent: false,
        fallbackReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute resolution based on AI analysis
   */
  private async executeResolution(job: ResolutionJob, aiAnalysis: any): Promise<{success: boolean, error?: string}> {
    console.log(`⚖️ Executing resolution for ${job.marketId}...`);

    try {
      // Decision tree based on confidence
      if (aiAnalysis.confidence >= 0.9) {
        // High confidence: Auto-resolve
        console.log(`🚀 Auto-resolving market ${job.marketId} (confidence: ${aiAnalysis.confidence})`);
        return await this.executeSmartContractResolution(job, aiAnalysis);

      } else if (aiAnalysis.confidence >= 0.7) {
        // Medium confidence: Queue for admin review
        console.log(`⏳ Queuing market ${job.marketId} for admin review (confidence: ${aiAnalysis.confidence})`);
        return await this.queueForAdminReview(job, aiAnalysis);

      } else {
        // Low confidence: Require manual resolution
        console.log(`👨‍💼 Market ${job.marketId} requires manual resolution (confidence: ${aiAnalysis.confidence})`);
        return await this.requireManualResolution(job, aiAnalysis);
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution execution failed'
      };
    }
  }

  /**
   * Prepare market for resolution (database-only, contract calls happen from frontend)
   * This service analyzes evidence and prepares AI recommendation, but does NOT execute on-chain
   */
  private async executeSmartContractResolution(job: ResolutionJob, aiAnalysis: any): Promise<{success: boolean, error?: string}> {
    console.log(`📝 Preparing resolution recommendation for ${job.marketId}...`);

    try {
      if (!job.contractAddress || job.contractAddress === 'pending') {
        console.warn(`⚠️ Market ${job.marketId} has no contract address - database-only resolution`);
      }

      // Map AI recommendation to contract enum
      const rec = String(aiAnalysis.recommendation || '').toUpperCase();
      if (!['YES', 'NO'].includes(rec)) {
        // If AI suggests INVALID, we skip on-chain and mark for manual review
        console.warn(`AI suggested INVALID or unknown outcome for ${job.marketId}. Queueing for admin review.`);
        await this.queueForAdminReview(job, aiAnalysis);
        return { success: true };
      }

      // Update market status to 'pending_resolution' with AI recommendation
      // This signals to admins that AI has analyzed the evidence and recommends a resolution
      // Admin can then execute preliminaryResolve() from the frontend
      await this.supabaseService.updateMarketStatus(job.marketId, 'pending_resolution', {
        ai_confidence_score: aiAnalysis.confidence,
        ai_recommendation: rec === 'YES' ? 'YES' : 'NO',
        ai_reasoning: aiAnalysis.reasoning?.slice(0, 1000) || null,
        ai_risk_factors: aiAnalysis.riskFactors || [],
        resolution_data: aiAnalysis,
        ready_for_preliminary_resolve: true,
        analysis_completed_at: new Date().toISOString()
      });

      console.log(`✅ AI analysis complete for ${job.marketId}:`);
      console.log(`   Recommendation: ${rec} (confidence: ${aiAnalysis.confidence})`);
      console.log(`   Status: pending_resolution (awaiting admin to call preliminaryResolve)`);

      // Post AI attestation to HCS for transparency
      try {
        const config = null;
        const hcs = new HCSService(config);
        await hcs.submitAttestation({
          type: 'ai_attestation',
          marketId: job.marketId,
          outcome: rec === 'YES' ? 'yes' : 'no',
          confidence: aiAnalysis.confidence,
          reasoning: aiAnalysis.reasoning || '',
          evidenceReviewed: [],
          aiAgentId: 'blockcast-monitor-service',
          timestamp: new Date().toISOString()
        });
        console.log(`📝 AI attestation submitted to HCS for transparency`);
      } catch (hcsErr) {
        console.warn('HCS attestation submission failed (non-blocking):', hcsErr);
      }

      return { success: true };

    } catch (error) {
      console.error(`❌ Resolution preparation failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution preparation failed'
      };
    }
  }

  /**
   * Queue for admin review (medium confidence or uncertain outcomes)
   */
  private async queueForAdminReview(job: ResolutionJob, aiAnalysis: any): Promise<{success: boolean}> {
    console.log(`📋 Queuing ${job.marketId} for admin review (medium confidence)...`);

    try {
      await this.supabaseService.updateMarketStatus(job.marketId, 'pending_resolution', {
        ai_confidence_score: aiAnalysis.confidence,
        ai_recommendation: aiAnalysis.recommendation || 'UNCERTAIN',
        ai_reasoning: aiAnalysis.reasoning?.slice(0, 1000) || null,
        ai_risk_factors: aiAnalysis.riskFactors || [],
        resolution_data: aiAnalysis,
        requires_admin_review: true,
        analysis_completed_at: new Date().toISOString(),
        admin_review_reason: `Medium confidence (${aiAnalysis.confidence}) - requires human verification`
      });

      console.log(`✅ Market ${job.marketId} queued for admin review`);
      console.log(`   Confidence: ${aiAnalysis.confidence} (threshold: 0.7-0.9)`);
      console.log(`   Recommendation: ${aiAnalysis.recommendation}`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to queue for admin review:`, error);
      return { success: false };
    }
  }

  /**
   * Require manual resolution (low confidence - human decision needed)
   */
  private async requireManualResolution(job: ResolutionJob, aiAnalysis: any): Promise<{success: boolean}> {
    console.log(`👨‍💼 Market ${job.marketId} requires manual resolution (low confidence)`);

    try {
      await this.supabaseService.updateMarketStatus(job.marketId, 'pending_resolution', {
        ai_confidence_score: aiAnalysis.confidence,
        ai_recommendation: 'MANUAL_REVIEW_REQUIRED',
        ai_reasoning: aiAnalysis.reasoning?.slice(0, 1000) || null,
        ai_risk_factors: [...(aiAnalysis.riskFactors || []), 'LOW_CONFIDENCE'],
        resolution_data: aiAnalysis,
        requires_admin_review: true,
        requires_manual_resolution: true,
        analysis_completed_at: new Date().toISOString(),
        admin_review_reason: `Low confidence (${aiAnalysis.confidence}) - AI cannot determine outcome reliably`
      });

      console.log(`⚠️ Market ${job.marketId} flagged for MANUAL RESOLUTION`);
      console.log(`   Confidence: ${aiAnalysis.confidence} (below 0.7 threshold)`);
      console.log(`   Admin must review evidence and make decision`);

      // TODO: Send notification to admins (email/Discord/Slack)

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to flag for manual resolution:`, error);
      return { success: false };
    }
  }

  /**
   * Update market status in Supabase
   */
  private async updateMarketStatus(marketId: string, status: MarketInfo['status']): Promise<void> {
    try {
      await this.supabaseService.updateMarketStatus(marketId, status);
    } catch (error) {
      console.error(`❌ Failed to update market ${marketId} status in Supabase:`, error);
      console.log(`📊 Market ${marketId} status would be: ${status} (update failed)`);
    }
  }

  /**
   * Alert administrators about failed resolutions
   */
  private async alertAdministrators(job: ResolutionJob): Promise<void> {
    console.log(`🚨 ALERT: Market resolution failed permanently for ${job.marketId}`);
    console.log(`Error: ${job.error}`);
    console.log(`Attempts: ${job.attempts}`);
    // TODO: Implement real alerting (email, Slack, etc.)
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.resolutionQueue.length,
      pendingJobs: this.resolutionQueue.filter(j => j.status === 'pending').length,
      processingJobs: this.resolutionQueue.filter(j => j.status === 'processing').length,
      completedJobs: this.resolutionQueue.filter(j => j.status === 'completed').length,
      failedJobs: this.resolutionQueue.filter(j => j.status === 'failed').length
    };
  }
}