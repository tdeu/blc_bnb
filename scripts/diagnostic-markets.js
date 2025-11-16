/**
 * Market Lifecycle Diagnostic Script
 *
 * Run this in the browser console to diagnose and fix market status issues.
 *
 * Usage:
 * 1. Open your BlockCast app in the browser
 * 2. Open DevTools (F12) -> Console
 * 3. Copy and paste this entire script
 * 4. Follow the prompts
 */

(async () => {
  console.log('='.repeat(60));
  console.log('🔍 BLOCKCAST MARKET LIFECYCLE DIAGNOSTIC TOOL');
  console.log('='.repeat(60));

  // Check if supabase is available
  if (!window.supabase && !window.approvedMarketsService) {
    console.error('❌ Supabase not available. Make sure you are on the BlockCast app.');
    return;
  }

  // Import supabase from the app
  const { supabase } = await import('../src/utils/supabase.ts');

  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return;
  }

  console.log('✅ Supabase client found');
  console.log('');

  // Fetch all markets
  const { data: markets, error } = await supabase
    .from('approved_markets')
    .select('id, claim, status, expires_at, evidence_period_start, evidence_period_end, resolution_data')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching markets:', error);
    return;
  }

  console.log(`📊 Found ${markets.length} markets in database`);
  console.log('');

  const now = new Date();
  const nowISO = now.toISOString();

  // Categorize markets
  const activeButExpired = [];
  const activeNotExpired = [];
  const evidenceCollectionNotExpired = [];
  const evidenceCollectionExpired = [];
  const resolved = [];
  const other = [];

  for (const market of markets) {
    const expiresAt = new Date(market.expires_at);
    const isExpired = expiresAt < now;

    if (market.status === 'active' && !isExpired) {
      activeNotExpired.push(market);
    } else if (market.status === 'active' && isExpired) {
      activeButExpired.push(market);
    } else if (market.status === 'evidence_collection' && !isExpired) {
      evidenceCollectionNotExpired.push(market); // PROBLEM!
    } else if (market.status === 'evidence_collection' && isExpired) {
      evidenceCollectionExpired.push(market);
    } else if (market.status === 'resolved' || market.status === 'pending_payout') {
      resolved.push(market);
    } else {
      other.push(market);
    }
  }

  // Report
  console.log('📈 MARKET STATUS REPORT');
  console.log('-'.repeat(60));
  console.log(`✅ Active (not expired): ${activeNotExpired.length}`);
  console.log(`⏰ Active (expired, waiting for AI): ${activeButExpired.length}`);
  console.log(`📋 Evidence Collection (expired): ${evidenceCollectionExpired.length}`);
  console.log(`🔄 Resolved/Pending Payout: ${resolved.length}`);
  console.log(`❓ Other statuses: ${other.length}`);
  console.log('');

  // CHECK FOR PROBLEMS
  if (evidenceCollectionNotExpired.length > 0) {
    console.error('🚨 CRITICAL ISSUE DETECTED!');
    console.error(`${evidenceCollectionNotExpired.length} market(s) are in 'evidence_collection' status BUT HAVE NOT EXPIRED YET!`);
    console.error('This is the bug you reported.');
    console.log('');

    for (const market of evidenceCollectionNotExpired) {
      const expiresAt = new Date(market.expires_at);
      const daysUntilExpiry = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));

      console.log(`🚫 PROBLEMATIC MARKET:`);
      console.log(`   ID: ${market.id}`);
      console.log(`   Claim: ${market.claim.substring(0, 80)}...`);
      console.log(`   Status: ${market.status} (SHOULD BE 'active')`);
      console.log(`   Expires in: ${daysUntilExpiry} days`);
      console.log(`   Evidence period start: ${market.evidence_period_start || 'N/A'}`);
      console.log(`   Evidence period end: ${market.evidence_period_end || 'N/A'}`);
      console.log('');
    }

    console.log('🔧 TO FIX THIS, run the following in your Supabase SQL Editor:');
    console.log('');

    const ids = evidenceCollectionNotExpired.map(m => `'${m.id}'`).join(', ');
    console.log(`UPDATE approved_markets
SET
  status = 'active',
  evidence_period_start = NULL,
  evidence_period_end = NULL,
  resolution_data = NULL
WHERE id IN (${ids})
  AND expires_at > NOW();`);
    console.log('');
  } else {
    console.log('✅ No problematic markets found!');
  }

  // Show active markets that should stay active
  if (activeNotExpired.length > 0) {
    console.log('');
    console.log('📋 ACTIVE MARKETS (Correct Status):');
    console.log('-'.repeat(60));
    for (const market of activeNotExpired.slice(0, 5)) {
      const expiresAt = new Date(market.expires_at);
      const daysUntilExpiry = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
      console.log(`   ✅ ${market.claim.substring(0, 50)}... (expires in ${daysUntilExpiry} days)`);
    }
    if (activeNotExpired.length > 5) {
      console.log(`   ... and ${activeNotExpired.length - 5} more`);
    }
  }

  // Show expired markets waiting for AI
  if (activeButExpired.length > 0) {
    console.log('');
    console.log('⏰ EXPIRED MARKETS (Waiting for AI Resolution):');
    console.log('-'.repeat(60));
    for (const market of activeButExpired) {
      const expiresAt = new Date(market.expires_at);
      const minutesAgo = Math.round((now - expiresAt) / (1000 * 60));
      console.log(`   ⏰ ${market.claim.substring(0, 50)}... (expired ${minutesAgo} min ago)`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Diagnostic complete');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Fix any problematic markets in Supabase');
  console.log('2. Restart your app (npm run dev)');
  console.log('3. The automaticResolutionMonitor will now only process EXPIRED markets');
  console.log('');
})();
