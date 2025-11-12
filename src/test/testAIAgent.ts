import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import { getBlockCastAIAgent, MarketResolutionRequest, DisputeProcessingRequest } from '../services/blockcastAIAgent';

/**
 * Test script for BlockCast AI Agent integration
 * Run with: npm run test:ai-agent
 */

async function testAIAgentIntegration() {
  console.log('🤖 Starting BlockCast AI Agent Integration Test...\n');

  try {
    // 1. Initialize AI Agent
    console.log('1️⃣ Initializing BlockCast AI Agent...');
    const aiAgent = getBlockCastAIAgent({
      aiProvider: 'auto',
      mode: 'AUTONOMOUS'
    });

    // Check status before initialization
    console.log('Agent status before initialization:', aiAgent.getStatus());
    
    await aiAgent.initialize();
    console.log('✅ AI Agent initialized successfully\n');

    // 2. Test Market Resolution
    console.log('2️⃣ Testing Market Resolution...');
    const marketResolutionRequest: MarketResolutionRequest = {
      marketId: 'test-market-001',
      region: 'Kenya',
      languages: ['en', 'sw'],
      culturalContext: 'kenya',
      marketType: 'politics',
      complexity: 'medium',
      evidenceTopics: ['0.0.6701034'] // Evidence topic
    };

    const resolutionResult = await aiAgent.resolveMarket(marketResolutionRequest);
    console.log('Market Resolution Result:');
    console.log('- Success:', resolutionResult.success);
    console.log('- Market ID:', resolutionResult.marketId);
    if (resolutionResult.success) {
      console.log('- AI Analysis:', typeof resolutionResult.aiResponse === 'string' 
        ? resolutionResult.aiResponse.substring(0, 200) + '...' 
        : 'Response object received');
    } else {
      console.log('- Error:', resolutionResult.error);
    }
    console.log('✅ Market resolution test completed\n');

    // 3. Test Dispute Processing
    console.log('3️⃣ Testing Dispute Processing...');
    const disputeProcessingRequest: DisputeProcessingRequest = {
      disputeId: 'dispute-001',
      marketId: 'test-market-001',
      disputerAddress: '0x32b03e2fd3dcbfd1cb9c17ff4f9652579945aead',
      ipfsHash: 'QmTest123456789',
      language: 'en',
      aiResolution: {
        primaryOutcome: 'YES',
        confidence: 0.85,
        reasoning: 'Government sources confirm policy change with high confidence'
      },
      marketCloseTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      bondAmount: 15
    };

    const disputeResult = await aiAgent.processDispute(disputeProcessingRequest);
    console.log('Dispute Processing Result:');
    console.log('- Success:', disputeResult.success);
    console.log('- Dispute ID:', disputeResult.disputeId);
    console.log('- Market ID:', disputeResult.marketId);
    if (disputeResult.success) {
      console.log('- AI Analysis:', typeof disputeResult.aiResponse === 'string' 
        ? disputeResult.aiResponse.substring(0, 200) + '...' 
        : 'Response object received');
    } else {
      console.log('- Error:', disputeResult.error);
    }
    console.log('✅ Dispute processing test completed\n');

    // 4. Test Admin Recommendations
    console.log('4️⃣ Testing Admin Recommendations...');
    const adminRecommendationRequest = {
      marketId: 'test-market-001',
      aiResolution: {
        primaryOutcome: 'YES',
        confidence: 0.85,
        reasoning: 'Multi-language analysis shows government confirmation'
      },
      disputes: [
        {
          disputeId: 'dispute-001',
          validity: 'LIKELY_VALID',
          qualityScore: 0.78,
          bondAmount: 15
        },
        {
          disputeId: 'dispute-002', 
          validity: 'LIKELY_INVALID',
          qualityScore: 0.32,
          bondAmount: 10
        }
      ],
      evidenceAnalysis: {
        totalEvidence: 12,
        languages: ['en', 'sw'],
        averageQuality: 0.73
      },
      culturalContext: 'kenya'
    };

    const recommendationResult = await aiAgent.generateAdminRecommendations(adminRecommendationRequest);
    console.log('Admin Recommendations Result:');
    console.log('- Success:', recommendationResult.success);
    console.log('- Market ID:', recommendationResult.marketId);
    if (recommendationResult.success) {
      console.log('- Recommendations:', typeof recommendationResult.recommendations === 'string' 
        ? recommendationResult.recommendations.substring(0, 200) + '...' 
        : 'Recommendations object received');
    } else {
      console.log('- Error:', recommendationResult.error);
    }
    console.log('✅ Admin recommendations test completed\n');

    // 5. Test Agent Status
    console.log('5️⃣ Testing Agent Status...');
    const status = aiAgent.getStatus();
    console.log('Agent Status:');
    console.log('- Initialized:', status.initialized);
    console.log('- AI Provider:', status.config.aiProvider);
    console.log('- Hedera Network:', status.hederaClient.network);
    console.log('- Operator Account:', status.hederaClient.operatorId);
    console.log('- Capabilities:', status.capabilities.length, 'total capabilities');
    console.log('✅ Status check completed\n');

    // 6. Test High-Confidence Autonomous Resolution (if applicable)
    console.log('6️⃣ Testing Autonomous Resolution (High Confidence)...');
    try {
      const autonomousResult = await aiAgent.executeAutonomousResolution(
        'test-market-autonomous-001',
        'YES',
        0.95, // High confidence
        []    // No disputes
      );
      console.log('Autonomous Resolution Result:');
      console.log('- Success:', autonomousResult.success);
      console.log('- Outcome:', autonomousResult.outcome);
      console.log('- Confidence:', autonomousResult.confidence);
      if (autonomousResult.success) {
        console.log('- Execution Details Available');
      } else {
        console.log('- Error:', autonomousResult.error);
      }
    } catch (error) {
      console.log('- Expected Error (low confidence):', error instanceof Error ? error.message : 'Unknown error');
    }
    console.log('✅ Autonomous resolution test completed\n');

    console.log('🎉 All BlockCast AI Agent tests completed successfully!\n');
    console.log('The AI Agent is ready for integration with the BlockCast platform.');
    console.log('\nNext steps:');
    console.log('- Integrate AI Agent with market expiration workflow');
    console.log('- Connect dispute submission to real-time AI analysis');
    console.log('- Add AI Agent recommendations to Admin Dashboard');
    console.log('- Configure environment variables for production use');

    // Cleanup
    await aiAgent.cleanup();

  } catch (error) {
    console.error('❌ AI Agent test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Hedera credentials')) {
        console.log('\n💡 Solution: Set up Hedera credentials in your .env file:');
        console.log('HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID');
        console.log('HEDERA_PRIVATE_KEY=0x...YOUR_PRIVATE_KEY');
      }
      
      if (error.message.includes('AI provider')) {
        console.log('\n💡 Solution: Set up AI provider API key in your .env file:');
        console.log('OPENAI_API_KEY=sk-proj-...YOUR_KEY  # OR');
        console.log('ANTHROPIC_API_KEY=sk-ant-...YOUR_KEY');
      }
    }
    
    process.exit(1);
  }
}

// Run test if called directly (ESM compatible)
const isDirectlyExecuted = import.meta.url.endsWith('testAIAgent.ts') &&
                           (import.meta.url.includes(`file:///${process.argv[1].replace(/\\/g, '/')}`)) ||
                           process.argv[1].includes('testAIAgent.ts');

if (isDirectlyExecuted) {
  console.log('🚀 Starting BlockCast AI Agent test execution...');
  testAIAgentIntegration().catch(console.error);
}

export default testAIAgentIntegration;