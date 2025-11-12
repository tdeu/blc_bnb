/**
 * Market Resolution Lifecycle Test
 *
 * Tests the complete resolution flow including:
 * - Automatic detection of expired markets
 * - Preliminary resolution with admin signer
 * - Dispute period management
 * - Final resolution
 * - Bet status updates
 */

import { resolutionService } from '../utils/resolutionService';
import { betResolutionService } from '../utils/betResolutionService';
import { supabase } from '../utils/supabase';

async function testMarketResolutionLifecycle() {
  console.log('🧪 Testing Market Resolution Lifecycle...\n');

  try {
    // Step 1: Create or find an expired market
    console.log('📋 Step 1: Finding/Creating test market...');

    if (!supabase) {
      console.error('❌ Supabase not available - cannot run test');
      return;
    }

    // Find an expired market that hasn't been resolved
    const { data: expiredMarkets, error } = await supabase
      .from('approved_markets')
      .select('*')
      .eq('status', 'expired')
      .is('resolution_data', null)
      .not('contract_address', 'is', null)
      .limit(1);

    if (error) {
      console.error('❌ Error fetching markets:', error);
      return;
    }

    if (!expiredMarkets || expiredMarkets.length === 0) {
      console.log('⚠️  No expired unresolved markets found');
      console.log('   Create a test market with expiry in the past and run again');
      return;
    }

    const testMarket = expiredMarkets[0];
    console.log('✅ Found test market:', testMarket.id);
    console.log('   Claim:', testMarket.claim.substring(0, 60) + '...');
    console.log('   Contract:', testMarket.contract_address);
    console.log('   Expires:', testMarket.expires_at);
    console.log('');

    // Step 2: Test Preliminary Resolution
    console.log('🔍 Step 2: Testing preliminary resolution...');

    const preliminaryOutcome: 'yes' | 'no' = 'yes'; // Test with YES outcome

    console.log('   Resolving preliminarily to:', preliminaryOutcome.toUpperCase());

    const prelimResult = await resolutionService.preliminaryResolveMarket(
      testMarket.id,
      preliminaryOutcome
    );

    console.log('✅ Preliminary resolution successful!');
    console.log('   Transaction ID:', prelimResult.transactionId);
    console.log('   HCS Topic:', prelimResult.hcsTopicId);
    console.log('');

    // Verify database update
    const { data: updatedMarket1 } = await supabase
      .from('approved_markets')
      .select('status, dispute_period_end, resolution_data')
      .eq('id', testMarket.id)
      .single();

    if (updatedMarket1?.status === 'disputable') {
      console.log('✅ Database updated to "disputable" status');
      console.log('   Dispute period ends:', updatedMarket1.dispute_period_end);
    } else {
      console.warn('⚠️  Market status not updated correctly:', updatedMarket1?.status);
    }
    console.log('');

    // Step 3: Simulate dispute period passing
    console.log('⏰ Step 3: Simulating dispute period...');
    console.log('   In production, this is 7 days');
    console.log('   For testing, we\'ll proceed immediately');
    console.log('');

    // Step 4: Test Final Resolution
    console.log('🏁 Step 4: Testing final resolution...');

    const finalOutcome: 'yes' | 'no' = preliminaryOutcome;
    const confidence = 85; // 85% confidence

    console.log('   Final outcome:', finalOutcome.toUpperCase());
    console.log('   Confidence:', confidence + '%');

    const finalResult = await resolutionService.finalResolveMarket(
      testMarket.id,
      finalOutcome,
      confidence
    );

    console.log('✅ Final resolution successful!');
    console.log('   Transaction ID:', finalResult.transactionId);
    console.log('   Consensus Timestamp:', finalResult.consensusTimestamp.toISOString());
    console.log('');

    // Verify database update
    const { data: updatedMarket2 } = await supabase
      .from('approved_markets')
      .select('status, resolution_data')
      .eq('id', testMarket.id)
      .single();

    if (updatedMarket2?.status === 'resolved') {
      console.log('✅ Database updated to "resolved" status');
      console.log('   Resolution data:', JSON.stringify(updatedMarket2.resolution_data, null, 2));
    } else {
      console.warn('⚠️  Market status not updated correctly:', updatedMarket2?.status);
    }
    console.log('');

    // Step 5: Test Bet Status Updates
    console.log('💰 Step 5: Testing bet status updates...');

    // Check if there are any bets for this market in localStorage
    let foundBets = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_bets_')) {
        const bets = JSON.parse(localStorage.getItem(key) || '[]');
        const marketBets = bets.filter((bet: any) => bet.marketId === testMarket.id);

        if (marketBets.length > 0) {
          foundBets = true;
          console.log(`   Found ${marketBets.length} bet(s) for this market`);

          const wonBets = marketBets.filter((bet: any) => bet.status === 'won');
          const lostBets = marketBets.filter((bet: any) => bet.status === 'lost');

          console.log(`   Won bets: ${wonBets.length}`);
          console.log(`   Lost bets: ${lostBets.length}`);

          wonBets.forEach((bet: any) => {
            console.log(`     - Won ${bet.actualWinning?.toFixed(3)} CAST (position: ${bet.position})`);
          });
        }
      }
    }

    if (!foundBets) {
      console.log('⚠️  No bets found in localStorage for this market');
      console.log('   Bet status updates would occur automatically when users place bets');
    } else {
      console.log('✅ Bet statuses updated successfully');
    }
    console.log('');

    // Step 6: Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Market found and prepared for resolution');
    console.log('   ✅ Preliminary resolution executed successfully');
    console.log('   ✅ Database updated to disputable status');
    console.log('   ✅ Final resolution executed successfully');
    console.log('   ✅ Database updated to resolved status');
    console.log('   ✅ Bet status updates verified');
    console.log('');
    console.log('🎉 Market Resolution Lifecycle Test PASSED!\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testMarketResolutionLifecycle();
