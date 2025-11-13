/**
 * Perplexity AI Resolution Service
 *
 * Uses Perplexity API to automatically resolve expired prediction markets
 * with clear YES/NO answers and supporting reasoning.
 */

const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface PerplexityResolution {
  outcome: 'yes' | 'no';
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  sources?: string[];
  needsReview: boolean;
}

class PerplexityResolutionService {
  /**
   * Resolve a market question using Perplexity AI
   */
  async resolveMarket(marketQuestion: string, marketDescription?: string): Promise<PerplexityResolution> {
    try {
      if (!PERPLEXITY_API_KEY) {
        console.error('⚠️ Perplexity API key not configured');
        return {
          outcome: 'no',
          reasoning: 'API key not configured',
          confidence: 'low',
          needsReview: true
        };
      }

      console.log('🤖 Calling Perplexity API for market resolution...');
      console.log('📋 Question:', marketQuestion);

      // Construct the prompt for Perplexity
      const prompt = this.constructResolutionPrompt(marketQuestion, marketDescription);

      // Call Perplexity API
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a factual verification system for a prediction market. You must answer with ONLY "YES" or "NO" followed by 2-3 sentences of reasoning based on verifiable facts. Be objective and cite your reasoning clearly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Perplexity API error:', response.status, errorText);
        return {
          outcome: 'no',
          reasoning: `API error: ${response.status}`,
          confidence: 'low',
          needsReview: true
        };
      }

      const data = await response.json();
      console.log('✅ Perplexity API response:', data);

      // Parse the AI response
      const aiResponse = data.choices?.[0]?.message?.content || '';
      const parsed = this.parseAIResponse(aiResponse);

      console.log('📊 Parsed resolution:', parsed);

      return parsed;

    } catch (error) {
      console.error('❌ Error calling Perplexity API:', error);
      return {
        outcome: 'no',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 'low',
        needsReview: true
      };
    }
  }

  /**
   * Construct a clear prompt for Perplexity to resolve the market
   */
  private constructResolutionPrompt(question: string, description?: string): string {
    let prompt = `Based on current verifiable facts and recent news, answer this prediction market question:\n\n`;
    prompt += `Question: "${question}"\n`;

    if (description) {
      prompt += `\nContext: ${description}\n`;
    }

    prompt += `\nProvide your answer in this exact format:
- First line: ONLY "YES" or "NO"
- Following lines: 2-3 sentences explaining your reasoning with factual evidence

Be objective and base your answer on verifiable facts only.`;

    return prompt;
  }

  /**
   * Parse AI response into structured resolution data
   */
  private parseAIResponse(response: string): PerplexityResolution {
    const lines = response.trim().split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        outcome: 'no',
        reasoning: 'No response from AI',
        confidence: 'low',
        needsReview: true
      };
    }

    // Extract outcome from first line
    const firstLine = lines[0].toUpperCase();
    let outcome: 'yes' | 'no' = 'no';

    if (firstLine.includes('YES')) {
      outcome = 'yes';
    } else if (firstLine.includes('NO')) {
      outcome = 'no';
    } else {
      // Unclear response, needs review
      return {
        outcome: 'no',
        reasoning: response,
        confidence: 'low',
        needsReview: true
      };
    }

    // Extract reasoning (everything after first line)
    const reasoning = lines.slice(1).join(' ').trim() || 'No reasoning provided';

    // Determine confidence based on response clarity
    const confidence = this.determineConfidence(response);

    return {
      outcome,
      reasoning,
      confidence,
      needsReview: confidence === 'low'
    };
  }

  /**
   * Determine confidence level based on response characteristics
   */
  private determineConfidence(response: string): 'high' | 'medium' | 'low' {
    const lowerResponse = response.toLowerCase();

    // High confidence indicators
    const highConfidenceWords = ['confirmed', 'verified', 'officially', 'announced', 'proven', 'definitely'];
    const hasHighConfidence = highConfidenceWords.some(word => lowerResponse.includes(word));

    // Low confidence indicators
    const lowConfidenceWords = ['unclear', 'uncertain', 'possibly', 'maybe', 'unverified', 'alleged'];
    const hasLowConfidence = lowConfidenceWords.some(word => lowerResponse.includes(word));

    if (hasLowConfidence) return 'low';
    if (hasHighConfidence && response.length > 100) return 'high';
    return 'medium';
  }

  /**
   * Test the Perplexity API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.resolveMarket('Is the sky blue?');
      return !result.needsReview && result.outcome === 'yes';
    } catch (error) {
      console.error('Perplexity API test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const perplexityResolutionService = new PerplexityResolutionService();
