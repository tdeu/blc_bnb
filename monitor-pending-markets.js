// Script to monitor markets in pending_payout status
// Run with: node monitor-pending-markets.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorPendingMarkets() {
  console.log('📊 Monitoring markets in pending_payout status...\n');

  const { data: markets, error } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('status', 'pending_payout')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!markets || markets.length === 0) {
    console.log('✅ No markets in pending_payout status');
    return;
  }

  console.log(`Found ${markets.length} market(s) pending payout:\n`);

  markets.forEach((market, index) => {
    console.log(`${index + 1}. Market: ${market.claim}`);
    console.log(`   ID: ${market.id}`);
    console.log(`   Contract: ${market.contract_address}`);
    console.log(`   Status: ${market.status}`);
    console.log(`   Created: ${new Date(market.created_at).toLocaleString()}`);
    console.log(`   Expires: ${new Date(market.expires_at).toLocaleString()}`);

    if (market.resolution_data) {
      console.log(`   Resolution Data:`);
      console.log(`     - Outcome: ${market.resolution_data.final_outcome || market.resolution_data.outcome}`);
      console.log(`     - Confidence: ${market.resolution_data.confidence}%`);
      console.log(`     - Source: ${market.resolution_data.source || 'Unknown'}`);
      console.log(`     - Timestamp: ${market.resolution_data.timestamp}`);
    }
    console.log('');
  });

  console.log('💡 These markets should be automatically resolved on-chain by the AI scheduler.');
}

monitorPendingMarkets();
