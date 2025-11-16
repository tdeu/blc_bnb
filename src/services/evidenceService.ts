/**
 * Evidence Service for BlockCast Market Resolution
 *
 * Handles evidence submission, storage (IPFS + Supabase), and retrieval
 * for markets in evidence_collection status (48h period).
 */

import { supabase, MarketEvidence } from '../utils/supabase';
import { ipfsService } from './ipfsService';

export interface SubmitEvidenceInput {
  marketId: string;
  userAddress: string;
  evidenceType: MarketEvidence['evidence_type'];
  title: string;
  description?: string;
  sourceUrl?: string;
  file?: File;
  textContent?: string; // For text-only evidence
}

export interface SubmitEvidenceResult {
  success: boolean;
  evidence?: MarketEvidence;
  error?: string;
}

export interface EvidenceListResult {
  success: boolean;
  evidences?: MarketEvidence[];
  error?: string;
}

class EvidenceService {
  /**
   * Submit new evidence for a market in evidence_collection status
   */
  async submitEvidence(input: SubmitEvidenceInput): Promise<SubmitEvidenceResult> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // 1. Verify market is in evidence_collection status
      const { data: market, error: marketError } = await supabase
        .from('approved_markets')
        .select('status, evidence_period_end')
        .eq('id', input.marketId)
        .single();

      if (marketError || !market) {
        return { success: false, error: 'Market not found' };
      }

      if (market.status !== 'evidence_collection') {
        return {
          success: false,
          error: `Market is not accepting evidence. Current status: ${market.status}`
        };
      }

      // Check if evidence period has expired
      if (market.evidence_period_end && new Date(market.evidence_period_end) < new Date()) {
        return {
          success: false,
          error: 'Evidence collection period has ended'
        };
      }

      // 2. Upload to IPFS
      let ipfsHash: string;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let mimeType: string | undefined;

      if (input.file) {
        // Upload file to IPFS
        const uploadResult = await ipfsService.uploadEvidence(input.file, {
          marketId: input.marketId,
          submitter: input.userAddress,
          timestamp: Date.now(),
          type: this.mapEvidenceTypeToIPFS(input.evidenceType),
          description: input.description
        });

        if (!uploadResult.success || !uploadResult.ipfsHash) {
          return {
            success: false,
            error: `IPFS upload failed: ${uploadResult.error}`
          };
        }

        ipfsHash = uploadResult.ipfsHash;
        fileName = input.file.name;
        fileSize = input.file.size;
        mimeType = input.file.type;
      } else if (input.textContent) {
        // Upload text content to IPFS
        const uploadResult = await ipfsService.uploadTextEvidence(input.textContent, {
          marketId: input.marketId,
          submitter: input.userAddress,
          timestamp: Date.now(),
          type: 'text',
          description: input.description
        });

        if (!uploadResult.success || !uploadResult.ipfsHash) {
          return {
            success: false,
            error: `IPFS upload failed: ${uploadResult.error}`
          };
        }

        ipfsHash = uploadResult.ipfsHash;
        mimeType = 'text/plain';
        fileSize = new Blob([input.textContent]).size;
      } else {
        return { success: false, error: 'Either file or textContent must be provided' };
      }

      // 3. Store evidence record in Supabase
      const evidenceRecord = {
        market_id: input.marketId,
        user_address: input.userAddress,
        ipfs_hash: ipfsHash,
        evidence_type: input.evidenceType,
        title: input.title,
        description: input.description || null,
        source_url: input.sourceUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        mime_type: mimeType || null
      };

      const { data: insertedEvidence, error: insertError } = await supabase
        .from('market_evidences')
        .insert(evidenceRecord)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to store evidence in database:', insertError);
        return {
          success: false,
          error: `Database error: ${insertError.message}`
        };
      }

      console.log(`✅ Evidence submitted for market ${input.marketId}`);
      console.log(`   IPFS Hash: ${ipfsHash}`);
      console.log(`   Type: ${input.evidenceType}`);
      console.log(`   Submitter: ${input.userAddress}`);

      return {
        success: true,
        evidence: insertedEvidence as MarketEvidence
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
   * Get all evidences for a specific market
   */
  async getMarketEvidences(marketId: string): Promise<EvidenceListResult> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: evidences, error } = await supabase
        .from('market_evidences')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        evidences: evidences as MarketEvidence[]
      };
    } catch (error) {
      console.error('Error fetching evidences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get evidence count for a market
   */
  async getEvidenceCount(marketId: string): Promise<number> {
    if (!supabase) return 0;

    try {
      const { count, error } = await supabase
        .from('market_evidences')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId);

      if (error) {
        console.error('Error counting evidences:', error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get IPFS gateway URL for an evidence
   */
  getEvidenceUrl(ipfsHash: string): string {
    return ipfsService.getGatewayUrl(ipfsHash);
  }

  /**
   * Compile all evidences into a summary for AI re-analysis
   */
  async compileEvidenceSummary(marketId: string): Promise<string> {
    const result = await this.getMarketEvidences(marketId);

    if (!result.success || !result.evidences || result.evidences.length === 0) {
      return 'No user-submitted evidences available.';
    }

    let summary = `## User-Submitted Evidences (${result.evidences.length} total)\n\n`;

    for (let i = 0; i < result.evidences.length; i++) {
      const evidence = result.evidences[i];
      summary += `### Evidence ${i + 1}: ${evidence.title}\n`;
      summary += `- **Type**: ${this.formatEvidenceType(evidence.evidence_type)}\n`;
      summary += `- **Submitted by**: ${evidence.user_address.slice(0, 8)}...${evidence.user_address.slice(-6)}\n`;
      summary += `- **Date**: ${new Date(evidence.created_at).toLocaleString()}\n`;

      if (evidence.description) {
        summary += `- **Description**: ${evidence.description}\n`;
      }

      if (evidence.source_url) {
        summary += `- **Source URL**: ${evidence.source_url}\n`;
      }

      summary += `- **IPFS Link**: ${this.getEvidenceUrl(evidence.ipfs_hash)}\n`;
      summary += '\n';
    }

    return summary;
  }

  /**
   * Map evidence type to IPFS metadata type
   */
  private mapEvidenceTypeToIPFS(type: MarketEvidence['evidence_type']): 'image' | 'document' | 'video' | 'text' {
    switch (type) {
      case 'screenshot':
        return 'image';
      case 'article':
      case 'official_document':
        return 'document';
      case 'social_media':
      case 'other':
      default:
        return 'text';
    }
  }

  /**
   * Format evidence type for display
   */
  private formatEvidenceType(type: string): string {
    switch (type) {
      case 'screenshot':
        return '📸 Screenshot';
      case 'article':
        return '📰 News Article';
      case 'official_document':
        return '📄 Official Document';
      case 'social_media':
        return '💬 Social Media Post';
      case 'other':
        return '📎 Other';
      default:
        return type;
    }
  }

  /**
   * Check if IPFS service is properly configured
   */
  isConfigured(): boolean {
    return ipfsService.isConfigured();
  }
}

// Export singleton instance
export const evidenceService = new EvidenceService();
