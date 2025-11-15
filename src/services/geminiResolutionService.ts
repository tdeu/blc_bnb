/**
 * Google Gemini AI Resolution Service
 *
 * Fallback AI service for market resolution when Perplexity confidence is low.
 * Uses Gemini API to provide a second opinion with clear YES/NO answers and reasoning.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiResolution {
  outcome: 'yes' | 'no';
  reasoning: string;
  confidence: number; // 0-100 percentage
  sources?: string[];
  needsReview: boolean;
}

class GeminiResolutionService {
  /**
   * Resolve a market question using Gemini AI
   */
  async resolveMarket(marketQuestion: string, marketDescription?: string): Promise<GeminiResolution> {
    try {
      if (!GEMINI_API_KEY) {
        console.error('⚠️ Gemini API key not configured');
        return {
          outcome: 'no',
          reasoning: 'API key not configured',
          confidence: 0,
          needsReview: true
        };
      }

      console.log('🤖 Calling Gemini API for market resolution (fallback)...');
      console.log('📋 Question:', marketQuestion);

      // Construct the prompt for Gemini
      const prompt = this.constructResolutionPrompt(marketQuestion, marketDescription);

      // Call Gemini API
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            topP: 0.8,
            topK: 10
          },
          systemInstruction: {
            parts: [{
              text: "You are a factual verification system. Respond concisely with YES/NO, a confidence percentage, and brief reasoning. Do not use extended thinking."
            }]
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        return {
          outcome: 'no',
          reasoning: `API error: ${response.status}`,
          confidence: 0,
          needsReview: true
        };
      }

      const data = await response.json();
      console.log('✅ Gemini API response:', data);

      // Parse the AI response - Gemini structure is different from Perplexity
      const candidate = data.candidates?.[0];
      const aiResponse = candidate?.content?.parts?.[0]?.text || '';

      console.log('📝 Gemini raw text:', aiResponse);

      if (!aiResponse) {
        console.error('❌ No text in Gemini response. Full candidate:', candidate);
        return {
          outcome: 'no',
          reasoning: 'No text response from Gemini',
          confidence: 0,
          needsReview: true
        };
      }

      const parsed = this.parseAIResponse(aiResponse);

      console.log('📊 Parsed Gemini resolution:', parsed);

      return parsed;

    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      return {
        outcome: 'no',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        needsReview: true
      };
    }
  }

  /**
   * Construct a clear prompt for Gemini to resolve the market
   */
  private constructResolutionPrompt(question: string, description?: string): string {
    let prompt = `You are a factual verification system for a prediction market. Based on current verifiable facts and recent news, answer this prediction market question:\n\n`;
    prompt += `Question: "${question}"\n`;

    if (description) {
      prompt += `\nContext: ${description}\n`;
    }

    prompt += `\nProvide your answer in this EXACT format:
Line 1: ONLY "YES" or "NO"
Line 2: ONLY a confidence percentage from 0-100 (e.g., "85" for 85% confidence)
Line 3+: 2-3 sentences explaining your reasoning with factual evidence

Example response:
YES
92
Bitcoin's current price is $95,000 according to CoinMarketCap as of today. This is well below the $200,000 threshold mentioned in the question.

Be objective, cite verifiable current facts only, and answer with YES or NO followed by your confidence percentage and reasoning.`;

    return prompt;
  }

  /**
   * Parse AI response into structured resolution data
   */
  private parseAIResponse(response: string): GeminiResolution {
    const lines = response.trim().split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        outcome: 'no',
        reasoning: 'No response from AI',
        confidence: 0,
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
        confidence: 0,
        needsReview: true
      };
    }

    // Extract confidence (second line - should be a number 0-100)
    let confidence = 50; // Default to medium confidence if not provided
    if (lines.length >= 2) {
      const confidenceLine = lines[1].trim();
      const confidenceNum = parseInt(confidenceLine);
      if (!isNaN(confidenceNum) && confidenceNum >= 0 && confidenceNum <= 100) {
        confidence = confidenceNum;
        console.log(`✅ Extracted Gemini confidence: ${confidence}%`);
      } else {
        console.warn(`⚠️ Invalid confidence format: "${confidenceLine}", using default 50%`);
      }
    }

    // Extract reasoning (everything after line 2, or line 1 if confidence wasn't provided)
    const reasoning = lines.slice(2).join(' ').trim() || lines.slice(1).join(' ').trim() || 'No reasoning provided';

    return {
      outcome,
      reasoning,
      confidence,
      needsReview: confidence < 60 // Mark for review if confidence is below 60%
    };
  }

  /**
   * Test the Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.resolveMarket('Is the sky blue?');
      return !result.needsReview && result.outcome === 'yes';
    } catch (error) {
      console.error('Gemini API test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const geminiResolutionService = new GeminiResolutionService();
