// Check market state on blockchain
import { config } from 'dotenv';
import { ethers } from 'ethers';

config();

const contractAddress = '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1';

// Extended Market ABI with read functions
const MARKET_ABI = [
  "function isResolved() external view returns (bool)",
  "function outcome() external view returns (bool)",
  "function totalYesAmount() external view returns (uint256)",
  "function totalNoAmount() external view returns (uint256)",
  "function expiryTime() external view returns (uint256)",
  "function claim() external view returns (string)",
  "function admin() external view returns (address)"
];

async function checkMarketState() {
  try {
    console.log('🔍 Checking market state on BSC Testnet...\n');
    console.log(`Contract: ${contractAddress}\n`);

    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const market = new ethers.Contract(contractAddress, MARKET_ABI, provider);

    // Check if resolved
    const isResolved = await market.isResolved();
    console.log(`✅ isResolved: ${isResolved}`);

    if (isResolved) {
      const outcome = await market.outcome();
      console.log(`   Outcome: ${outcome ? 'YES (true)' : 'NO (false)'}`);
    }

    // Check amounts
    const totalYes = await market.totalYesAmount();
    const totalNo = await market.totalNoAmount();
    console.log(`\n💰 Betting Pools:`);
    console.log(`   YES pool: ${ethers.formatEther(totalYes)} CAST`);
    console.log(`   NO pool: ${ethers.formatEther(totalNo)} CAST`);
    console.log(`   Total: ${ethers.formatEther(totalYes + totalNo)} CAST`);

    // Check expiry
    const expiryTime = await market.expiryTime();
    const expiryDate = new Date(Number(expiryTime) * 1000);
    const now = new Date();
    console.log(`\n⏰ Expiry:`);
    console.log(`   Time: ${expiryDate.toLocaleString()}`);
    console.log(`   Expired: ${now > expiryDate ? 'YES' : 'NO'}`);

    // Check claim
    const claim = await market.claim();
    console.log(`\n📝 Claim: ${claim}`);

    // Check admin
    const admin = await market.admin();
    console.log(`\n👤 Admin: ${admin}`);

    const adminPrivateKey = process.env.VITE_ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      const adminWallet = new ethers.Wallet(adminPrivateKey);
      console.log(`   Your admin: ${adminWallet.address}`);
      console.log(`   Match: ${admin.toLowerCase() === adminWallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    }

    console.log('\n' + '='.repeat(60));
    if (isResolved) {
      console.log('🎯 Market is ALREADY RESOLVED on-chain');
      console.log(`   Outcome: ${await market.outcome() ? 'YES' : 'NO'}`);
      console.log('   Database status can be updated to "resolved"');
    } else {
      console.log('⚠️ Market is NOT YET RESOLVED on-chain');
      console.log('   Need to investigate why resolution is failing');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMarketState();
