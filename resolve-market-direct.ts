// Direct resolution script using TypeScript
import { resolutionService } from './src/utils/resolutionService';
import { supabase } from './src/utils/supabase';

async function resolveMarketDirect() {
  const marketId = 'market_1763236872127_yt2jrl1d6';

  console.log(`🔧 Resolving market ${marketId} on-chain...\n`);

  try {
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

    const outcome = market.resolution_data?.outcome || market.resolution_data?.final_outcome;
    const confidence = market.resolution_data?.confidence || 80;

    console.log(`   Resolution: ${outcome?.toUpperCase()}`);
    console.log(`   Confidence: ${confidence}%\n`);

    // Resolve on blockchain
    console.log('🔐 Calling resolveMarketWithAI on blockchain...');
    const result = await resolutionService.resolveMarketWithAI(
      marketId,
      outcome,
      confidence
    );

    console.log('\n✅ Market resolved on blockchain successfully!');
    console.log(`   Transaction: ${result.transactionId || 'N/A'}`);
    console.log(`   Block: ${result.blockNumber || 'N/A'}`);

    // Update database status to 'resolved'
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

  } catch (error: any) {
    console.error('\n❌ Error resolving market:', error);
    console.log('\n💡 Possible issues:');
    console.log('1. Admin signer not configured (.env missing ADMIN_PRIVATE_KEY)');
    console.log('2. Insufficient gas/funds in admin wallet');
    console.log('3. Market already resolved on-chain');
    console.log('4. Network connectivity issues');

    if (error.message) {
      console.log(`\nError message: ${error.message}`);
    }
  }
}

resolveMarketDirect();
