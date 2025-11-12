/**
 * Evidence Service for BlockCast BSC
 *
 * Handles evidence submission with IPFS storage and Supabase database
 * Replaces Hedera HCS with decentralized IPFS storage
 */

import { supabase } from '../utils/supabase';
import { ipfsService, type EvidenceMetadata } from './ipfsService';
import { walletService } from '../utils/walletService';
import { toast } from 'sonner';

export interface EvidenceSubmission {
  id?: string;
  market_id: string;
  user_id: string;
  wallet_address: string;
  evidence_text: string;
  evidence_files: EvidenceFile[]; // IPFS files
  ipfs_hashes: string[]; // Array of IPFS hashes
  submission_type: 'text' | 'image' | 'document' | 'mixed';
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  ai_analysis?: any; // AI analysis results
  reward_amount?: number; // CAST reward if evidence was valuable
  created_at?: string;
  reviewed_at?: string;
  admin_notes?: string;
}

export interface EvidenceFile {
  type: 'image' | 'document' | 'video';
  ipfsHash: string;
  ipfsUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface SubmitEvidenceParams {
  marketId: string;
  evidenceText: string;
  files?: File[];
}

export interface SubmitEvidenceResult {
  success: boolean;
  evidenceId?: string;
  ipfsHashes?: string[];
  error?: string;
}

class EvidenceService {
  private readonly BASE_REWARD = 50; // Base reward for accepted evidence (in CAST)
  private readonly QUALITY_MULTIPLIER = 2.0; // Multiplier for high-quality evidence

  /**
   * Submit evidence with files to IPFS + Supabase
   */
  async submitEvidence(params: SubmitEvidenceParams): Promise<SubmitEvidenceResult> {
    const { marketId, evidenceText, files = [] } = params;

    try {
      // Validate inputs
      if (!evidenceText.trim() && files.length === 0) {
        return {
          success: false,
          error: 'Please provide evidence text or upload files'
        };
      }

      if (evidenceText.trim().length < 20 && files.length === 0) {
        return {
          success: false,
          error: 'Evidence text must be at least 20 characters'
        };
      }

      // Get wallet address
      const connection = walletService.getConnection();
      if (!connection || !connection.address) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }
      const walletAddress = connection.address;

      // Check IPFS service configuration
      if (files.length > 0 && !ipfsService.isConfigured()) {
        toast.warning('IPFS not configured. Files will not be uploaded. Please add PINATA_API_KEY or IPFS credentials to .env');
      }

      // Upload files to IPFS
      const uploadedFiles: EvidenceFile[] = [];
      const ipfsHashes: string[] = [];

      for (const file of files) {
        toast.info(`Uploading ${file.name} to IPFS...`);

        const metadata: EvidenceMetadata = {
          marketId,
          submitter: walletAddress,
          timestamp: Date.now(),
          type: this.detectFileType(file),
          description: evidenceText.substring(0, 200)
        };

        const uploadResult = await ipfsService.uploadEvidence(file, metadata);

        if (uploadResult.success && uploadResult.ipfsHash && uploadResult.ipfsUrl) {
          uploadedFiles.push({
            type: this.detectFileType(file),
            ipfsHash: uploadResult.ipfsHash,
            ipfsUrl: uploadResult.ipfsUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type
          });
          ipfsHashes.push(uploadResult.ipfsHash);

          toast.success(`✅ ${file.name} uploaded to IPFS`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${uploadResult.error}`);
        }
      }

      // Determine submission type
      const submissionType = this.determineSubmissionType(evidenceText, uploadedFiles);

      // Save to Supabase
      const { data, error } = await supabase
        .from('evidence_submissions')
        .insert({
          market_id: marketId,
          user_id: walletAddress,
          wallet_address: walletAddress,
          evidence_text: evidenceText,
          evidence_files: uploadedFiles,
          ipfs_hashes: ipfsHashes,
          submission_type: submissionType,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return {
          success: false,
          error: `Failed to save evidence: ${error.message}`
        };
      }

      return {
        success: true,
        evidenceId: data.id,
        ipfsHashes: ipfsHashes
      };

    } catch (error) {
      console.error('Evidence submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all evidence for a market
   */
  async getMarketEvidence(marketId: string): Promise<EvidenceSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evidence:', error);
        return [];
      }

      return data as EvidenceSubmission[];
    } catch (error) {
      console.error('Error fetching market evidence:', error);
      return [];
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(evidenceId: string): Promise<EvidenceSubmission | null> {
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('id', evidenceId)
        .single();

      if (error) {
        console.error('Error fetching evidence:', error);
        return null;
      }

      return data as EvidenceSubmission;
    } catch (error) {
      console.error('Error fetching evidence by ID:', error);
      return null;
    }
  }

  /**
   * Get user's evidence submissions
   */
  async getUserEvidence(walletAddress: string): Promise<EvidenceSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user evidence:', error);
        return [];
      }

      return data as EvidenceSubmission[];
    } catch (error) {
      console.error('Error fetching user evidence:', error);
      return [];
    }
  }

  /**
   * Update evidence status (admin only)
   */
  async updateEvidenceStatus(
    evidenceId: string,
    status: 'reviewed' | 'accepted' | 'rejected',
    adminNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('evidence_submissions')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', evidenceId);

      if (error) {
        console.error('Error updating evidence status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating evidence status:', error);
      return false;
    }
  }

  /**
   * Reward evidence submitter (admin only)
   */
  async rewardEvidence(
    evidenceId: string,
    rewardAmount: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('evidence_submissions')
        .update({
          reward_amount: rewardAmount,
          status: 'accepted'
        })
        .eq('id', evidenceId);

      if (error) {
        console.error('Error rewarding evidence:', error);
        return false;
      }

      // TODO: Transfer CAST tokens on-chain
      toast.success(`Evidence rewarded with ${rewardAmount} CAST tokens!`);

      return true;
    } catch (error) {
      console.error('Error rewarding evidence:', error);
      return false;
    }
  }

  /**
   * Get pending evidence (for admin review)
   */
  async getPendingEvidence(): Promise<EvidenceSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending evidence:', error);
        return [];
      }

      return data as EvidenceSubmission[];
    } catch (error) {
      console.error('Error fetching pending evidence:', error);
      return [];
    }
  }

  /**
   * Delete evidence (user only, before review)
   */
  async deleteEvidence(evidenceId: string, walletAddress: string): Promise<boolean> {
    try {
      // First check if evidence is pending and belongs to user
      const { data: evidence, error: fetchError } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('id', evidenceId)
        .eq('wallet_address', walletAddress)
        .eq('status', 'pending')
        .single();

      if (fetchError || !evidence) {
        toast.error('Evidence not found or already reviewed');
        return false;
      }

      // Delete from database
      const { error } = await supabase
        .from('evidence_submissions')
        .delete()
        .eq('id', evidenceId);

      if (error) {
        console.error('Error deleting evidence:', error);
        return false;
      }

      toast.success('Evidence deleted');
      return true;
    } catch (error) {
      console.error('Error deleting evidence:', error);
      return false;
    }
  }

  /**
   * Helper: Detect file type from File object
   */
  private detectFileType(file: File): 'image' | 'document' | 'video' {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  }

  /**
   * Helper: Determine overall submission type
   */
  private determineSubmissionType(text: string, files: EvidenceFile[]): 'text' | 'image' | 'document' | 'mixed' {
    if (files.length === 0) return 'text';
    if (files.length === 1 && files[0].type === 'image' && !text.trim()) return 'image';
    if (files.length === 1 && files[0].type === 'document' && !text.trim()) return 'document';
    return 'mixed';
  }

  /**
   * Get IPFS gateway URL for a hash
   */
  getIpfsUrl(ipfsHash: string): string {
    return ipfsService.getGatewayUrl(ipfsHash);
  }

  /**
   * Check if IPFS is configured
   */
  isIpfsConfigured(): boolean {
    return ipfsService.isConfigured();
  }
}

// Export singleton instance
export const evidenceService = new EvidenceService();

// Export types
export type { EvidenceMetadata };
