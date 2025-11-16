import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Only create client if both URL and key are available
export const supabase = (supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface ApprovedMarket {
  id: string;
  claim: string;
  description?: string;
  category: string;
  country: string;
  region: string;
  market_type: string;
  confidence_level: string;
  expires_at: string;
  created_at: string;
  approved_at: string;
  approved_by: string;
  approval_reason?: string;
  submitter_address: string;
  contract_address?: string;
  image_url?: string;
  // Market odds and volume (fetched from blockchain)
  yes_odds?: number;
  no_odds?: number;
  volume?: number;
  // New resolution fields
  status?: 'active' | 'pending_resolution' | 'disputing' | 'resolved' | 'disputed_resolution' | 'locked' | 'evidence_collection';
  resolution_data?: any;
  dispute_count?: number;
  dispute_period_end?: string;
  // Evidence collection period fields
  evidence_period_start?: string;
  evidence_period_end?: string;
}

export interface MarketResolution {
  id: string;
  market_id: string;
  outcome?: 'yes' | 'no';
  source: string;
  api_data?: any;
  confidence?: 'high' | 'medium' | 'low' | number;
  timestamp: string;
  dispute_period_end: string;
  final_outcome?: 'yes' | 'no';
  resolved_by?: 'api' | 'admin' | 'contract' | 'pending';
  admin_notes?: string;
  // BNB Chain / Blockchain fields
  contract_id?: string;
  transaction_id?: string;
  consensus_timestamp?: string;
  // Evidence-based resolution fields
  gemini_fallback_used?: string;
  perplexity_result?: any;
  gemini_result?: any;
  evidence_based_resolution?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketDispute {
  id: string;
  market_id: string;
  resolution_id?: string;
  user_id: string;
  dispute_reason: string;
  evidence_url?: string;
  evidence_description?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'contract_processing';
  admin_response?: string;
  // Hedera fields
  bond_amount?: number;
  bond_transaction_id?: string;
  hcs_message_id?: string;
  arbitration_contract_id?: string;
  bond_refund_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketEvidence {
  id: string;
  market_id: string;
  user_address: string;
  ipfs_hash: string;
  evidence_type: 'screenshot' | 'article' | 'official_document' | 'social_media' | 'other';
  title: string;
  description?: string;
  source_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

// Legacy Hedera interfaces removed - now using BNB Chain + IPFS
// HCSTopic and HTSToken are no longer used

export interface APIIntegrationLog {
  id: string;
  market_id?: string;
  api_source: string;
  request_data?: any;
  response_data?: any;
  success: boolean;
  error_message?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface ResolutionSettings {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// Image upload utility function
export const uploadMarketImage = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `market-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `market-images/${fileName}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('market-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);

      // If bucket doesn't exist, provide helpful error message
      if (error.message.includes('Bucket not found')) {
        return {
          success: false,
          error: 'Storage bucket not found. Please create the "market-assets" bucket in your Supabase dashboard under Storage.'
        };
      }

      return { success: false, error: error.message };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('market-assets')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};