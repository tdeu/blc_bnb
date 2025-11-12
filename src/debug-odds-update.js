// Debug function to test odds updates in the browser console

window.debugOddsUpdate = async function(marketId) {
  console.log('🔧 DEBUG: Testing odds update for market:', marketId);

  // Access the React app's refresh function
  if (window.debugRefreshMarketOdds) {
    console.log('📞 Calling refreshMarketOdds...');
    await window.debugRefreshMarketOdds(marketId, '0x39d64Ae0765Be566D3640024b2e0e835C033d478');
  } else {
    console.log('❌ debugRefreshMarketOdds not available');
  }
};

// Force re-render test
window.forceRerender = function() {
  console.log('🔄 Forcing app re-render...');
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.style.display = 'none';
    setTimeout(() => {
      appRoot.style.display = 'block';
    }, 100);
  }
};

// Check current market state
window.debugMarketState = function() {
  console.log('📊 Current market state:', window.debugMarkets || 'Not available');
};

console.log('🔧 Debug functions loaded! Try:');
console.log('• debugOddsUpdate("market_1758781343068_lh5zc3kjx")');
console.log('• forceRerender()');
console.log('• debugMarketState()');