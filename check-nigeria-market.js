// Check the Nigeria elections market
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMarket() {
  console.log('🔍 Searching for Nigeria elections market...\n');

  const { data: markets, error } = await supabase
    .from('approved_markets')
    .select('*')
    .ilike('claim', '%Nigeria%elections%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!markets || markets.length === 0) {
    console.log('❌ No market found matching "Nigeria elections"');
    return;
  }

  console.log(`✅ Found ${markets.length} market(s):\n`);

  markets.forEach((market, index) => {
    console.log(`${index + 1}. Market Details:`);
    console.log(`   ID: ${market.id}`);
    console.log(`   Claim: ${market.claim}`);
    console.log(`   Status: ${market.status}`);
    console.log(`   Contract Address: ${market.contract_address || '❌ MISSING!'}`);
    console.log(`   Created: ${new Date(market.created_at).toLocaleString()}`);
    console.log(`   Expires: ${new Date(market.expires_at).toLocaleString()}`);
    console.log(`   Creator: ${market.creator_wallet}`);

    if (market.resolution_data) {
      console.log(`   Resolution:`);
      console.log(`     - Outcome: ${market.resolution_data.outcome}`);
      console.log(`     - Confidence: ${market.resolution_data.confidence}%`);
      console.log(`     - Source: ${market.resolution_data.source}`);
    }

    console.log('');

    // Diagnose the problem
    if (!market.contract_address) {
      console.log('❌ PROBLEM IDENTIFIED:');
      console.log('   This market has NO contract_address!');
      console.log('   This means:');
      console.log('   1. The market was approved without deploying a contract');
      console.log('   2. OR the contract deployment failed silently');
      console.log('   3. OR there\'s a bug in the market creation flow');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   This market cannot be resolved on-chain.');
      console.log('   Options:');
      console.log('   a) Mark as "canceled" in database (recommended)');
      console.log('   b) Investigate why contract_address is missing');
      console.log('   c) Check if user created it via admin panel or regular flow');
      console.log('');
    }
  });
}

checkMarket();
