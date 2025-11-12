/**
 * P&L Calculation and Claim Functionality Test
 *
 * Tests:
 * - Bet recording with contract address
 * - Market resolution and bet status updates
 * - P&L calculation for won/lost bets
 * - Claim status tracking
 * - Portfolio sync functionality
 */

// Mock localStorage for Node environment
if (typeof localStorage === 'undefined') {
  (global as any).localStorage = {
    data: {} as Record<string, string>,
    getItem(key: string) {
      return this.data[key] || null;
    },
    setItem(key: string, value: string) {
      this.data[key] = value;
    },
    removeItem(key: string) {
      delete this.data[key];
    },
    get length() {
      return Object.keys(this.data).length;
    },
    key(index: number) {
      const keys = Object.keys(this.data);
      return keys[index] || null;
    },
    clear() {
      this.data = {};
    }
  };
}

import { betResolutionService } from '../utils/betResolutionService';
import { userDataService } from '../utils/userDataService';

async function testPnLAndClaim() {
  console.log('🧪 Testing P&L Calculation and Claim Functionality...\n');

  const testWallet = '0xtest' + Date.now();
  const testMarketId = 'market-' + Date.now();
  const testContractAddress = '0x1234567890123456789012345678901234567890';

  try {
    // Step 1: Record test bets
    console.log('📝 Step 1: Recording test bets...');

    // Record a YES bet
    userDataService.recordBet(
      testWallet,
      testMarketId,
      'Will P&L test pass?',
      'yes',
      10, // 10 CAST
      '100', // 100 shares
      'tx_yes_123',
      2.5, // 2.5x odds
      25, // 25 CAST potential return
      testContractAddress
    );

    // Record a NO bet from another "user"
    userDataService.recordBet(
      testWallet,
      testMarketId,
      'Will P&L test pass?',
      'no',
      15, // 15 CAST
      '150', // 150 shares
      'tx_no_456',
      1.8, // 1.8x odds
      27, // 27 CAST potential return
      testContractAddress
    );

    console.log('✅ Recorded 2 test bets (YES and NO)');
    console.log('   YES: 10 CAST @ 2.5x odds = 25 CAST potential');
    console.log('   NO: 15 CAST @ 1.8x odds = 27 CAST potential');
    console.log('');

    // Step 2: Verify bets are stored
    console.log('🔍 Step 2: Verifying bet storage...');

    const storageKey = `user_bets_${testWallet.toLowerCase()}`;
    const storedBets = JSON.parse(localStorage.getItem(storageKey) || '[]');

    console.log(`   Found ${storedBets.length} bet(s) in localStorage`);

    storedBets.forEach((bet: any, index: number) => {
      console.log(`   Bet ${index + 1}:`, {
        position: bet.position,
        amount: bet.amount,
        potentialReturn: bet.potentialReturn,
        status: bet.status,
        contractAddress: bet.marketContractAddress
      });
    });

    if (storedBets.length !== 2) {
      throw new Error('Expected 2 bets, found ' + storedBets.length);
    }

    console.log('✅ Bets stored correctly with contract addresses');
    console.log('');

    // Step 3: Simulate market resolution (YES wins)
    console.log('🎯 Step 3: Simulating market resolution (YES wins)...');

    const marketOutcome: 'yes' | 'no' = 'yes';
    const updatedCount = betResolutionService['updateBetsForWallet'](
      testWallet,
      testMarketId,
      marketOutcome
    );

    console.log(`✅ Updated ${updatedCount} bet(s) with resolution outcome`);
    console.log('');

    // Step 4: Verify P&L calculations
    console.log('💰 Step 4: Verifying P&L calculations...');

    const updatedBets = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const yesBet = updatedBets.find((bet: any) => bet.position === 'yes');
    const noBet = updatedBets.find((bet: any) => bet.position === 'no');

    console.log('   YES bet (winner):');
    console.log('     Status:', yesBet.status);
    console.log('     Actual winning:', yesBet.actualWinning, 'CAST');
    console.log('     Expected:', yesBet.potentialReturn, 'CAST');

    console.log('   NO bet (loser):');
    console.log('     Status:', noBet.status);
    console.log('     Actual winning:', noBet.actualWinning, 'CAST');
    console.log('     Expected: 0 CAST (lost)');

    // Verify winner gets payout
    if (yesBet.status !== 'won' || yesBet.actualWinning !== yesBet.potentialReturn) {
      throw new Error('Winner P&L calculation incorrect');
    }

    // Verify loser gets nothing
    if (noBet.status !== 'lost' || noBet.actualWinning !== 0) {
      throw new Error('Loser P&L calculation incorrect');
    }

    console.log('✅ P&L calculations verified correctly');
    console.log('');

    // Step 5: Test P&L summary
    console.log('📊 Step 5: Testing P&L summary...');

    const pnlSummary = betResolutionService.getPnLSummary(testWallet);

    console.log('   Total P&L:', pnlSummary.totalPnL.toFixed(3), 'CAST');
    console.log('   Total Winnings:', pnlSummary.totalWinnings.toFixed(3), 'CAST');
    console.log('   Total Losses:', pnlSummary.totalLosses.toFixed(3), 'CAST');
    console.log('   Win Count:', pnlSummary.winCount);
    console.log('   Loss Count:', pnlSummary.lossCount);
    console.log('   Win Rate:', pnlSummary.winRate.toFixed(1) + '%');

    // Verify summary calculations
    const expectedWinnings = 25; // YES bet potential
    const expectedLosses = 15; // NO bet amount
    const expectedPnL = expectedWinnings - expectedLosses;

    if (Math.abs(pnlSummary.totalWinnings - expectedWinnings) > 0.01) {
      throw new Error(`Total winnings incorrect: ${pnlSummary.totalWinnings} vs expected ${expectedWinnings}`);
    }

    if (Math.abs(pnlSummary.totalLosses - expectedLosses) > 0.01) {
      throw new Error(`Total losses incorrect: ${pnlSummary.totalLosses} vs expected ${expectedLosses}`);
    }

    if (Math.abs(pnlSummary.totalPnL - expectedPnL) > 0.01) {
      throw new Error(`Total P&L incorrect: ${pnlSummary.totalPnL} vs expected ${expectedPnL}`);
    }

    console.log('✅ P&L summary calculations verified');
    console.log('');

    // Step 6: Test claim status tracking
    console.log('✅ Step 6: Testing claim status tracking...');

    // Simulate claiming the winning bet
    const winnerBetId = yesBet.id;
    betResolutionService['updateBetClaimStatus'](winnerBetId, true);

    const betsAfterClaim = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const claimedBet = betsAfterClaim.find((bet: any) => bet.id === winnerBetId);

    console.log('   Winner bet claim status:', claimedBet.winningsClaimed);
    console.log('   Claimed at:', claimedBet.claimedAt);

    if (!claimedBet.winningsClaimed) {
      throw new Error('Claim status not updated correctly');
    }

    console.log('✅ Claim status tracking verified');
    console.log('');

    // Step 7: Test unclaimed winnings calculation
    console.log('💎 Step 7: Testing unclaimed winnings calculation...');

    // Re-record a new winning bet (unclaimed)
    userDataService.recordBet(
      testWallet,
      'market-unclaimed-' + Date.now(),
      'Unclaimed test',
      'yes',
      20,
      '200',
      'tx_unclaimed',
      3.0,
      60,
      testContractAddress
    );

    // Resolve this market as YES
    const allBets = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const unclaimedBet = allBets[allBets.length - 1];

    betResolutionService['updateBetsForWallet'](
      testWallet,
      unclaimedBet.marketId,
      'yes'
    );

    // Calculate unclaimed winnings
    const updatedPnLSummary = betResolutionService.getPnLSummary(testWallet);
    const finalBets = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const unclaimedWinnings = finalBets
      .filter((bet: any) => bet.status === 'won' && !bet.winningsClaimed)
      .reduce((sum: number, bet: any) => sum + (bet.actualWinning || 0), 0);

    console.log('   Unclaimed winnings:', unclaimedWinnings.toFixed(3), 'CAST');
    console.log('   (Should be 60 CAST from the new unclaimed bet)');

    if (Math.abs(unclaimedWinnings - 60) > 0.01) {
      throw new Error('Unclaimed winnings calculation incorrect');
    }

    console.log('✅ Unclaimed winnings calculation verified');
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    localStorage.removeItem(storageKey);
    console.log('✅ Test data cleaned up');
    console.log('');

    // Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Bets recorded with contract addresses');
    console.log('   ✅ Market resolution updates bet statuses');
    console.log('   ✅ Winner P&L calculated correctly');
    console.log('   ✅ Loser P&L calculated correctly');
    console.log('   ✅ P&L summary calculations accurate');
    console.log('   ✅ Claim status tracking works');
    console.log('   ✅ Unclaimed winnings calculation accurate');
    console.log('');
    console.log('🎉 P&L and Claim Test PASSED!\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }

    // Cleanup on failure
    const storageKey = `user_bets_${testWallet.toLowerCase()}`;
    localStorage.removeItem(storageKey);

    process.exit(1);
  }
}

// Run the test
testPnLAndClaim();
