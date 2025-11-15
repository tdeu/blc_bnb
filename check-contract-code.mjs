// Check if contract has code deployed
import { ethers } from 'ethers';

const contractAddress = '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1';

async function checkCode() {
  try {
    console.log('🔍 Checking if contract has code deployed...\n');
    console.log(`Address: ${contractAddress}\n`);

    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

    // Get contract code
    const code = await provider.getCode(contractAddress);

    console.log(`Code length: ${code.length} characters`);

    if (code === '0x' || code.length <= 2) {
      console.log('\n❌ NO CONTRACT CODE FOUND!');
      console.log('   This address does not have a contract deployed.');
      console.log('   The market was likely not deployed correctly.');
      console.log('\n💡 Possible issues:');
      console.log('   1. Market creation transaction failed');
      console.log('   2. Wrong network (should be BSC Testnet)');
      console.log('   3. Contract address was incorrectly saved');
    } else {
      console.log('\n✅ Contract code exists!');
      console.log(`   First 100 chars: ${code.substring(0, 100)}...`);

      // Check balance
      const balance = await provider.getBalance(contractAddress);
      console.log(`\n💰 Contract balance: ${ethers.formatEther(balance)} BNB`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCode();
