import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { UserBet } from '../components/betting/BettingPortfolio';
import { supabase, MarketPrediction } from '../utils/supabase';
import { predictionService } from '../services/predictionService';

interface UseUserPositionsResult {
  userBets: UserBet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// RPC URLs for BSC Testnet (with fallbacks)
const BSC_RPC_URLS = [
  'https://bsc-testnet.public.blastapi.io',  // Blast API - higher limits
  'https://bsc-testnet-rpc.publicnode.com',   // Public Node - good reliability
  'https://data-seed-prebsc-1-s1.binance.org:8545/', // Official Binance - strict limits
];

// Get RPC URL from environment or use default
const BSC_RPC_URL = import.meta.env.VITE_BSC_TESTNET_RPC || BSC_RPC_URLS[0];

// ABI for SharesPurchased event and market info
const MARKET_ABI = [
  'event SharesPurchased(address indexed buyer, bool isYes, uint256 shares, uint256 cost, uint256 timestamp)',
  'event WinningsPaidOut(address indexed winner, uint256 amount)',
  'function getMarketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))',
  'function yesBalance(address) external view returns (uint256)',
  'function noBalance(address) external view returns (uint256)',
  'function resolvedOutcome() external view returns (uint8)'
];

export function useUserPositions(
  walletAddress: string | undefined,
  marketContracts: Record<string, string> // marketId -> contractAddress
): UseUserPositionsResult {
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage as fallback
  const loadFromLocalStorage = useCallback((address: string) => {
    try {
      const storageKey = `user_bets_${address.toLowerCase()}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        const bets = JSON.parse(data).map((bet: any) => ({
          ...bet,
          placedAt: new Date(bet.placedAt),
          resolvedAt: bet.resolvedAt ? new Date(bet.resolvedAt) : undefined,
          claimedAt: bet.claimedAt ? new Date(bet.claimedAt) : undefined
        }));
        setUserBets(bets);
        console.log(`📦 Loaded ${bets.length} bets from localStorage for ${address}`);
      } else {
        console.log(`📦 No bets found in localStorage for ${address}`);
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
  }, []);

  // Save to localStorage for persistence
  const saveToLocalStorage = useCallback((address: string, bets: UserBet[]) => {
    try {
      const storageKey = `user_bets_${address.toLowerCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(bets));
      console.log(`💾 Saved ${bets.length} bets to localStorage for ${address}`);
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  }, []);

  // Load from Supabase (primary source when blockchain not available)
  const loadFromSupabase = useCallback(async (address: string) => {
    try {
      console.log(`📊 Loading predictions from Supabase for ${address}...`);
      const result = await predictionService.getUserPredictions(address);

      if (result.success && result.predictions && result.predictions.length > 0) {
        // Also fetch market data to get resolution status
        const { data: marketsData } = await supabase
          .from('markets')
          .select('id, claim, end_date, status')
          .in('id', result.predictions.map((p: MarketPrediction) => p.market_id));

        const marketMap = new Map(marketsData?.map(m => [m.id, m]) || []);

        const bets: UserBet[] = result.predictions.map((pred: MarketPrediction) => {
          const market = marketMap.get(pred.market_id);
          const marketEndTime = market?.end_date ? new Date(market.end_date).getTime() : 0;
          const currentTime = Date.now();
          const isExpired = marketEndTime > 0 && currentTime > marketEndTime;

          // Determine status based on market state
          let betStatus: 'active' | 'pending' | 'won' | 'lost' =
            pred.transaction_status === 'confirmed' ? 'active' : 'pending';

          // If market has expired, mark as pending (awaiting resolution)
          if (isExpired && betStatus === 'active') {
            betStatus = 'pending';
          }

          return {
            id: pred.id,
            marketId: pred.market_id,
            marketClaim: market?.claim || '', // Get claim from market data
            marketContractAddress: pred.market_contract_address,
            position: pred.position,
            amount: pred.amount,
            odds: pred.odds || 2.0,
            potentialWinning: pred.potential_return || pred.amount * 2.0,
            potentialReturn: pred.potential_return || pred.amount * 2.0,
            placedAt: new Date(pred.created_at),
            status: betStatus,
            resolvedAt: isExpired ? new Date(marketEndTime) : undefined,
            blockchainTxId: pred.transaction_hash !== 'pending' ? pred.transaction_hash : undefined,
            hasNFT: false,
            winningsClaimed: false
          };
        });

        setUserBets(bets);
        console.log(`✅ Loaded ${bets.length} predictions from Supabase for ${address}`);

        // Also save to localStorage for offline access
        saveToLocalStorage(address, bets);
      } else {
        console.log('No predictions found in Supabase, checking localStorage...');
        loadFromLocalStorage(address);
      }
    } catch (err) {
      console.error('Error loading from Supabase:', err);
      // Fallback to localStorage
      loadFromLocalStorage(address);
    }
  }, [loadFromLocalStorage, saveToLocalStorage]);

  const fetchPositions = useCallback(async () => {
    if (!walletAddress) {
      setUserBets([]);
      return;
    }

    const allContractAddresses = Object.entries(marketContracts);
    console.log(`🔍 useUserPositions: wallet=${walletAddress}, contracts=${allContractAddresses.length}`);

    if (allContractAddresses.length === 0) {
      console.log('No market contracts available yet, loading from Supabase...');
      await loadFromSupabase(walletAddress);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, get user's predictions from Supabase to know which markets to query
      // This avoids querying all 130+ markets and hitting rate limits
      const supabaseResult = await predictionService.getUserPredictions(walletAddress);

      if (!supabaseResult.success || !supabaseResult.predictions || supabaseResult.predictions.length === 0) {
        console.log('No Supabase predictions found, checking localStorage...');
        loadFromLocalStorage(walletAddress);
        setIsLoading(false);
        return;
      }

      // Only query markets where user has predictions
      const userMarketIds = new Set(supabaseResult.predictions.map(p => p.market_id));
      const marketsToQuery = allContractAddresses.filter(([marketId]) => userMarketIds.has(marketId));
      console.log(`📊 User has ${supabaseResult.predictions.length} predictions in ${marketsToQuery.length} markets`);

      if (marketsToQuery.length === 0) {
        // Markets not loaded yet, use Supabase data directly
        console.log('Market contracts not loaded yet, using Supabase data directly...');
        await loadFromSupabase(walletAddress);
        return;
      }

      // Limit to max 10 markets to avoid rate limiting
      const limitedMarketsToQuery = marketsToQuery.slice(0, 10);
      if (marketsToQuery.length > 10) {
        console.log(`⚠️ Limiting to first ${limitedMarketsToQuery.length} markets to avoid RPC rate limits`);
      }

      console.log(`🔍 Fetching positions for wallet ${walletAddress} across ${limitedMarketsToQuery.length} markets using blockchain events...`);
      console.log(`🌐 Using RPC: ${BSC_RPC_URL}`);

      const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
      const positions: UserBet[] = [];
      let rateLimitHit = false;

      // Process markets sequentially with delays to avoid rate limiting
      const BATCH_SIZE = 1; // Process 1 market at a time (most conservative)
      const BATCH_DELAY = 3000; // 3 second delay between requests

      // Query SharesPurchased events from each market contract
      for (let i = 0; i < limitedMarketsToQuery.length; i++) {
        const [marketId, contractAddress] = limitedMarketsToQuery[i];

        // Add delay every BATCH_SIZE requests to avoid rate limits
        if (i > 0 && i % BATCH_SIZE === 0) {
          console.log(`⏳ Processed ${i}/${limitedMarketsToQuery.length} markets, pausing to avoid rate limits...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }

        // If we hit rate limit, stop querying and use what we have
        if (rateLimitHit) {
          console.log('⚠️ Rate limit hit, stopping blockchain queries');
          break;
        }
        try {
          const contract = new ethers.Contract(contractAddress, MARKET_ABI, provider);

          // Get all SharesPurchased events for this user
          const filter = contract.filters.SharesPurchased(walletAddress);
          const events = await contract.queryFilter(filter, -100000); // Look back further

          if (events.length === 0) {
            continue;
          }

          console.log(`📊 Found ${events.length} SharesPurchased events for user in market ${marketId}`);

          // Group events by position (yes/no) and calculate totals
          let totalYesShares = 0;
          let totalNoShares = 0;
          let totalYesCost = 0;
          let totalNoCost = 0;
          let firstYesBetTime: Date | null = null;
          let firstNoBetTime: Date | null = null;
          let lastTxHash = '';

          for (const event of events) {
            const args = (event as any).args;
            const isYes = args.isYes;
            const shares = parseFloat(ethers.formatEther(args.shares));
            const cost = parseFloat(ethers.formatEther(args.cost));
            const timestamp = new Date(Number(args.timestamp) * 1000);
            lastTxHash = event.transactionHash;

            if (isYes) {
              totalYesShares += shares;
              totalYesCost += cost;
              if (!firstYesBetTime) firstYesBetTime = timestamp;
            } else {
              totalNoShares += shares;
              totalNoCost += cost;
              if (!firstNoBetTime) firstNoBetTime = timestamp;
            }
          }

          // Get market info for question and status
          let marketQuestion = '';
          let marketStatus = 1; // Default to Open
          let marketEndTime = 0;
          try {
            const marketInfo = await contract.getMarketInfo();
            marketQuestion = marketInfo.question;
            marketStatus = Number(marketInfo.status);
            marketEndTime = Number(marketInfo.endTime);
          } catch {
            console.warn(`Could not fetch market info for ${marketId}`);
          }

          // Check if market has expired
          const currentTime = Math.floor(Date.now() / 1000);
          const isExpired = marketEndTime > 0 && currentTime > marketEndTime;

          // MarketStatus enum: 0=Submitted, 1=Open, 2=PendingResolution, 3=EvidenceCollection, 4=Resolved, 5=Canceled, 6=Refunded
          const isResolved = marketStatus === 4;
          const isPendingResolution = marketStatus === 2 || marketStatus === 3;

          console.log(`📋 Market ${marketId} status: ${marketStatus} (${isResolved ? 'Resolved' : isPendingResolution ? 'Pending' : 'Open'})`);

          // Check for WinningsPaidOut events to get actual payout amounts
          let userPayoutAmount = 0;
          let payoutTxHash = '';
          if (isResolved) {
            try {
              const payoutFilter = contract.filters.WinningsPaidOut(walletAddress);
              const payoutEvents = await contract.queryFilter(payoutFilter, -100000);
              if (payoutEvents.length > 0) {
                // Sum all payouts for this user in this market
                for (const event of payoutEvents) {
                  const amount = parseFloat(ethers.formatEther((event as any).args.amount));
                  userPayoutAmount += amount;
                  payoutTxHash = event.transactionHash;
                }
                console.log(`💰 Found payout for ${walletAddress} in market ${marketId}: ${userPayoutAmount} CAST`);
              }
            } catch (err) {
              console.warn(`Could not fetch payout events for market ${marketId}:`, err);
            }
          }

          // Create position for YES shares if any
          if (totalYesShares > 0) {
            const odds = totalYesCost > 0 ? totalYesShares / totalYesCost : 2.0;
            let betStatus: 'active' | 'won' | 'lost' | 'pending' = 'active';
            let actualWinning: number | undefined;
            let resolvedAt: Date | undefined;

            // Check if market is resolved
            if (isResolved) {
              try {
                const outcome = await contract.resolvedOutcome();
                const outcomeValue = Number(outcome);
                // Outcome enum: 0=Unset, 1=Yes, 2=No
                const userWon = outcomeValue === 1; // 1 = Yes wins
                betStatus = userWon ? 'won' : 'lost';
                actualWinning = userWon ? userPayoutAmount : 0;
                resolvedAt = new Date(); // Market is resolved
                console.log(`📊 Market ${marketId} resolved: outcome=${outcomeValue}, YES position ${userWon ? 'WON' : 'LOST'}`);
              } catch (err) {
                console.warn(`Could not get resolved outcome for ${marketId}:`, err);
                betStatus = 'pending';
              }
            } else if (isPendingResolution || isExpired) {
              // Market expired or in pending resolution/evidence collection
              betStatus = 'pending';
              resolvedAt = new Date(marketEndTime * 1000); // Expired time
            }

            positions.push({
              id: `${marketId}_${walletAddress}_yes`,
              marketId,
              marketClaim: marketQuestion,
              marketContractAddress: contractAddress,
              position: 'yes',
              amount: totalYesCost,
              odds,
              potentialWinning: totalYesShares,
              potentialReturn: totalYesShares,
              placedAt: firstYesBetTime || new Date(),
              status: betStatus,
              resolvedAt,
              actualWinning,
              blockchainTxId: payoutTxHash || lastTxHash,
              hasNFT: false,
              winningsClaimed: userPayoutAmount > 0 // Auto-payout means already claimed
            });
          }

          // Create position for NO shares if any
          if (totalNoShares > 0) {
            const odds = totalNoCost > 0 ? totalNoShares / totalNoCost : 2.0;
            let betStatus: 'active' | 'won' | 'lost' | 'pending' = 'active';
            let actualWinning: number | undefined;
            let resolvedAt: Date | undefined;

            // Check if market is resolved
            if (isResolved) {
              try {
                const outcome = await contract.resolvedOutcome();
                const outcomeValue = Number(outcome);
                // Outcome enum: 0=Unset, 1=Yes, 2=No
                const userWon = outcomeValue === 2; // 2 = No wins
                betStatus = userWon ? 'won' : 'lost';
                actualWinning = userWon ? userPayoutAmount : 0;
                resolvedAt = new Date(); // Market is resolved
                console.log(`📊 Market ${marketId} resolved: outcome=${outcomeValue}, NO position ${userWon ? 'WON' : 'LOST'}`);
              } catch (err) {
                console.warn(`Could not get resolved outcome for ${marketId}:`, err);
                betStatus = 'pending';
              }
            } else if (isPendingResolution || isExpired) {
              // Market expired or in pending resolution/evidence collection
              betStatus = 'pending';
              resolvedAt = new Date(marketEndTime * 1000); // Expired time
            }

            positions.push({
              id: `${marketId}_${walletAddress}_no`,
              marketId,
              marketClaim: marketQuestion,
              marketContractAddress: contractAddress,
              position: 'no',
              amount: totalNoCost,
              odds,
              potentialWinning: totalNoShares,
              potentialReturn: totalNoShares,
              placedAt: firstNoBetTime || new Date(),
              status: betStatus,
              resolvedAt,
              actualWinning,
              blockchainTxId: payoutTxHash || lastTxHash,
              hasNFT: false,
              winningsClaimed: userPayoutAmount > 0 // Auto-payout means already claimed
            });
          }
        } catch (err: any) {
          const errorMessage = err?.message || err?.toString() || '';
          // Check for rate limit errors
          if (errorMessage.includes('rate limit') || errorMessage.includes('-32005') || errorMessage.includes('BAD_DATA')) {
            console.warn(`⚠️ Rate limit hit for market ${marketId}, falling back to Supabase data`);
            rateLimitHit = true;
          } else {
            console.warn(`Failed to fetch events for market ${marketId}:`, err);
          }
        }
      }

      // If we hit rate limit and have no positions, fall back to Supabase immediately
      if (rateLimitHit && positions.length === 0) {
        console.log('⚠️ Rate limit prevented blockchain queries, using Supabase data directly');
        await loadFromSupabase(walletAddress);
        return;
      }

      console.log(`✅ Found ${positions.length} positions from blockchain events for wallet ${walletAddress}`);

      if (positions.length === 0) {
        // No positions found in blockchain events, check Supabase
        console.log('No blockchain events found, checking Supabase...');
        await loadFromSupabase(walletAddress);
      } else {
        setUserBets(positions);
        // Sync to localStorage for cache
        saveToLocalStorage(walletAddress, positions);
      }

    } catch (err: any) {
      console.error('Error fetching user positions from events:', err);
      setError(err.message || 'Failed to fetch positions');
      // Fallback to Supabase
      await loadFromSupabase(walletAddress);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, marketContracts, loadFromSupabase, saveToLocalStorage]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    userBets,
    isLoading,
    error,
    refetch: fetchPositions
  };
}
