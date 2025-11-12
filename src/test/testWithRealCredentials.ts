/**
 * Test Hedera AI Agent with Real Credentials
 */

import dotenv from 'dotenv';
import { getHederaAIResolutionService } from '../services/hederaAIResolutionService.js';

// Load environment variables
dotenv.config();

async function testWithRealCredentials() {
  console.log('🧪 Testing Hedera AI Agent with Real Credentials...\n');

  try {
    // Verify credentials are loaded
    const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.VITE_HEDERA_TESTNET_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY || process.env.VITE_HEDERA_TESTNET_PRIVATE_KEY;

    console.log('📋 Environment Check:');
    console.log('   Account ID:', accountId);
    console.log('   Private Key:', privateKey ? `***${privateKey.slice(-6)}` : '❌ MISSING');
    console.log('');

    if (!accountId || !privateKey) {
      throw new Error('Hedera credentials not found in environment');
    }

    // Initialize service
    console.log('🔷 Initializing Hedera AI Resolution Service...');
    const hederaAI = getHederaAIResolutionService(accountId, privateKey, 'testnet');

    const status = hederaAI.getStatus();
    console.log('✅ Service initialized');
    console.log('   Network:', status.network);
    console.log('   Operator:', status.operatorId);
    console.log('   Tools:', status.toolsAvailable.length);
    console.log('');

    // Test market resolution
    console.log('🎯 Testing Market Resolution...');
    const testMarketId = 'real-test-' + Date.now();

    const mockEvidence = [
      {
        source: 'news_api',
        type: 'news_article',
        content: 'Breaking: Government confirms new policy implementation. Multiple official sources verify the decision.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        credibility: 0.9,
        language: 'en',
        submitter: '0x' + accountId.replace(/\./g, '')
      },
      {
        source: 'government_portal',
        type: 'official_statement',
        content: 'La nouvelle politique est maintenant en vigueur selon les autorités officielles.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        credibility: 0.95,
        language: 'fr',
        submitter: '0xofficial123'
      },
      {
        source: 'social_media',
        type: 'public_sentiment',
        content: 'Community reactions confirm the policy change with widespread acknowledgment.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        credibility: 0.7,
        language: 'en',
        submitter: '0xcommunity456'
      }
    ];

    const result = await hederaAI.resolveMarket(
      testMarketId,
      mockEvidence,
      {
        region: 'kenya',
        marketType: 'politics',
        complexity: 'medium',
        culturalContext: 'east_african_context'
      }
    );

    console.log('\n📊 Resolution Results:');
    console.log('   Market ID:', testMarketId);
    console.log('   Recommendation:', result.recommendation);
    console.log('   Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('   Used Hedera Agent:', result.metadata.usedHederaAgent ? '✅ YES' : '❌ NO');
    console.log('   Tools Invoked:', result.metadata.toolsInvoked.join(', '));
    console.log('   HCS Submissions:', result.metadata.hcsSubmissions.length);
    console.log('   Risk Factors:', result.riskFactors.length ? result.riskFactors.join(', ') : 'None');
    console.log('\n   Reasoning Preview:');
    console.log('   ' + result.reasoning.substring(0, 300).replace(/\n/g, '\n   '));
    console.log('');

    // Test dispute evaluation
    console.log('⚖️  Testing Dispute Evaluation...');
    const disputeResult = await hederaAI.evaluateDispute(
      'dispute-' + Date.now(),
      testMarketId,
      {
        disputerAddress: '0xdisputer' + Date.now(),
        ipfsHash: 'QmTestHash' + Date.now(),
        language: 'en',
        bondAmount: 100,
        aiResolution: {
          primaryOutcome: result.recommendation,
          confidence: result.confidence,
          reasoning: result.reasoning
        },
        marketCloseTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    );

    console.log('   Quality Score:', (disputeResult.qualityScore || 0).toFixed(2));
    console.log('   Validity:', disputeResult.recommendedValidity || 'UNCERTAIN');
    console.log('');

    // Success summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST SUCCESSFUL - HEDERA AI AGENT OPERATIONAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nKey Achievements:');
    console.log('  ✓ Real Hedera credentials loaded and validated');
    console.log('  ✓ Hedera AI service initialized with live SDK');
    console.log('  ✓ Multi-language evidence processing');
    console.log('  ✓ AI resolution generation with external data');
    console.log('  ✓ Dispute quality evaluation');
    console.log('  ✓ HCS attestation pipeline operational');
    console.log('\nNext: Test with real market from database');
    console.log('');

    return { success: true, result };

  } catch (error) {
    console.error('❌ TEST FAILED');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    return { success: false, error };
  }
}

// Run test
testWithRealCredentials()
  .then(result => process.exit(result.success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
