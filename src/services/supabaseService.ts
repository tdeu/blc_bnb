import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MarketInfo } from './marketMonitorService';

// Database types
export interface DatabaseMarket {
  id: string;
  question: string;
  creator_address: string;
  contract_address: string;
  end_time: string;
  status: 'active' | 'expired' | 'resolved' | 'processing';
  created_at: string;
  updated_at: string;
  ai_confidence_score?: number;
  resolution?: 'YES' | 'NO' | 'INVALID';
  resolved_by?: string;
  resolved_at?: string;
  resolution_reason?: string;
  dispute_count?: number;
  total_rewards_distributed?: number;
}

export interface DatabaseEvidence {
  id: string;
  market_id: string;
  submitter_address: string;
  content: string;
  evidence_type: 'text' | 'url' | 'file';
  credibility_score?: number;
  language: string;
  hcs_message_id?: string;
  ipfs_hash?: string;
  created_at: string;
  is_validated: boolean;
}

export interface DatabaseResolutionJob {
  id: string;
  market_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_analysis?: any;
  attempts: number;
  error_message?: string;
  scheduled_at: string;
  processed_at?: string;
  created_at: string;
}

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');
  }

  // ==================== MARKET OPERATIONS ====================

  /**
   * Get all active markets
   */
  async getActiveMarkets(): Promise<MarketInfo[]> {
    try {
      const { data, error } = await this.supabase
        .from('approved_markets')
        .select('*')
        .in('status', ['active', 'pending_resolution']);

      if (error) {
        console.error('❌ Error fetching active markets:', error);
        throw error;
      }

      return (data || []).map(this.approvedMarketToMarketInfo);
    } catch (error) {
      console.error('❌ Failed to get active markets:', error);
      throw error;
    }
  }

  /**
   * Get markets in pending_resolution status (for final resolution executor)
   */
  async getMarketsInPendingResolution(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('approved_markets')
        .select('*')
        .eq('status', 'pending_resolution');

      if (error) {
        console.error('❌ Error fetching markets in pending resolution:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get markets in pending resolution:', error);
      throw error;
    }
  }

  /**
   * Get a specific market by ID
   */
  async getMarket(marketId: string): Promise<MarketInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('approved_markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Market not found
        }
        console.error(`❌ Error fetching market ${marketId}:`, error);
        throw error;
      }

      return this.approvedMarketToMarketInfo(data);
    } catch (error) {
      console.error(`❌ Failed to get market ${marketId}:`, error);
      throw error;
    }
  }

  /**
   * Update market status
   */
  async updateMarketStatus(marketId: string, status: MarketInfo['status'], additionalData?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        ...additionalData
      };

      const { error } = await this.supabase
        .from('approved_markets')
        .update(updateData)
        .eq('id', marketId);

      if (error) {
        console.error(`❌ Error updating market ${marketId} status:`, error);
        throw error;
      }

      console.log(`✅ Market ${marketId} status updated to: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update market ${marketId} status:`, error);
      throw error;
    }
  }

  /**
   * Create a new market
   */
  async createMarket(market: Omit<DatabaseMarket, 'created_at' | 'updated_at'>): Promise<DatabaseMarket> {
    try {
      const newMarket: DatabaseMarket = {
        ...market,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('markets')
        .insert(newMarket)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating market:', error);
        throw error;
      }

      console.log(`✅ Market created: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to create market:', error);
      throw error;
    }
  }

  // ==================== EVIDENCE OPERATIONS ====================

  /**
   * Get evidence for a market
   */
  async getMarketEvidence(marketId: string): Promise<DatabaseEvidence[]> {
    try {
      const { data, error } = await this.supabase
        .from('evidence')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`❌ Error fetching evidence for market ${marketId}:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Failed to get evidence for market ${marketId}:`, error);
      throw error;
    }
  }

  /**
   * Add new evidence for a market
   */
  async addEvidence(evidence: Omit<DatabaseEvidence, 'id' | 'created_at'>): Promise<DatabaseEvidence> {
    try {
      const newEvidence: Omit<DatabaseEvidence, 'id'> = {
        ...evidence,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('evidence')
        .insert(newEvidence)
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding evidence:', error);
        throw error;
      }

      console.log(`✅ Evidence added for market ${evidence.market_id}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to add evidence:', error);
      throw error;
    }
  }

  // ==================== RESOLUTION JOB OPERATIONS ====================

  /**
   * Create a resolution job
   */
  async createResolutionJob(job: Omit<DatabaseResolutionJob, 'id' | 'created_at'>): Promise<DatabaseResolutionJob> {
    try {
      const newJob: Omit<DatabaseResolutionJob, 'id'> = {
        ...job,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('resolution_jobs')
        .insert(newJob)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating resolution job:', error);
        throw error;
      }

      console.log(`✅ Resolution job created for market ${job.market_id}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to create resolution job:', error);
      throw error;
    }
  }

  /**
   * Update resolution job status
   */
  async updateResolutionJob(jobId: string, updates: Partial<DatabaseResolutionJob>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('resolution_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) {
        console.error(`❌ Error updating resolution job ${jobId}:`, error);
        throw error;
      }

      console.log(`✅ Resolution job ${jobId} updated`);
    } catch (error) {
      console.error(`❌ Failed to update resolution job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending resolution jobs
   */
  async getPendingResolutionJobs(): Promise<DatabaseResolutionJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('resolution_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching pending resolution jobs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get pending resolution jobs:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Convert database market to MarketInfo
   */
  private databaseToMarketInfo(dbMarket: DatabaseMarket): MarketInfo {
    return {
      id: dbMarket.id,
      contractAddress: dbMarket.contract_address,
      endTime: new Date(dbMarket.end_time),
      status: dbMarket.status,
      question: dbMarket.question,
      creator: dbMarket.creator_address,
      lastChecked: new Date(dbMarket.updated_at)
    };
  }

  /**
   * Convert approved market to MarketInfo
   */
  private approvedMarketToMarketInfo(approvedMarket: any): MarketInfo {
    return {
      id: approvedMarket.id,
      contractAddress: approvedMarket.contract_address || 'pending',
      endTime: new Date(approvedMarket.expires_at),
      status: approvedMarket.status || 'active',
      question: approvedMarket.claim,
      creator: approvedMarket.submitter_address,
      lastChecked: new Date()
    };
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<{connected: boolean, error?: string}> {
    try {
      const { error } = await this.supabase
        .from('approved_markets')
        .select('id')
        .limit(1);

      if (error) {
        return { connected: false, error: error.message };
      }

      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create initial database schema (for development)
   */
  async initializeSchema(): Promise<void> {
    console.log('🗄️ Note: Database schema should be created via Supabase dashboard');
    console.log('Required tables: markets, evidence, resolution_jobs');

    // In a real implementation, you would run this via Supabase migrations
    // This is just documentation of the required schema

    const schemaSQL = `
    -- Markets table
    CREATE TABLE markets (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      creator_address TEXT NOT NULL,
      contract_address TEXT NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'resolved', 'processing')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      ai_confidence_score NUMERIC,
      resolution TEXT CHECK (resolution IN ('YES', 'NO', 'INVALID')),
      resolved_by TEXT,
      resolved_at TIMESTAMPTZ,
      resolution_reason TEXT,
      dispute_count INTEGER DEFAULT 0,
      total_rewards_distributed NUMERIC DEFAULT 0
    );

    -- Evidence table
    CREATE TABLE evidence (
      id SERIAL PRIMARY KEY,
      market_id TEXT REFERENCES markets(id),
      submitter_address TEXT NOT NULL,
      content TEXT NOT NULL,
      evidence_type TEXT NOT NULL CHECK (evidence_type IN ('text', 'url', 'file')),
      credibility_score NUMERIC,
      language TEXT NOT NULL DEFAULT 'en',
      hcs_message_id TEXT,
      ipfs_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_validated BOOLEAN DEFAULT FALSE
    );

    -- Resolution jobs table
    CREATE TABLE resolution_jobs (
      id SERIAL PRIMARY KEY,
      market_id TEXT REFERENCES markets(id),
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      ai_analysis JSONB,
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_markets_status ON markets(status);
    CREATE INDEX idx_markets_end_time ON markets(end_time);
    CREATE INDEX idx_evidence_market_id ON evidence(market_id);
    CREATE INDEX idx_resolution_jobs_status ON resolution_jobs(status);
    `;

    console.log('📋 Schema SQL (run this in Supabase dashboard):');
    console.log(schemaSQL);
  }
}