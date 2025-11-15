// Script to fix market status from 'resolved' to 'pending_payout'
// Run with: node fix-market-status.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMarketStatus() {
  const marketId = 'market_1763236872127_yt2jrl1d6';

  console.log(`🔧 Fixing market ${marketId}...`);

  const { error } = await supabase
    .from('approved_markets')
    .update({
      status: 'pending_payout'
    })
    .eq('id', marketId);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Market status changed from "resolved" to "pending_payout"');
    console.log('Now the AI scheduler can resolve it on-chain!');
  }
}

fixMarketStatus();
