import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { betResolutionService } from '../services/betResolutionService';

export interface MarketUpdate {
  id: string;
  status: string;
  resolution_data?: {
    outcome: string;
    resolvedAt: number;
    confidence?: number;
  };
}

interface UseMarketUpdatesOptions {
  onMarketResolved?: (market: MarketUpdate) => void;
  onMarketUpdated?: (market: MarketUpdate) => void;
  walletAddress?: string;
  enableNotifications?: boolean;
}

/**
 * Custom hook for real-time market updates via Supabase subscriptions
 * Automatically syncs bet status when markets resolve
 */
export function useMarketUpdates(options: UseMarketUpdatesOptions = {}) {
  const {
    onMarketResolved,
    onMarketUpdated,
    walletAddress,
    enableNotifications = true,
  } = options;

  const subscriptionRef = useRef<any>(null);
  const notifiedMarketsRef = useRef<Set<string>>(new Set());

  const showNotification = useCallback((market: MarketUpdate) => {
    if (!enableNotifications || !('Notification' in window)) return;

    // Check if user has bets on this market
    if (!walletAddress) return;

    const userBets = betResolutionService.getUserBets(walletAddress);
    const marketBet = userBets.find(bet => bet.marketId === market.id);

    if (!marketBet) return;

    // Only notify once per market
    if (notifiedMarketsRef.current.has(market.id)) return;
    notifiedMarketsRef.current.add(market.id);

    // Determine if user won or lost
    const won = marketBet.position === market.resolution_data?.outcome;
    const title = won ? '🎉 You Won!' : 'Market Resolved';
    const body = won
      ? `Your prediction was correct! Claim your winnings now.`
      : `The market "${market.id.slice(0, 30)}..." has been resolved.`;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: market.id,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  }, [walletAddress, enableNotifications]);

  const handleMarketUpdate = useCallback((payload: any) => {
    const market = payload.new as MarketUpdate;
    const oldMarket = payload.old as MarketUpdate;

    // Check if market just transitioned to resolved
    const justResolved =
      oldMarket?.status !== 'resolved' &&
      market.status === 'resolved';

    if (justResolved) {
      console.log('🔔 Market resolved:', market.id);

      // Sync bets with new status if wallet connected
      if (walletAddress) {
        betResolutionService.updateBetsForResolvedMarket(
          market.id,
          market.resolution_data?.outcome || '',
          walletAddress
        );
      }

      // Show notification
      showNotification(market);

      // Trigger callback
      onMarketResolved?.(market);
    }

    // Trigger general update callback
    onMarketUpdated?.(market);
  }, [walletAddress, onMarketResolved, onMarketUpdated, showNotification]);

  useEffect(() => {
    // Subscribe to real-time updates on approved_markets table
    const setupSubscription = async () => {
      try {
        subscriptionRef.current = supabase
          .channel('market-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'approved_markets',
            },
            handleMarketUpdate
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to market updates');
            }
          });
      } catch (error) {
        console.error('Failed to subscribe to market updates:', error);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        console.log('🔌 Unsubscribed from market updates');
      }
    };
  }, [handleMarketUpdate]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}
