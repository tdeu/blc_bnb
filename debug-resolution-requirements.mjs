// Debug all requirements for resolveMarketWithAI
import { config } from 'dotenv';
import { ethers } from 'ethers';

config();

const contractAddress = '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1';
const adminPrivateKey = process.env.VITE_ADMIN_PRIVATE_KEY;

const MARKET_ABI = [
  "function marketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))",
  "function adminManager() external view returns (address)"
];

const ADMIN_MANAGER_ABI = [
  "function isAdmin(address) external view returns (bool)"
];

async function debugRequirements() {
  try {
    console.log('🔍 Debugging resolveMarketWithAI requirements...\n');
    console.log('Function signature: resolveMarketWithAI(Outcome outcome, uint256 _confidenceScore)');
    console.log('');

    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const market = new ethers.Contract(contractAddress, MARKET_ABI, provider);

    // Get market info - using raw call to bypass decoding issues
    const infoData = await provider.call({
      to: contractAddress,
      data: '0x0a8e8e01' // marketInfo() selector
    });

    // Parse manually
    const endTimeHex = '0x' + infoData.substring(194, 258);
    const statusHex = '0x' + infoData.substring(258, 322);
    const endTime = parseInt(endTimeHex, 16);
    const status = parseInt(statusHex, 16);

    const now = Math.floor(Date.now() / 1000);
    const isExpired = now >= endTime;

    console.log('📋 REQUIREMENTS CHECK:\n');
    console.log('1️⃣ require(block.timestamp >= marketInfo.endTime, "Market not expired yet")');
    console.log(`   Current time: ${now} (${new Date(now * 1000).toLocaleString()})`);
    console.log(`   Market endTime: ${endTime} (${new Date(endTime * 1000).toLocaleString()})`);
    console.log(`   ✅ Is expired: ${isExpired ? 'YES' : 'NO'}`);
    if (!isExpired) {
      console.log(`   ⏳ Time until expiry: ${endTime - now} seconds`);
    }
    console.log('');

    console.log('2️⃣ require(marketInfo.status == MarketStatus.Open, "Market not open")');
    const statusNames = ['Submitted', 'Open', 'PendingResolution', 'Resolved', 'Canceled', 'Refunded'];
    console.log(`   Current status: ${status} (${statusNames[status]})`);
    console.log(`   Required: 1 (Open)`);
    console.log(`   ✅ Status is Open: ${status === 1 ? 'YES' : 'NO'}`);
    console.log('');

    console.log('3️⃣ require(outcome != Outcome.Unset, "Invalid outcome")');
    console.log(`   Planned outcome: Yes (enum value: 1)`);
    console.log(`   ✅ Not Unset: YES`);
    console.log('');

    console.log('4️⃣ require(_confidenceScore <= 100, "Confidence score must be <= 100")');
    console.log(`   Planned confidence: 99`);
    console.log(`   ✅ Valid: YES`);
    console.log('');

    console.log('5️⃣ onlyAdmin modifier');
    const adminManagerAddress = await market.adminManager();
    const adminManager = new ethers.Contract(adminManagerAddress, ADMIN_MANAGER_ABI, provider);
    const isAdmin = await adminManager.isAdmin(adminWallet.address);
    console.log(`   Your address: ${adminWallet.address}`);
    console.log(`   ✅ Is admin: ${isAdmin ? 'YES' : 'NO'}`);
    console.log('');

    console.log('=' .repeat(60));

    // Count passing requirements
    const checks = [
      isExpired,
      status === 1,
      true, // outcome not unset
      99 <= 100,
      isAdmin
    ];

    const passing = checks.filter(Boolean).length;
    console.log(`\n📊 RESULT: ${passing}/5 requirements passing\n`);

    if (passing === 5) {
      console.log('✅ ALL REQUIREMENTS MET!');
      console.log('   Transaction should succeed.');
      console.log('   If still failing, check:');
      console.log('   - Gas price/limit');
      console.log('   - Network connectivity');
      console.log('   - Contract code mismatch');
    } else {
      console.log('❌ SOME REQUIREMENTS NOT MET!');
      if (!isExpired) {
        console.log('   ⚠️ Market not yet expired - wait until', new Date(endTime * 1000).toLocaleString());
      }
      if (status !== 1) {
        console.log(`   ⚠️ Market status is ${statusNames[status]}, not Open`);
      }
      if (!isAdmin) {
        console.log('   ⚠️ Wallet does not have admin permissions');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugRequirements();
