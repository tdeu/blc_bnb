// Mark market as resolved in database only (blockchain resolution seems blocked)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function markAsResolvedDBOnly() {
  const marketId = 'market_1763236872127_yt2jrl1d6';

  console.log(`📝 Marking market ${marketId} as "resolved" in database...\n`);
  console.log('⚠️ NOTE: This is database-only. Users will need to claim via UI.\n');

  const { data: market, error: fetchError } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching market:', fetchError);
    return;
  }

  console.log('Current status:', market.status);
  console.log('Resolution data:', market.resolution_data);

  const { error } = await supabase
    .from('approved_markets')
    .update({
      status: 'resolved'
    })
    .eq('id', marketId);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('\n✅ Market marked as "resolved" in database');
    console.log('');
    console.log('📋 NEXT STEPS FOR USER:');
    console.log('1. Go to Portfolio on http://localhost:3002');
    console.log('2. Your bet should appear in "Cast History"');
    console.log('3. Metrics should show:');
    console.log('   - Win Rate: 100% (1 win)');
    console.log('   - Net P&L: positive (your winnings)');
    console.log('');
    console.log('💡 Note: Blockchain resolution is blocked by the contract.');
    console.log('   Investigating why marketInfo() call fails.');
    console.log('   The market might need to be redeployed or there\'s a version mismatch.');
  }
}

markAsResolvedDBOnly();
