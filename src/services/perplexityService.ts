/**
 * Perplexity API Service
 * Provides AI-powered search with real-time web access and citations
 * Better than NewsAPI for: NEWS, ACADEMIC, GENERAL_KNOWLEDGE
 *
 * Setup:
 * 1. Sign up at perplexity.ai with student email
 * 2. Get free Pro via referral program (24 months free)
 * 3. Settings → API → Generate API Key
 * 4. Add PERPLEXITY_API_KEY to .env
 */

export interface PerplexitySearchResult {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt: Date;
  relevanceScore: number;
  citation?: string;
}

export interface PerplexityResponse {
  results: PerplexitySearchResult[];
  summary: string;
  citations: string[];
  confidence: number;
}

export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ PERPLEXITY_API_KEY not found. Get your free key at: https://www.perplexity.ai/settings/api');
    }
  }

  /**
   * Search using Perplexity's Sonar Online models
   * Performs real-time web search with citations
   */
  async search(
    marketClaim: string,
    dataSourceType: 'NEWS' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE',
    maxResults: number = 10
  ): Promise<PerplexityResponse> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured. Please add VITE_PERPLEXITY_API_KEY to your .env file.');
    }

    try {
      console.log(`🔍 [Perplexity] Searching for: "${marketClaim}" (${dataSourceType})`);

      // Choose appropriate model based on data source type
      const model = this.selectModel(dataSourceType);

      // Build optimized search prompt
      const prompt = this.buildSearchPrompt(marketClaim, dataSourceType);

      console.log(`🤖 Using model: ${model}`);
      console.log(`📝 Search prompt: ${prompt}`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a factual research assistant. Provide accurate information with citations. Focus on verifiable facts and current data.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2, // Low temperature for factual accuracy
          return_citations: true,
          return_images: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Perplexity API error: ${response.status} - ${errorText}`);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Perplexity response received');

      // Parse response and extract information
      const parsed = this.parsePerplexityResponse(data, marketClaim);

      console.log(`📊 Extracted ${parsed.results.length} search results`);
      console.log(`📄 Summary confidence: ${(parsed.confidence * 100).toFixed(0)}%`);

      return parsed;

    } catch (error) {
      console.error('❌ Perplexity search failed:', error);
      throw error;
    }
  }

  /**
   * Select appropriate Perplexity model based on data source type
   * Updated for 2025 - using new Sonar models (Llama 3.3 70B based)
   */
  private selectModel(dataSourceType: string): string {
    switch (dataSourceType) {
      case 'NEWS':
        // Sonar for real-time news and current events (lightweight, fast)
        return 'sonar';

      case 'ACADEMIC':
        // Sonar Pro for more complex academic queries
        return 'sonar-pro';

      case 'GENERAL_KNOWLEDGE':
        // Sonar for quick factual lookups
        return 'sonar';

      default:
        return 'sonar';
    }
  }

  /**
   * Build optimized search prompt based on data source type
   */
  private buildSearchPrompt(marketClaim: string, dataSourceType: string): string {
    const basePrompt = `Analyze this prediction market claim: "${marketClaim}"`;

    switch (dataSourceType) {
      case 'NEWS':
        return `${basePrompt}

Search for recent news articles and current developments related to this claim. Focus on:
1. Latest news from the past 30 days
2. Official announcements and statements
3. Expert opinions and analysis
4. Current market conditions or trends

Provide a factual summary with specific sources and dates. Include whether the claim appears to be trending towards TRUE or FALSE based on current evidence.`;

      case 'ACADEMIC':
        return `${basePrompt}

Search for academic research, scientific studies, and scholarly sources related to this claim. Focus on:
1. Peer-reviewed research and publications
2. Scientific consensus and expert opinions
3. Data-driven evidence and statistics
4. Credible academic institutions and researchers

Provide a factual summary with specific citations. Indicate the scientific consensus if available.`;

      case 'GENERAL_KNOWLEDGE':
        return `${basePrompt}

Search for established facts, definitions, and general knowledge related to this claim. Focus on:
1. Verified factual information
2. Historical data and records
3. Official statistics and demographics
4. Widely accepted definitions and facts

Provide a concise factual summary with reliable sources. Indicate if this is established fact or disputed.`;

      default:
        return `${basePrompt}\n\nProvide factual information with sources to help determine if this claim is likely TRUE or FALSE.`;
    }
  }

  /**
   * Parse Perplexity API response into structured search results
   */
  private parsePerplexityResponse(data: any, originalQuery: string): PerplexityResponse {
    console.log('🔍 Parsing Perplexity response...');

    // Extract main response text
    const responseText = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('📄 Response text length:', responseText.length);
    console.log('📚 Citations found:', citations.length);

    // Extract structured information from the response
    const results = this.extractSearchResults(responseText, citations, originalQuery);

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(responseText, citations);

    return {
      results,
      summary: responseText,
      citations,
      confidence
    };
  }

  /**
   * Extract individual search results from response text
   */
  private extractSearchResults(
    text: string,
    citations: string[],
    query: string
  ): PerplexitySearchResult[] {
    const results: PerplexitySearchResult[] = [];

    // Extract information from citations
    citations.forEach((citation, index) => {
      // Parse citation URL to get domain and create a result
      try {
        const url = new URL(citation);
        const domain = url.hostname.replace('www.', '');

        // Extract relevant snippet from text that mentions this source
        const snippet = this.extractRelevantSnippet(text, domain, 300);

        results.push({
          id: `perplexity_${Date.now()}_${index}`,
          source: this.formatSourceName(domain),
          url: citation,
          title: `${this.formatSourceName(domain)} - ${query.substring(0, 50)}`,
          content: snippet,
          publishedAt: new Date(), // Perplexity returns current results
          relevanceScore: 0.8 - (index * 0.05), // Decreasing relevance by position
          citation: citation
        });
      } catch (error) {
        console.warn(`⚠️ Failed to parse citation: ${citation}`);
      }
    });

    // If no citations, create a single result from the summary
    if (results.length === 0) {
      results.push({
        id: `perplexity_${Date.now()}_summary`,
        source: 'Perplexity AI Search',
        url: 'https://www.perplexity.ai',
        title: `Analysis: ${query.substring(0, 60)}`,
        content: text.substring(0, 500),
        publishedAt: new Date(),
        relevanceScore: 0.9,
        citation: 'Perplexity AI aggregated search'
      });
    }

    return results;
  }

  /**
   * Extract relevant snippet from text that mentions the source
   */
  private extractRelevantSnippet(text: string, domain: string, maxLength: number): string {
    // Find sentences that are most relevant to the query
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Prefer sentences that mention numbers, dates, or specific facts
    const scoredSentences = sentences.map(sentence => {
      let score = 0;

      // Boost for specific data
      if (/\d+/.test(sentence)) score += 2; // Contains numbers
      if (/202[0-9]/.test(sentence)) score += 2; // Contains recent year
      if (/\b(according to|reported|announced|confirmed|stated)\b/i.test(sentence)) score += 1;

      // Boost if mentions the domain
      if (sentence.toLowerCase().includes(domain.split('.')[0])) score += 3;

      return { sentence: sentence.trim(), score };
    });

    // Get top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.sentence);

    let snippet = topSentences.join('. ');

    // Truncate if too long
    if (snippet.length > maxLength) {
      snippet = snippet.substring(0, maxLength) + '...';
    }

    return snippet || text.substring(0, maxLength);
  }

  /**
   * Format domain name into readable source name
   */
  private formatSourceName(domain: string): string {
    // Map of common domains to proper names
    const sourceMap: Record<string, string> = {
      'bbc.com': 'BBC News',
      'bbc.co.uk': 'BBC News',
      'reuters.com': 'Reuters',
      'apnews.com': 'Associated Press',
      'bloomberg.com': 'Bloomberg',
      'nytimes.com': 'New York Times',
      'theguardian.com': 'The Guardian',
      'wsj.com': 'Wall Street Journal',
      'ft.com': 'Financial Times',
      'cnn.com': 'CNN',
      'nature.com': 'Nature',
      'science.org': 'Science Magazine',
      'sciencedirect.com': 'ScienceDirect',
      'scholar.google.com': 'Google Scholar',
      'arxiv.org': 'arXiv',
      'wikipedia.org': 'Wikipedia'
    };

    return sourceMap[domain] || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(text: string, citations: string[]): number {
    let confidence = 0.5; // Base confidence

    // More citations = higher confidence
    confidence += Math.min(citations.length * 0.05, 0.2);

    // Longer, detailed response = higher confidence
    if (text.length > 500) confidence += 0.1;
    if (text.length > 1000) confidence += 0.1;

    // Contains specific data (numbers, dates) = higher confidence
    if (/\d+%/.test(text)) confidence += 0.05; // Percentages
    if (/202[0-9]/.test(text)) confidence += 0.05; // Recent years
    if (/\$[\d,]+/.test(text)) confidence += 0.05; // Dollar amounts

    // Contains authoritative language = higher confidence
    if (/\b(confirmed|announced|reported|according to|study shows)\b/i.test(text)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze a market claim for resolution (YES/NO decision)
   * This method combines search and analysis into a single step
   */
  async analyzeForResolution(
    marketClaim: string,
    dataSourceType: 'NEWS' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE'
  ): Promise<{
    recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
    confidence: number;
    reasoning: string;
    sources: PerplexitySearchResult[];
  }> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured. Please add VITE_PERPLEXITY_API_KEY to your .env file.');
    }

    try {
      console.log(`🔍 [Perplexity] Analyzing for resolution: "${marketClaim}"`);

      const model = this.selectModel(dataSourceType);

      // Build a prompt specifically for YES/NO decision making
      const prompt = `Analyze this prediction market claim and determine if it is TRUE or FALSE: "${marketClaim}"

Based on current evidence from reliable sources, provide:
1. Your verdict: TRUE or FALSE (or INCONCLUSIVE if insufficient evidence)
2. Confidence level (0-100%)
3. Key evidence supporting your verdict
4. Cite specific sources with dates

Format your response clearly with:
- VERDICT: [TRUE/FALSE/INCONCLUSIVE]
- CONFIDENCE: [0-100]%
- REASONING: [detailed explanation with sources]`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a factual research analyst making YES/NO determinations for prediction markets. Be objective and cite sources.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2,
          return_citations: true,
          return_images: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Perplexity API error: ${response.status} - ${errorText}`);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      console.log('✅ Perplexity analysis received');
      console.log('📄 Response:', responseText.substring(0, 200) + '...');

      // Extract verdict, confidence, and reasoning
      const analysis = this.parseResolutionResponse(responseText, citations, marketClaim);

      return analysis;

    } catch (error) {
      console.error('❌ Perplexity analysis failed:', error);
      throw error;
    }
  }

  /**
   * Parse the resolution response to extract verdict and confidence
   */
  private parseResolutionResponse(
    text: string,
    citations: string[],
    query: string
  ): {
    recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
    confidence: number;
    reasoning: string;
    sources: PerplexitySearchResult[];
  } {
    // Extract verdict
    let recommendation: 'YES' | 'NO' | 'INCONCLUSIVE' = 'INCONCLUSIVE';

    // Look for explicit VERDICT statement
    const verdictMatch = text.match(/VERDICT:\s*(TRUE|FALSE|INCONCLUSIVE)/i);
    if (verdictMatch) {
      const verdict = verdictMatch[1].toUpperCase();
      if (verdict === 'TRUE') recommendation = 'YES';
      else if (verdict === 'FALSE') recommendation = 'NO';
      else recommendation = 'INCONCLUSIVE';
    } else {
      // Fallback: analyze text for positive/negative indicators
      const lowerText = text.toLowerCase();

      // Strong indicators
      const trueIndicators = ['is true', 'confirmed', 'has occurred', 'did happen', 'is accurate', 'evidence supports'];
      const falseIndicators = ['is false', 'not true', 'did not occur', 'has not happened', 'no evidence', 'disproven'];

      const trueCount = trueIndicators.filter(ind => lowerText.includes(ind)).length;
      const falseCount = falseIndicators.filter(ind => lowerText.includes(ind)).length;

      if (trueCount > falseCount) recommendation = 'YES';
      else if (falseCount > trueCount) recommendation = 'NO';
    }

    // Extract confidence
    let confidence = 0.5; // Default

    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)%/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1]) / 100;
    } else {
      // Calculate based on text quality and citations
      confidence = this.calculateConfidence(text, citations);
    }

    // Extract or use full text as reasoning
    let reasoning = text;
    const reasoningMatch = text.match(/REASONING:\s*(.+)/is);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
    }

    // Build sources from citations
    const sources = this.extractSearchResults(text, citations, query);

    console.log(`📊 Resolution: ${recommendation} with ${(confidence * 100).toFixed(0)}% confidence`);

    return {
      recommendation,
      confidence,
      reasoning,
      sources
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const perplexityService = new PerplexityService();
