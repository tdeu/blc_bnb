// Check market status on blockchain
import { ethers } from 'ethers';

const contractAddress = '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1';

// Market ABI with marketInfo struct (CORRECT structure from contract)
const MARKET_ABI = [
  "function marketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))",
  "function resolvedOutcome() external view returns (uint8)",
  "function confidenceScore() external view returns (uint256)",
  "function yesShares() external view returns (uint256)",
  "function noShares() external view returns (uint256)"
];

async function checkStatus() {
  try {
    console.log('🔍 Checking market status on-chain...\n');

    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const market = new ethers.Contract(contractAddress, MARKET_ABI, provider);

    const info = await market.marketInfo();
    const outcome = await market.resolvedOutcome();
    const confidence = await market.confidenceScore();
    const yesShares = await market.yesShares();
    const noShares = await market.noShares();

    console.log('📊 Market Info:');
    console.log(`   Question: ${info.question}`);
    console.log(`   Creator: ${info.creator}`);
    console.log(`   End Time: ${new Date(Number(info.endTime) * 1000).toLocaleString()}`);
    console.log(`   Status: ${getStatusName(Number(info.status))}`);
    console.log(`   Outcome: ${getOutcomeName(Number(outcome))}`);
    console.log(`   Confidence: ${confidence}%`);
    console.log(`   YES shares: ${ethers.formatEther(yesShares)} CAST`);
    console.log(`   NO shares: ${ethers.formatEther(noShares)} CAST`);

    console.log('\n' + '='.repeat(60));
    const statusNum = Number(info.status);

    // MarketStatus enum: Submited = 0, Open = 1, PendingResolution = 2, Resolved = 3, Canceled = 4, Refunded = 5
    if (statusNum === 0) {
      console.log('📝 Market status is SUBMITTED - awaiting approval');
    } else if (statusNum === 1) {
      console.log('✅ Market status is OPEN - can be resolved');
    } else if (statusNum === 2) {
      console.log('⚠️ Market status is PENDING_RESOLUTION');
      console.log('   May need to finalize or might be stuck');
    } else if (statusNum === 3) {
      console.log('🎯 Market is ALREADY RESOLVED');
      console.log(`   Outcome: ${getOutcomeName(Number(outcome))}`);
      console.log('   Users can claim winnings!');
    } else if (statusNum === 4) {
      console.log('❌ Market is CANCELLED');
    } else if (statusNum === 5) {
      console.log('💸 Market is REFUNDED');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\nTrying alternative method...');

    // Try reading individual fields
    const SIMPLE_ABI = [
      "function claim() external view returns (string)",
      "function endTime() external view returns (uint256)"
    ];

    try {
      const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
      const market2 = new ethers.Contract(contractAddress, SIMPLE_ABI, provider);

      const claim = await market2.claim();
      const endTime = await market2.endTime();

      console.log(`\n✅ Claim: ${claim}`);
      console.log(`   End Time: ${new Date(Number(endTime) * 1000).toLocaleString()}`);

    } catch (err2) {
      console.error('Alternative method also failed:', err2.message);
    }
  }
}

function getStatusName(status) {
  const names = ['Submitted', 'Open', 'PendingResolution', 'Resolved', 'Canceled', 'Refunded'];
  return names[status] || `Unknown(${status})`;
}

function getOutcomeName(outcome) {
  const names = ['Unset', 'Yes', 'No'];
  return names[outcome] || `Unknown(${outcome})`;
}

checkStatus();
