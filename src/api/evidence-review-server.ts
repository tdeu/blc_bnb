import express from 'express';
import cors from 'cors';
import { evidenceService } from '../utils/evidenceService.js';
import { supabase } from '../utils/supabase.js';

const app = express();
const port = process.env.EVIDENCE_REVIEW_PORT || 3003;

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'evidence-review',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Trigger evidence review for AI re-evaluation
app.post('/api/trigger-evidence-review', async (req, res) => {
  try {
    const { evidenceId, marketId } = req.body;

    if (!evidenceId || !marketId) {
      return res.status(400).json({
        success: false,
        error: 'Missing evidenceId or marketId'
      });
    }

    // Get the evidence details
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence_submissions')
      .select('*')
      .eq('id', evidenceId)
      .single();

    if (evidenceError || !evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found'
      });
    }

    // Get the market details
    const { data: market, error: marketError } = await supabase
      .from('approved_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found'
      });
    }

    // Trigger AI re-evaluation with new evidence
    const reviewResult = await triggerAIReEvaluation(market, evidence);

    if (reviewResult.success) {
      // Update market status if necessary
      if (reviewResult.shouldUpdateResolution) {
        await updateMarketResolution(marketId, reviewResult.newResolution);
      }

      // Log the review trigger
      await logEvidenceReview(evidenceId, marketId, reviewResult);

      res.json({
        success: true,
        message: 'Evidence review triggered successfully',
        reviewResult
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to trigger evidence review',
        details: reviewResult.error
      });
    }

  } catch (error) {
    console.error('Evidence review trigger failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get evidence statistics
app.get('/api/evidence-stats', async (req, res) => {
  try {
    const stats = await evidenceService.getEvidenceStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to get evidence stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence statistics'
    });
  }
});

// Admin endpoint to review evidence
app.post('/api/admin/review-evidence', async (req, res) => {
  try {
    const { evidenceId, status, adminNotes, qualityScore } = req.body;

    // TODO: Add admin authentication middleware

    const result = await evidenceService.reviewEvidence(
      evidenceId,
      status,
      adminNotes,
      qualityScore || 1.0
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Evidence ${status} successfully`,
        rewardAmount: result.rewardAmount
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to review evidence'
      });
    }
  } catch (error) {
    console.error('Evidence review failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Trigger AI re-evaluation with new evidence
async function triggerAIReEvaluation(market: any, evidence: any): Promise<{
  success: boolean;
  shouldUpdateResolution?: boolean;
  newResolution?: any;
  confidence?: number;
  reasoning?: string;
  error?: string;
}> {
  try {
    // This would integrate with the existing AI service
    // For now, we'll simulate the re-evaluation process

    const prompt = `
    Re-evaluate market resolution with new evidence:

    Market: "${market.claim}"
    Current AI Resolution: ${market.resolution_data?.outcome || 'None'}
    Current Confidence: ${market.resolution_data?.confidence || 'None'}

    New Evidence:
    User ID: ${evidence.user_id}
    Text: ${evidence.evidence_text}
    Links: ${evidence.evidence_links?.join(', ') || 'None'}

    Please analyze if this new evidence changes the resolution and provide:
    1. Updated resolution (YES/NO/UNCHANGED)
    2. New confidence score (0-1)
    3. Reasoning for any changes
    4. Quality score for the evidence (0-5)
    `;

    // TODO: Replace with actual AI service call
    // For now, simulate a response
    const mockResponse = {
      resolution: market.resolution_data?.outcome || 'yes',
      confidence: Math.max(0.7, Math.random()),
      reasoning: 'The new evidence has been considered but does not significantly change the original assessment.',
      evidenceQuality: Math.random() * 3 + 2, // 2-5 quality score
      shouldUpdate: Math.random() < 0.3 // 30% chance to update resolution
    };

    return {
      success: true,
      shouldUpdateResolution: mockResponse.shouldUpdate,
      newResolution: mockResponse.shouldUpdate ? {
        outcome: mockResponse.resolution,
        confidence: mockResponse.confidence,
        reasoning: mockResponse.reasoning,
        source: 'ai_with_evidence',
        evidence_considered: evidence.id
      } : undefined,
      confidence: mockResponse.confidence,
      reasoning: mockResponse.reasoning
    };

  } catch (error) {
    console.error('AI re-evaluation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Update market resolution with new data
async function updateMarketResolution(marketId: string, newResolution: any): Promise<void> {
  try {
    // Update the market's resolution data
    const { error } = await supabase
      .from('approved_markets')
      .update({
        resolution_data: newResolution,
        status: 'resolved', // or keep as 'pending_resolution' if still in dispute window
        updated_at: new Date().toISOString()
      })
      .eq('id', marketId);

    if (error) throw error;

    // Insert a new resolution record
    await supabase
      .from('market_resolutions')
      .insert({
        market_id: marketId,
        outcome: newResolution.outcome,
        source: newResolution.source,
        confidence: newResolution.confidence,
        reasoning: newResolution.reasoning,
        evidence_considered: newResolution.evidence_considered,
        timestamp: new Date().toISOString(),
        dispute_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()  // 7 days instead of 48 hours
      });

  } catch (error) {
    console.error('Failed to update market resolution:', error);
    throw error;
  }
}

// Log evidence review activity
async function logEvidenceReview(evidenceId: string, marketId: string, reviewResult: any): Promise<void> {
  try {
    // Create an audit log entry
    await supabase
      .from('evidence_review_log')
      .insert({
        evidence_id: evidenceId,
        market_id: marketId,
        review_type: 'ai_reevaluation',
        result: reviewResult,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.warn('Failed to log evidence review:', error);
    // Don't throw - logging failure shouldn't break the main process
  }
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🔍 Evidence Review Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`⚡ Ready to process evidence reviews`);
});

export default app;