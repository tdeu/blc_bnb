/**
 * Migration utility to transfer predictions from localStorage to Supabase
 *
 * This handles the one-time migration of existing predictions stored locally
 * to the shared Supabase database for cross-user synchronization.
 */

import { supabase } from './supabase';
import { predictionService } from '../services/predictionService';

interface LocalBet {
  id: string;
  marketId: string;
  marketClaim: string;
  position: 'yes' | 'no';
  amount: number;
  shares: string;
  transactionHash: string;
  placedAt: Date | string;
  status: string;
  marketStatus: string;
  potentialReturn?: number;
  walletAddress?: string;
  odds?: number;
  marketContractAddress?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

/**
 * Get all localStorage keys that contain bet data
 */
function getAllLocalStorageBetKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('user_bets_') || key.startsWith('market_bets_'))) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Extract unique bets from all localStorage keys
 * Avoids duplicates by using bet ID as unique identifier
 */
function extractUniqueBets(): Map<string, LocalBet> {
  const uniqueBets = new Map<string, LocalBet>();
  const keys = getAllLocalStorageBetKeys();

  for (const key of keys) {
    try {
      const data = localStorage.getItem(key);
      if (!data) continue;

      const bets: LocalBet[] = JSON.parse(data);
      for (const bet of bets) {
        if (bet.id && !uniqueBets.has(bet.id)) {
          // Ensure placedAt is a Date object
          if (typeof bet.placedAt === 'string') {
            bet.placedAt = new Date(bet.placedAt);
          }
          uniqueBets.set(bet.id, bet);
        }
      }
    } catch (error) {
      console.error(`Error parsing localStorage key ${key}:`, error);
    }
  }

  return uniqueBets;
}

/**
 * Check if a prediction already exists in Supabase
 */
async function predictionExistsInSupabase(betId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('market_predictions')
      .select('id')
      .eq('id', betId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error when not found

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Migrate a single bet to Supabase
 */
async function migrateBetToSupabase(bet: LocalBet): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  if (!bet.walletAddress) {
    return { success: false, error: 'Missing wallet address' };
  }

  try {
    const predictionRecord = {
      id: bet.id,
      market_id: bet.marketId,
      user_address: bet.walletAddress.toLowerCase(),
      position: bet.position,
      amount: bet.amount,
      shares: bet.shares || null,
      odds: bet.odds || null,
      potential_return: bet.potentialReturn || bet.amount * 2,
      transaction_hash: bet.transactionHash || 'pending',
      transaction_status: bet.transactionHash && bet.transactionHash !== 'pending'
        ? 'confirmed'
        : 'pending',
      market_contract_address: bet.marketContractAddress || null,
      created_at: bet.placedAt instanceof Date
        ? bet.placedAt.toISOString()
        : new Date(bet.placedAt).toISOString()
    };

    const { error } = await supabase
      .from('market_predictions')
      .insert(predictionRecord);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main migration function - migrates all localStorage bets to Supabase
 */
export async function migrateLocalStoragePredictions(): Promise<MigrationResult> {
  console.log('🚀 Starting localStorage to Supabase prediction migration...');

  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: []
  };

  if (!supabase) {
    console.error('❌ Supabase not configured');
    result.success = false;
    result.errors.push('Supabase not configured');
    return result;
  }

  // Extract all unique bets
  const uniqueBets = extractUniqueBets();
  console.log(`📊 Found ${uniqueBets.size} unique bets in localStorage`);

  if (uniqueBets.size === 0) {
    console.log('✅ No bets to migrate');
    return result;
  }

  // Migrate each bet
  for (const [betId, bet] of uniqueBets) {
    try {
      // Check if already exists
      const exists = await predictionExistsInSupabase(betId);
      if (exists) {
        console.log(`⏭️ Bet ${betId} already exists in Supabase, skipping`);
        result.skippedCount++;
        continue;
      }

      // Migrate the bet
      const migrationResult = await migrateBetToSupabase(bet);
      if (migrationResult.success) {
        console.log(`✅ Migrated bet ${betId}`);
        result.migratedCount++;
      } else {
        console.error(`❌ Failed to migrate bet ${betId}: ${migrationResult.error}`);
        result.errorCount++;
        result.errors.push(`Bet ${betId}: ${migrationResult.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error migrating bet ${betId}:`, error);
      result.errorCount++;
      result.errors.push(`Bet ${betId}: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${result.migratedCount}`);
  console.log(`   ⏭️ Skipped: ${result.skippedCount}`);
  console.log(`   ❌ Errors: ${result.errorCount}`);

  if (result.errorCount > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.forEach((error) => console.log(`   - ${error}`));
    result.success = false;
  } else {
    console.log('\n✅ Migration completed successfully!');
  }

  return result;
}

/**
 * Get migration status - how many local bets exist vs how many are in Supabase
 */
export async function getMigrationStatus(): Promise<{
  localBetsCount: number;
  supabaseBetsCount: number;
  needsMigration: boolean;
}> {
  const uniqueBets = extractUniqueBets();
  const localCount = uniqueBets.size;

  if (!supabase) {
    return {
      localBetsCount: localCount,
      supabaseBetsCount: 0,
      needsMigration: localCount > 0
    };
  }

  try {
    const { count } = await supabase
      .from('market_predictions')
      .select('*', { count: 'exact', head: true });

    return {
      localBetsCount: localCount,
      supabaseBetsCount: count || 0,
      needsMigration: localCount > (count || 0)
    };
  } catch {
    return {
      localBetsCount: localCount,
      supabaseBetsCount: 0,
      needsMigration: localCount > 0
    };
  }
}
