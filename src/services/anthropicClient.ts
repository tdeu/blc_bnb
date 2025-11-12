export class AnthropicClient {
  private baseUrl: string;

  constructor() {
    // No API key needed - handled by backend proxy
    this.baseUrl = this.getApiUrl();
  }

  private getApiUrl(): string {
    // Check if we're in development (localhost)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Local development - use local server
      return 'http://localhost:3001/api/anthropic-proxy';
    }
    // Production or preview - use Vercel API route
    return '/api/anthropic-proxy';
  }

  async generateAnalysis(prompt: string): Promise<any> {
    try {
      console.log('🔄 Attempting AI proxy call via backend...');
      console.log('🌐 Using API URL:', this.baseUrl);
      console.log('🌐 Making request to:', this.baseUrl);
      const requestBody = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        console.error('❌ Full response object:', response);
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Success, parsing response...');
      console.log('📊 Full response data:', JSON.stringify(data, null, 2));

      // Check if response has the expected structure
      if (!data.content || !Array.isArray(data.content) || !data.content[0] || !data.content[0].text) {
        console.error('❌ Unexpected response structure:', data);
        throw new Error('Invalid response structure from API');
      }

      return this.parseAIResponse(data.content[0].text, prompt);
    } catch (error) {
      console.error('❌ Anthropic API call failed:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error?.message || 'Unknown error');
      console.error('❌ Full error object:', error);

      // DO NOT fall back to mock responses - throw the error so the user knows the API is not configured
      throw new Error(`Anthropic API connection failed: ${error?.message || 'Unknown error'}. Please check your API configuration.`);
    }
  }

  private async generateEnhancedMockResponse(prompt: string): Promise<any> {
    console.log('📝 Generating enhanced mock response for prompt:', prompt.substring(0, 100) + '...');

    const marketTitle = this.extractMarketTitle(prompt);
    const marketDescription = this.extractMarketDescription(prompt);

    const baseResponse = {
      confidence: Math.floor(Math.random() * 20) + 70,
      timestamp: new Date().toISOString(),
      rawResponse: '[MOCK] Enhanced analysis based on prompt content',
      isRealAPI: false,
      marketTitle,
      marketDescription
    };

    if (prompt.toLowerCase().includes('analyze market') || prompt.toLowerCase().includes('market evidence')) {
      try {
        const facts = await this.generateFactsWithAPI(marketTitle, marketDescription);
        return {
          ...baseResponse,
          keyFactors: facts
        };
      } catch (error) {
        throw new Error('API connection required for market analysis. Please check your API key configuration.');
      }
    } else if (prompt.toLowerCase().includes('validate') || prompt.toLowerCase().includes('resolution')) {
      return {
        ...baseResponse,
        culturalContext: 'Analysis incorporates regional cultural patterns and social contexts specific to African markets and communities.',
        languageSupport: {
          'English': 'confirmed',
          'French': 'partial',
          'Swahili': 'partial',
          'Arabic': 'partial'
        }
      };
    } else if (prompt.toLowerCase().includes('dispute')) {
      return {
        ...baseResponse,
        successProbability: Math.floor(Math.random() * 40) + 30,
        recommendedType: 'evidence',
        typeReasoning: 'Based on enhanced analysis of the dispute context',
        suggestions: [
          'The current resolution may need additional context from regional perspectives.',
          'Cultural factors and community viewpoints should be weighted appropriately.',
          'Multi-language sources could strengthen the evidence base.'
        ]
      };
    }

    return baseResponse;
  }

  private async generateFactsWithAPI(title: string, description: string): Promise<string[]> {
    const entities = this.extractKeyEntities(title, description);
    const prompt = this.buildFactGenerationPrompt(title, description, entities);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseFactsFromResponse(data.content[0].text);
    } catch (error) {
      throw new Error('Failed to generate facts via API');
    }
  }

  private extractKeyEntities(title: string, description: string): string[] {
    const text = `${title} ${description}`;
    const entities: string[] = [];
    
    // Extract proper names (sequences of capitalized words)
    const properNames = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    entities.push(...properNames);
    
    // Extract common entities and concepts
    const commonEntities = [
      // People
      'Elon Musk', 'Donald Trump', 'Joe Biden', 'Taylor Swift', 'Lionel Messi', 'Cristiano Ronaldo',
      // Companies/Teams
      'Tesla', 'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Real Madrid', 'Manchester United', 'Barcelona',
      // Concepts
      'Bitcoin', 'cryptocurrency', 'artificial intelligence', 'climate change', 'population', 'GDP', 'inflation',
      // Descriptors
      'richest person', 'richest man', 'wealthiest', 'best team', 'better than', 'president', 'CEO'
    ];
    
    const lowerText = text.toLowerCase();
    commonEntities.forEach(entity => {
      if (lowerText.includes(entity.toLowerCase())) {
        entities.push(entity);
      }
    });
    
    // Remove duplicates and limit to top 4 entities
    return [...new Set(entities)].slice(0, 4);
  }

  private buildFactGenerationPrompt(title: string, description: string, entities: string[]): string {
    const entityList = entities.length > 0 ? entities.join(', ') : 'the main topics';
    
    return `Give me exactly 5 specific, factual statements about: ${entityList}

Market Question: "${title}"
Market Description: ${description}

I need 5 concrete facts with real data, numbers, or verifiable information that either support or challenge this market prediction. Focus specifically on ${entityList}.

Requirements:
- Include specific statistics, rankings, or measurements
- Provide historical data and recent developments
- Include comparative data when relevant
- Use actual numbers, dates, and verifiable information
- Make each fact substantial and informative

Format as:
1. [Specific fact with data]
2. [Specific fact with data] 
3. [Specific fact with data]
4. [Specific fact with data]
5. [Specific fact with data]`;
  }

  private parseFactsFromResponse(response: string): string[] {
    const facts: string[] = [];
    
    // Extract numbered list items
    const numberedMatches = response.match(/^\d+\.\s*(.+)$/gm);
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        const fact = match.replace(/^\d+\.\s*/, '').trim();
        if (fact.length > 10) {
          facts.push(fact);
        }
      });
    }
    
    // Try bullet points if numbered list failed
    if (facts.length === 0) {
      const bulletMatches = response.match(/^[-•*]\s*(.+)$/gm);
      if (bulletMatches) {
        bulletMatches.forEach(match => {
          const fact = match.replace(/^[-•*]\s*/, '').trim();
          if (fact.length > 10) {
            facts.push(fact);
          }
        });
      }
    }
    
    // Fallback to sentences
    if (facts.length === 0) {
      const sentences = response.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300)
        .slice(0, 5);
      facts.push(...sentences);
    }
    
    return facts.slice(0, 5);
  }

  private extractMarketTitle(prompt: string): string {
    const titleMatch = prompt.match(/["'""]([^"'""]*)["'"]/);
    return titleMatch ? titleMatch[1] : 'Market title not found';
  }

  private extractMarketDescription(prompt: string): string {
    const descMatch = prompt.match(/Market details:\s*([^\n\r.]+)/i);
    if (descMatch) {
      let description = descMatch[1].trim();
      description = description.replace(/\.\s*$/, '').trim();
      return description || 'No detailed description provided';
    }
    return 'No detailed description provided';
  }

  private parseAIResponse(text: string, originalPrompt: string): any {
    console.log('🔍 [anthropicClient] Parsing AI response...');
    console.log('📄 Response text:', text.substring(0, 1000));

    // Return the raw text so aiAnalysisService can parse it with its format
    // This allows the structured format (RECOMMENDATION:, CONFIDENCE:, etc.) to be preserved
    return {
      rawResponse: text,
      content: text,
      timestamp: new Date().toISOString()
    };
  }

  private extractConfidence(text: string): number {
    const confidenceMatch = text.match(/(\d+)%\s*confidence/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    return Math.floor(Math.random() * 30) + 60;
  }

  private extractReasoning(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }

  private extractKeyFactors(text: string): string[] {
    const factors: string[] = [];
    
    const numberedMatches = text.match(/\d+\.\s*([^\d\n]+)/g);
    if (numberedMatches) {
      factors.push(...numberedMatches.map(m => m.replace(/\d+\.\s*/, '').trim()));
    }
    
    const bulletMatches = text.match(/[•\-*]\s*([^•\-*\n]+)/g);
    if (bulletMatches) {
      factors.push(...bulletMatches.map(m => m.replace(/[•\-*]\s*/, '').trim()));
    }
    
    if (factors.length === 0) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30 && s.trim().length < 150);
      factors.push(...sentences.slice(0, 4).map(s => s.trim()));
    }
    
    return factors.slice(0, 5);
  }

  private extractCulturalContext(text: string): string {
    return 'AI analysis incorporates regional and cultural factors specific to the market context.';
  }

  private extractLanguageSupport(text: string): any {
    return {
      'English': 'confirmed',
      'French': 'partial',
      'Swahili': 'partial',
      'Arabic': 'partial'
    };
  }

  private extractSuccessProbability(text: string): number {
    return Math.floor(Math.random() * 40) + 40;
  }

  private extractRecommendedType(text: string): string {
    return 'evidence';
  }

  private extractTypeReasoning(text: string): string {
    return 'Based on AI analysis of the dispute context and available evidence.';
  }

  private extractSuggestions(text: string): string[] {
    return [
      'The current resolution may need additional context from regional perspectives.',
      'Cultural factors and community viewpoints should be weighted appropriately.',
      'Multi-language sources could strengthen the evidence base.'
    ];
  }
}