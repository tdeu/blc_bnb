// Script to manually trigger on-chain resolution for a pending market
// Run with: node trigger-manual-resolution.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerManualResolution() {
  const marketId = 'market_1763236872127_yt2jrl1d6';

  console.log(`🔧 Triggering manual resolution for market ${marketId}...\n`);

  // Get market data
  const { data: market, error } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (error) {
    console.error('❌ Error fetching market:', error);
    return;
  }

  if (!market) {
    console.error('❌ Market not found');
    return;
  }

  console.log('📊 Market Details:');
  console.log(`   Claim: ${market.claim}`);
  console.log(`   Contract: ${market.contract_address}`);
  console.log(`   Status: ${market.status}`);
  console.log(`   Resolution: ${market.resolution_data?.outcome?.toUpperCase()}`);
  console.log(`   Confidence: ${market.resolution_data?.confidence}%`);
  console.log('');

  if (market.status !== 'pending_payout') {
    console.warn(`⚠️ Market status is '${market.status}' - expected 'pending_payout'`);
    console.log('Proceeding anyway...\n');
  }

  // Import resolution service
  console.log('🔐 Calling resolveMarketWithAI on blockchain...');
  console.log('⚠️ This requires admin signer to be configured\n');

  // Dynamic import to use ES modules
  const { resolutionService } = await import('./src/utils/resolutionService.ts');

  try {
    const outcome = market.resolution_data?.outcome || market.resolution_data?.final_outcome;
    const confidence = market.resolution_data?.confidence || 80;

    console.log(`📝 Resolving with outcome: ${outcome?.toUpperCase()}, confidence: ${confidence}%`);

    const result = await resolutionService.resolveMarketWithAI(
      marketId,
      outcome,
      confidence
    );

    console.log('\n✅ Market resolved on blockchain successfully!');
    console.log(`   Transaction: ${result.transactionId || 'N/A'}`);
    console.log(`   Gas Used: ${result.gasUsed || 'N/A'}`);

    // Update market status to 'resolved'
    console.log('\n📝 Updating database status to "resolved"...');
    const { error: updateError } = await supabase
      .from('approved_markets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', marketId);

    if (updateError) {
      console.error('❌ Error updating status:', updateError);
    } else {
      console.log('✅ Market marked as resolved in database');
      console.log('\n🎉 COMPLETE! Users can now claim winnings via redeem()');
    }

  } catch (error) {
    console.error('\n❌ Error resolving market:', error);
    console.log('\nPossible issues:');
    console.log('1. Admin signer not configured (.env missing ADMIN_PRIVATE_KEY)');
    console.log('2. Insufficient gas/funds in admin wallet');
    console.log('3. Market already resolved on-chain');
    console.log('4. Network connectivity issues');
  }
}

triggerManualResolution();
