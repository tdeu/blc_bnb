// Decode method selector 0x90c48af2
// Common Solidity function signatures

const methodSelectors = {
  '0x06fdde03': 'name()',
  '0x95d89b41': 'symbol()',
  '0x313ce567': 'decimals()',
  '0x18160ddd': 'totalSupply()',
  '0x70a08231': 'balanceOf(address)',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0xdd62ed3e': 'allowance(address,address)',

  // Market-specific functions
  '0x90c48af2': 'resolveMarketWithAI(uint8,uint256)', // This is likely it!
  '0x9e6629c1': 'placeBet(bool)',
  '0x1e83409a': 'claim()',
  '0xdb006a75': 'redeem()',
  '0x0d8e6e2c': 'cancel()',
};

const selector = '0x90c48af2';

console.log(`🔍 Decoding method selector: ${selector}\n`);

if (methodSelectors[selector]) {
  console.log(`✅ Found: ${methodSelectors[selector]}`);
  console.log('');
  console.log('📋 This means:');
  console.log('   The admin called resolveMarketWithAI() on the contract');
  console.log('   This resolves the market on-chain and triggers auto-payout');
  console.log('   Winnings are distributed automatically to winners!');
} else {
  console.log(`❓ Unknown method selector`);
  console.log('   Not in common function database');
}

console.log('\n🔗 To verify on BSCScan:');
console.log('   1. Click on the transaction hash');
console.log('   2. Look at "Input Data" section');
console.log('   3. Click "Decode Input Data" if available');
