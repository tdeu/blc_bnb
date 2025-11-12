/**
 * P&L Calculation Standalone Test
 * Tests P&L logic without external dependencies
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

interface UserBet {
  id: string;
  marketId: string;
  marketClaim: string;
  position: 'yes' | 'no';
  amount: number;
  shares: string;
  transactionHash: string;
  placedAt: Date | string;
  status: 'active' | 'won' | 'lost' | 'pending';
  marketStatus: 'active' | 'resolved';
  marketResolution?: 'yes' | 'no' | null;
  potentialReturn?: number;
  actualWinning?: number;
  walletAddress?: string;
  odds?: number;
  marketContractAddress?: string;
  winningsClaimed?: boolean;
  claimedAt?: string;
}

async function testPnLCalculations() {
  console.log('🧪 Testing P&L Calculation Logic...\n');

  const testWallet = '0xtest' + Date.now();
  const testMarketId = 'market-' + Date.now();
  const testContractAddress = '0x1234567890123456789012345678901234567890';

  try {
    // Step 1: Create test bets
    console.log('📝 Step 1: Creating test bets...');

    const yesBet: UserBet = {
      id: `bet-yes-${Date.now()}`,
      marketId: testMarketId,
      marketClaim: 'Will P&L test pass?',
      position: 'yes',
      amount: 10,
      shares: '100',
      transactionHash: 'tx_yes_123',
      placedAt: new Date().toISOString(),
      status: 'active',
      marketStatus: 'active',
      potentialReturn: 25,
      walletAddress: testWallet.toLowerCase(),
      odds: 2.5,
      marketContractAddress: testContractAddress
    };

    const noBet: UserBet = {
      id: `bet-no-${Date.now()}`,
      marketId: testMarketId,
      marketClaim: 'Will P&L test pass?',
      position: 'no',
      amount: 15,
      shares: '150',
      transactionHash: 'tx_no_456',
      placedAt: new Date().toISOString(),
      status: 'active',
      marketStatus: 'active',
      potentialReturn: 27,
      walletAddress: testWallet.toLowerCase(),
      odds: 1.8,
      marketContractAddress: testContractAddress
    };

    const bets = [yesBet, noBet];
    console.log('✅ Created 2 test bets:');
    console.log('   YES: 10 CAST @ 2.5x odds = 25 CAST potential');
    console.log('   NO: 15 CAST @ 1.8x odds = 27 CAST potential');
    console.log('');

    // Step 2: Simulate market resolution (YES wins)
    console.log('🎯 Step 2: Simulating market resolution (YES wins)...');

    const marketOutcome: 'yes' | 'no' = 'yes';

    const resolvedBets = bets.map(bet => {
      const didWin = bet.position === marketOutcome;
      let actualWinning = 0;

      if (didWin) {
        actualWinning = bet.potentialReturn || (bet.amount * (bet.odds || 2.0));
      }

      return {
        ...bet,
        status: didWin ? ('won' as const) : ('lost' as const),
        actualWinning,
        marketStatus: 'resolved' as const,
        marketResolution: marketOutcome
      };
    });

    console.log('✅ Market resolved to:', marketOutcome.toUpperCase());
    console.log('');

    // Step 3: Verify P&L calculations
    console.log('💰 Step 3: Verifying P&L calculations...');

    const wonBets = resolvedBets.filter(bet => bet.status === 'won');
    const lostBets = resolvedBets.filter(bet => bet.status === 'lost');

    console.log('   Winners:', wonBets.length);
    wonBets.forEach(bet => {
      console.log(`     - ${bet.position.toUpperCase()}: Won ${bet.actualWinning} CAST (invested ${bet.amount} CAST)`);
    });

    console.log('   Losers:', lostBets.length);
    lostBets.forEach(bet => {
      console.log(`     - ${bet.position.toUpperCase()}: Lost ${bet.amount} CAST`);
    });
    console.log('');

    // Verify calculations
    const yesWinner = resolvedBets.find(b => b.position === 'yes');
    const noLoser = resolvedBets.find(b => b.position === 'no');

    if (yesWinner?.status !== 'won') {
      throw new Error('YES bet should have won');
    }

    if (yesWinner.actualWinning !== 25) {
      throw new Error(`YES bet winnings incorrect: ${yesWinner.actualWinning} vs expected 25`);
    }

    if (noLoser?.status !== 'lost') {
      throw new Error('NO bet should have lost');
    }

    if (noLoser.actualWinning !== 0) {
      throw new Error(`NO bet should have 0 winnings: ${noLoser.actualWinning}`);
    }

    console.log('✅ P&L calculations verified correctly');
    console.log('');

    // Step 4: Calculate P&L summary
    console.log('📊 Step 4: Calculating P&L summary...');

    const totalWinnings = wonBets.reduce((sum, bet) => sum + (bet.actualWinning || 0), 0);
    const totalLosses = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPnL = totalWinnings - totalLosses;
    const winRate = resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0;

    console.log('   Total Winnings:', totalWinnings.toFixed(3), 'CAST');
    console.log('   Total Losses:', totalLosses.toFixed(3), 'CAST');
    console.log('   Net P&L:', totalPnL.toFixed(3), 'CAST');
    console.log('   Win Rate:', winRate.toFixed(1) + '%');
    console.log('');

    // Verify summary
    if (totalWinnings !== 25) {
      throw new Error(`Total winnings incorrect: ${totalWinnings}`);
    }

    if (totalLosses !== 15) {
      throw new Error(`Total losses incorrect: ${totalLosses}`);
    }

    if (totalPnL !== 10) {
      throw new Error(`Total P&L incorrect: ${totalPnL}`);
    }

    if (winRate !== 50) {
      throw new Error(`Win rate incorrect: ${winRate}`);
    }

    console.log('✅ P&L summary verified correctly');
    console.log('');

    // Step 5: Test claim status
    console.log('✅ Step 5: Testing claim status...');

    const claimedBets = resolvedBets.map(bet => {
      if (bet.status === 'won') {
        return {
          ...bet,
          winningsClaimed: true,
          claimedAt: new Date().toISOString()
        };
      }
      return bet;
    });

    const claimed = claimedBets.filter(bet => bet.winningsClaimed);
    console.log('   Claimed bets:', claimed.length);
    console.log('   Unclaimed bets:', claimedBets.filter(bet => !bet.winningsClaimed).length);

    if (claimed.length !== wonBets.length) {
      throw new Error('Not all winning bets marked as claimed');
    }

    console.log('✅ Claim status tracking verified');
    console.log('');

    // Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Bets created with correct data structure');
    console.log('   ✅ Market resolution updates bet statuses correctly');
    console.log('   ✅ Winner receives correct payout (25 CAST)');
    console.log('   ✅ Loser receives nothing (0 CAST)');
    console.log('   ✅ P&L summary calculations accurate (+10 CAST net)');
    console.log('   ✅ Claim status tracking works correctly');
    console.log('');
    console.log('🎉 P&L Calculation Test PASSED!\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    return false;
  }
}

// Run the test
testPnLCalculations().then(success => {
  process.exit(success ? 0 : 1);
});
