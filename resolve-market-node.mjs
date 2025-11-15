// Resolution script using pure Node.js with dotenv
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// Load environment variables
config();

const supabaseUrl = 'https://fiopwubhukuxmjgujtxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3B3dWJodWt1eG1qZ3VqdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDQyNTAsImV4cCI6MjA3MjQyMDI1MH0.UuygnAS7M0Z0i4P4NqbAjxY_04grhfb-jCRZY64l97A';
const supabase = createClient(supabaseUrl, supabaseKey);

const marketId = 'market_1763236872127_yt2jrl1d6';

console.log(`🔧 Resolving market ${marketId} on-chain...\n`);

// Market ABI - just the resolveMarketWithAI function
const MARKET_ABI = [
  "function resolveMarketWithAI(bool outcome, uint256 confidence) external"
];

async function resolveMarket() {
  try {
    // 1. Get market data from Supabase
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

    if (!market.contract_address) {
      console.error('❌ No contract address found for this market');
      return;
    }

    // 2. Setup admin signer
    const adminPrivateKey = process.env.VITE_ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      console.error('❌ VITE_ADMIN_PRIVATE_KEY not found in .env file');
      return;
    }

    console.log('🔐 Setting up admin signer...');
    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
    console.log(`   Admin address: ${adminSigner.address}`);

    // 3. Connect to market contract
    console.log('📝 Connecting to market contract...');
    const marketContract = new ethers.Contract(
      market.contract_address,
      MARKET_ABI,
      adminSigner
    );

    // 4. Resolve on blockchain
    console.log(`🚀 Calling resolveMarketWithAI(${outcome === 'yes'}, ${confidence})...`);
    const tx = await marketContract.resolveMarketWithAI(
      outcome === 'yes',
      confidence
    );

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // 5. Update database status to 'resolved'
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
    }

    console.log('\n🎉 COMPLETE! Market resolved successfully!');
    console.log('💰 Users can now claim winnings via redeem()');
    console.log(`🔗 Transaction: https://testnet.bscscan.com/tx/${tx.hash}`);

  } catch (error) {
    console.error('\n❌ Error resolving market:', error);

    if (error.message) {
      console.log(`\nError message: ${error.message}`);
    }

    if (error.code === 'CALL_EXCEPTION') {
      console.log('\n💡 This might mean:');
      console.log('   - Market is already resolved on-chain');
      console.log('   - Admin signer does not have permission');
      console.log('   - Contract requires different parameters');
    }
  }
}

resolveMarket();
