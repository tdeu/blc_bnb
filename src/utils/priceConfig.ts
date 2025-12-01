/**
 * Price Configuration Utility
 * Manages admin-configurable price settings stored in localStorage
 */

export interface PriceConfig {
  bnbPriceUSD: number;
  castToBnbRate: number; // 1 CAST = X BNB (default 0.02, meaning 50 CAST = 1 BNB)
  lastUpdated: number;
}

const STORAGE_KEY = 'treasury_price_config';

const DEFAULT_CONFIG: PriceConfig = {
  bnbPriceUSD: 600,
  castToBnbRate: 0.02, // 1 CAST = 0.02 BNB (50 CAST = 1 BNB)
  lastUpdated: Date.now(),
};

/**
 * Get the current price configuration
 */
export function getPriceConfig(): PriceConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      };
    }
  } catch (error) {
    console.warn('Failed to load price config, using defaults:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Update the price configuration
 */
export function setPriceConfig(config: Partial<PriceConfig>): PriceConfig {
  const current = getPriceConfig();
  const updated: PriceConfig = {
    ...current,
    ...config,
    lastUpdated: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save price config:', error);
  }

  return updated;
}

/**
 * Convert BNB amount to USD
 */
export function bnbToUSD(bnbAmount: number, config?: PriceConfig): number {
  const priceConfig = config || getPriceConfig();
  return bnbAmount * priceConfig.bnbPriceUSD;
}

/**
 * Convert CAST amount to USD
 */
export function castToUSD(castAmount: number, config?: PriceConfig): number {
  const priceConfig = config || getPriceConfig();
  const castInBnb = castAmount * priceConfig.castToBnbRate;
  return castInBnb * priceConfig.bnbPriceUSD;
}

/**
 * Convert CAST amount to BNB
 */
export function castToBNB(castAmount: number, config?: PriceConfig): number {
  const priceConfig = config || getPriceConfig();
  return castAmount * priceConfig.castToBnbRate;
}

/**
 * Format USD value for display
 */
export function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format crypto with USD equivalent
 */
export function formatWithUSD(amount: number, symbol: 'BNB' | 'CAST', config?: PriceConfig): string {
  const priceConfig = config || getPriceConfig();
  const usdValue = symbol === 'BNB' ? bnbToUSD(amount, priceConfig) : castToUSD(amount, priceConfig);
  return `${amount.toFixed(4)} ${symbol} (~${formatUSD(usdValue)})`;
}

/**
 * Get time since last price update
 */
export function getTimeSinceUpdate(config?: PriceConfig): string {
  const priceConfig = config || getPriceConfig();
  const diff = Date.now() - priceConfig.lastUpdated;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Calculate TVL in USD
 * TVL = BNB value + CAST value (converted to USD)
 */
export function calculateTVL(
  bnbAmount: number,
  castAmount: number,
  config?: PriceConfig
): { tvlUSD: number; bnbUSD: number; castUSD: number } {
  const priceConfig = config || getPriceConfig();
  const bnbUSD = bnbToUSD(bnbAmount, priceConfig);
  const castUSD = castToUSD(castAmount, priceConfig);

  return {
    tvlUSD: bnbUSD + castUSD,
    bnbUSD,
    castUSD,
  };
}

/**
 * Determine treasury health status
 */
export type HealthStatus = 'healthy' | 'moderate' | 'low';

export function getTreasuryHealthStatus(
  tvlUSD: number,
  bnbBalance: number
): { status: HealthStatus; label: string; color: string } {
  if (tvlUSD > 10000 && bnbBalance > 1) {
    return { status: 'healthy', label: 'Healthy', color: 'green' };
  }
  if (tvlUSD > 1000 || bnbBalance > 0.1) {
    return { status: 'moderate', label: 'Moderate', color: 'yellow' };
  }
  return { status: 'low', label: 'Low', color: 'red' };
}
