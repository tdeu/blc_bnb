/**
 * Time Utilities
 *
 * Fixes timezone issues once and for all!
 *
 * IMPORTANT: Always use these functions when working with market expiration dates
 */

/**
 * Get current UTC timestamp in seconds (for blockchain)
 */
export function getCurrentUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Convert a Date object to Unix timestamp (seconds) in UTC
 */
export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert Unix timestamp (seconds) to Date object
 */
export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Check if a date is in the future (with optional buffer in seconds)
 */
export function isFutureDate(date: Date, bufferSeconds: number = 0): boolean {
  const nowUnix = getCurrentUnixTimestamp();
  const dateUnix = dateToUnixTimestamp(date);
  return dateUnix > (nowUnix + bufferSeconds);
}

/**
 * Get time difference in seconds between two dates
 */
export function getTimeDifferenceSeconds(date1: Date, date2: Date): number {
  return Math.abs(dateToUnixTimestamp(date1) - dateToUnixTimestamp(date2));
}

/**
 * Format a date for display (respects user's local timezone)
 */
export function formatDateLocal(date: Date): string {
  return date.toLocaleString();
}

/**
 * Format a date for display in ISO format (UTC)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/**
 * Add seconds to a date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + (seconds * 1000));
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  return addSeconds(date, hours * 3600);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24);
}

/**
 * BLOCKCHAIN CLOCK DRIFT CONSTANT
 * Hedera testnet clock runs 3 hours ahead of real UTC time
 * Measured: 180 minutes (10,800 seconds) as of 2025-10-06
 */
export const BLOCKCHAIN_CLOCK_DRIFT_SECONDS = 10800; // 3 hours

/**
 * Adjust a user-selected date by adding blockchain clock drift
 * This creates better UX - users select the REAL expiration time they want,
 * and we automatically add the drift so blockchain accepts it
 *
 * @param userSelectedDate - The date the user wants the market to expire
 * @returns Adjusted date with blockchain drift added
 */
export function adjustDateForBlockchainDrift(userSelectedDate: Date): Date {
  return addSeconds(userSelectedDate, BLOCKCHAIN_CLOCK_DRIFT_SECONDS);
}

/**
 * Validate that a date is valid for market creation
 * Returns { valid: boolean, error?: string }
 *
 * NOTE: Validation is lenient - just checks if date is in the future.
 * The actual blockchain submission will use adjustDateForBlockchainDrift()
 */
export function validateMarketExpirationDate(date: Date, minFutureSeconds: number = 60): {
  valid: boolean;
  error?: string;
} {
  const now = Date.now();
  const dateMs = date.getTime();

  // Check if date is valid
  if (isNaN(dateMs)) {
    return { valid: false, error: 'Invalid date' };
  }

  // Check if date is in the future
  const diffMs = dateMs - now;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds <= 0) {
    return {
      valid: false,
      error: `Expiration date must be in the future. You selected a date ${Math.abs(diffSeconds)} seconds in the past.`
    };
  }

  // Simple minimum check (1 minute by default)
  if (diffSeconds < minFutureSeconds) {
    const minMinutes = Math.ceil(minFutureSeconds / 60);
    const selectedMinutes = Math.floor(diffSeconds / 60);
    return {
      valid: false,
      error: `Expiration date must be at least ${minMinutes} minute${minMinutes > 1 ? 's' : ''} in the future. You selected ${selectedMinutes} minute${selectedMinutes !== 1 ? 's' : ''}.`
    };
  }

  return { valid: true };
}

/**
 * Debug time comparison (useful for logging)
 */
export function debugTimeComparison(date: Date, label: string = 'Date'): void {
  const nowMs = Date.now();
  const nowUnix = getCurrentUnixTimestamp();
  const dateMs = date.getTime();
  const dateUnix = dateToUnixTimestamp(date);

  console.log(`🕐 ${label} Debug:`, {
    dateISO: date.toISOString(),
    dateLocal: date.toLocaleString(),
    dateUnix,
    nowUnix,
    nowISO: new Date().toISOString(),
    nowLocal: new Date().toLocaleString(),
    diffSeconds: dateUnix - nowUnix,
    diffMinutes: Math.floor((dateUnix - nowUnix) / 60),
    diffHours: Math.floor((dateUnix - nowUnix) / 3600),
    isFuture: dateUnix > nowUnix
  });
}
