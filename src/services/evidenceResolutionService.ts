/**
 * Evidence Resolution Service
 *
 * Handles re-running AI resolution with user-submitted evidences
 * for markets in evidence_collection status (48h period)
 */

import { perplexityResolutionService } from './perplexityResolutionService';
import { geminiResolutionService } from './geminiResolutionService';
import { resolutionService } from '../utils/resolutionService';
import { createClient } from '@supabase/supabase-js';

interface EvidenceResolutionInput {
  marketId: string;
  claim: string;
  description?: string;
  contractAddress?: string;
  evidenceSummary: string;
}

interface EvidenceResolutionResult {
  success: boolean;
  outcome?: 'yes' | 'no';
  confidence?: number;
  reasoning?: string;
  source?: string;
  error?: string;
}

class EvidenceResolutionService {
  private supabase: ReturnType<typeof createClient> | null = null;

  constructor() {
    // Initialize Supabase for server-side
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Re-run AI resolution with evidence context
   */
  async resolveWithEvidence(input: EvidenceResolutionInput): Promise<EvidenceResolutionResult> {
    console.log('🔄 Re-running AI resolution with evidence...');
    console.log(`   Market ID: ${input.marketId}`);
    console.log(`   Claim: ${input.claim}`);
    console.log(`   Evidence Summary Length: ${input.evidenceSummary.length} chars`);

    try {
      // Create enhanced prompt with evidence
      const enhancedDescription = `
${input.description || 'No additional description provided.'}

---

## IMPORTANT: User-Submitted Evidence

The following evidence has been submitted by users to help verify the market outcome. Please carefully analyze this evidence in addition to your own research.

${input.evidenceSummary}

---

Based on the above evidence and your own verification, determine if the claim is TRUE (yes) or FALSE (no).
`;

      // Try Perplexity first with enhanced context
      console.log('🔍 Calling Perplexity with evidence context...');
      const perplexityResult = await perplexityResolutionService.resolveMarket(
        input.claim,
        enhancedDescription
      );

      console.log('📊 Perplexity Result:', {
        outcome: perplexityResult.outcome,
        confidence: perplexityResult.confidence,
        needsReview: perplexityResult.needsReview
      });

      let finalResult = perplexityResult;
      let source = 'Perplexity AI (with evidence)';
      let geminiResult = null;

      // If still low confidence, try Gemini
      if (perplexityResult.confidence < 85 || perplexityResult.needsReview) {
        console.log('⚠️ Perplexity still low confidence, trying Gemini...');

        geminiResult = await geminiResolutionService.resolveMarket(
          input.claim,
          enhancedDescription
        );

        console.log('📊 Gemini Result:', {
          outcome: geminiResult.outcome,
          confidence: geminiResult.confidence,
          needsReview: geminiResult.needsReview
        });

        // Compare results
        if (perplexityResult.outcome === geminiResult.outcome) {
          // AIs agree - use higher confidence
          if (geminiResult.confidence > perplexityResult.confidence) {
            finalResult = geminiResult;
            source = 'Gemini AI (with evidence - higher confidence)';
          } else {
            source = 'Perplexity AI (with evidence - confirmed by Gemini)';
          }

          const maxConfidence = Math.max(perplexityResult.confidence, geminiResult.confidence);

          // If combined analysis still below 85%, this is very uncertain
          if (maxConfidence < 85) {
            console.warn('⚠️ Even with evidence, both AIs still below 85% confidence');
            // But since admin triggered this, proceed with best available
            source += ' [LOW CONFIDENCE WARNING]';
          }
        } else {
          // AIs disagree - this is problematic
          console.error('❌ Perplexity and Gemini disagree even with evidence');

          // Take the one with higher confidence
          if (geminiResult.confidence > perplexityResult.confidence) {
            finalResult = geminiResult;
            source = 'Gemini AI (with evidence - CONFLICT with Perplexity)';
          } else {
            source = 'Perplexity AI (with evidence - CONFLICT with Gemini)';
          }

          // Store both for admin review
          await this.saveConflictData(input.marketId, perplexityResult, geminiResult);
        }
      }

      // Resolve on blockchain
      if (input.contractAddress) {
        console.log('🔐 Resolving on blockchain...');
        try {
          await resolutionService.resolveMarketWithAI(
            input.marketId,
            finalResult.outcome,
            finalResult.confidence
          );
          console.log('✅ Blockchain resolution successful');
        } catch (blockchainError) {
          console.error('❌ Blockchain resolution failed:', blockchainError);
          throw new Error(`Blockchain resolution failed: ${blockchainError}`);
        }
      }

      // Update database
      await this.updateMarketAsResolved(input.marketId, finalResult, source, geminiResult);

      console.log('✅ Market resolved with evidence');
      console.log(`   Final Outcome: ${finalResult.outcome}`);
      console.log(`   Confidence: ${finalResult.confidence}%`);

      return {
        success: true,
        outcome: finalResult.outcome,
        confidence: finalResult.confidence,
        reasoning: finalResult.reasoning,
        source
      };

    } catch (error) {
      console.error('❌ Evidence resolution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update market status to resolved
   */
  private async updateMarketAsResolved(
    marketId: string,
    resolution: any,
    source: string,
    geminiResult: any = null
  ) {
    if (!this.supabase) {
      console.warn('⚠️ Supabase not configured, skipping database update');
      return;
    }

    const { error } = await this.supabase
      .from('approved_markets')
      .update({
        status: 'resolved',
        resolution_data: {
          final_outcome: resolution.outcome,
          outcome: resolution.outcome,
          confidence: resolution.confidence,
          admin_notes: `${resolution.reasoning}\n\n---\nResolved with user-submitted evidence after 48h collection period.`,
          source: source,
          resolved_by: 'api',
          timestamp: new Date().toISOString(),
          gemini_fallback_used: geminiResult ? 'yes' : 'no',
          evidence_based_resolution: true,
          perplexity_result: resolution,
          gemini_result: geminiResult
        },
        resolved_at: new Date().toISOString()
      })
      .eq('id', marketId);

    if (error) {
      console.error('Error updating market:', error);
      throw error;
    }
  }

  /**
   * Save conflict data when AIs disagree
   */
  private async saveConflictData(marketId: string, perplexityResult: any, geminiResult: any) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('approved_markets')
      .update({
        resolution_data: {
          needs_manual_review: true,
          ai_conflict_detected: true,
          perplexity_result: perplexityResult,
          gemini_result: geminiResult,
          conflict_note: `AIs disagree even with user evidence. Perplexity: ${perplexityResult.outcome} (${perplexityResult.confidence}%), Gemini: ${geminiResult.outcome} (${geminiResult.confidence}%)`
        }
      })
      .eq('id', marketId);

    if (error) {
      console.error('Error saving conflict data:', error);
    }
  }
}

export const evidenceResolutionService = new EvidenceResolutionService();
