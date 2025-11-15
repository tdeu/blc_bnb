// Check AI Resolution Scheduler status and find expired markets
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScheduler() {
  console.log('🔍 Checking for markets that should be auto-resolved...\n');

  const now = new Date();

  // Check for expired active markets (should have been auto-resolved)
  const { data: expiredActive, error: err1 } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('status', 'active')
    .order('expires_at', { ascending: true });

  if (err1) {
    console.error('❌ Error:', err1);
    return;
  }

  const expired = expiredActive?.filter(m => new Date(m.expires_at) <= now) || [];

  console.log(`📊 Markets Status Summary:`);
  console.log(`   Active markets: ${expiredActive?.length || 0}`);
  console.log(`   Expired but still "active": ${expired.length} ⚠️`);
  console.log('');

  if (expired.length > 0) {
    console.log('❌ PROBLEM DETECTED!');
    console.log(`   ${expired.length} market(s) are EXPIRED but still status="active"`);
    console.log('   These should have been auto-resolved by the scheduler!\n');

    expired.forEach((market, i) => {
      const expiredAgo = Math.floor((now.getTime() - new Date(market.expires_at).getTime()) / 1000 / 60);
      console.log(`${i + 1}. ${market.claim}`);
      console.log(`   ID: ${market.id}`);
      console.log(`   Expired: ${expiredAgo} minutes ago`);
      console.log(`   Expires at: ${new Date(market.expires_at).toLocaleString()}`);
      console.log(`   Contract: ${market.contract_address || 'MISSING'}`);
      console.log('');
    });

    console.log('💡 POSSIBLE CAUSES:');
    console.log('1. AI Resolution Scheduler not started in browser');
    console.log('2. Scheduler running but failed silently');
    console.log('3. Page not loaded/refreshed since market expiry');
    console.log('4. Scheduler check interval (5 min) not reached yet');
    console.log('');
    console.log('✅ SOLUTIONS:');
    console.log('a) Check browser console for "🚀 Starting AI Resolution Scheduler"');
    console.log('b) Refresh the page to restart scheduler');
    console.log('c) Wait up to 5 minutes for next scheduler check');
    console.log('d) Manually resolve from Admin panel as backup');
  } else {
    console.log('✅ All expired markets have been processed!');
  }

  // Check pending_payout markets (waiting for blockchain)
  const { data: pendingPayout } = await supabase
    .from('approved_markets')
    .select('*')
    .eq('status', 'pending_payout');

  if (pendingPayout && pendingPayout.length > 0) {
    console.log(`\n⏳ ${pendingPayout.length} market(s) in "pending_payout" (waiting for blockchain):`);
    pendingPayout.forEach((m, i) => {
      console.log(`${i + 1}. ${m.claim}`);
      console.log(`   Outcome: ${m.resolution_data?.outcome?.toUpperCase()}`);
      console.log(`   Confidence: ${m.resolution_data?.confidence}%`);
      console.log(`   Contract: ${m.contract_address || 'MISSING'}`);
      console.log('');
    });
  }
}

checkScheduler();
