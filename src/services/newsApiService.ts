import { RESOLUTION_CONFIG } from '../config/resolutionConfig';

interface NewsApiSource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology';
  language: string;
  country: string;
}

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export interface ProcessedNewsArticle {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt: Date;
  author?: string;
  relevanceScore?: number;
  imageUrl?: string;
}

export class NewsApiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://newsapi.org/v2';

  // Top 50 news sources - user can select up to 10
  private readonly availableSources: Array<{id: string; name: string; category: string; reliability: number}> = [
    // Major International News
    { id: 'bbc-news', name: 'BBC News', category: 'general', reliability: 0.95 },
    { id: 'reuters', name: 'Reuters', category: 'general', reliability: 0.98 },
    { id: 'associated-press', name: 'Associated Press', category: 'general', reliability: 0.97 },
    { id: 'cnn', name: 'CNN', category: 'general', reliability: 0.85 },
    { id: 'abc-news', name: 'ABC News', category: 'general', reliability: 0.88 },
    { id: 'cbs-news', name: 'CBS News', category: 'general', reliability: 0.87 },
    { id: 'nbc-news', name: 'NBC News', category: 'general', reliability: 0.87 },
    { id: 'fox-news', name: 'Fox News', category: 'general', reliability: 0.75 },
    { id: 'al-jazeera-english', name: 'Al Jazeera English', category: 'general', reliability: 0.90 },

    // Business & Financial
    { id: 'bloomberg', name: 'Bloomberg', category: 'business', reliability: 0.95 },
    { id: 'financial-times', name: 'Financial Times', category: 'business', reliability: 0.94 },
    { id: 'wall-street-journal', name: 'Wall Street Journal', category: 'business', reliability: 0.93 },
    { id: 'fortune', name: 'Fortune', category: 'business', reliability: 0.88 },
    { id: 'business-insider', name: 'Business Insider', category: 'business', reliability: 0.82 },
    { id: 'cnbc', name: 'CNBC', category: 'business', reliability: 0.86 },
    { id: 'marketwatch', name: 'MarketWatch', category: 'business', reliability: 0.84 },

    // Technology
    { id: 'techcrunch', name: 'TechCrunch', category: 'technology', reliability: 0.87 },
    { id: 'wired', name: 'Wired', category: 'technology', reliability: 0.89 },
    { id: 'ars-technica', name: 'Ars Technica', category: 'technology', reliability: 0.92 },
    { id: 'the-verge', name: 'The Verge', category: 'technology', reliability: 0.86 },
    { id: 'engadget', name: 'Engadget', category: 'technology', reliability: 0.83 },

    // General Quality News
    { id: 'the-guardian-uk', name: 'The Guardian', category: 'general', reliability: 0.91 },
    { id: 'the-independent', name: 'The Independent', category: 'general', reliability: 0.87 },
    { id: 'the-times', name: 'The Times', category: 'general', reliability: 0.90 },
    { id: 'usa-today', name: 'USA Today', category: 'general', reliability: 0.84 },
    { id: 'the-washington-post', name: 'Washington Post', category: 'general', reliability: 0.91 },
    { id: 'the-new-york-times', name: 'New York Times', category: 'general', reliability: 0.92 },

    // Science & Health
    { id: 'national-geographic', name: 'National Geographic', category: 'science', reliability: 0.94 },
    { id: 'new-scientist', name: 'New Scientist', category: 'science', reliability: 0.91 },
    { id: 'medical-news-today', name: 'Medical News Today', category: 'health', reliability: 0.88 },

    // Regional/Specialized
    { id: 'google-news', name: 'Google News', category: 'general', reliability: 0.80 },
    { id: 'yahoo-news', name: 'Yahoo News', category: 'general', reliability: 0.78 },
    { id: 'politico', name: 'Politico', category: 'general', reliability: 0.87 },
    { id: 'axios', name: 'Axios', category: 'general', reliability: 0.86 },

    // Entertainment & Sports (for variety)
    { id: 'espn', name: 'ESPN', category: 'sports', reliability: 0.89 },
    { id: 'entertainment-weekly', name: 'Entertainment Weekly', category: 'entertainment', reliability: 0.82 },

    // International
    { id: 'deutsche-welle', name: 'Deutsche Welle', category: 'general', reliability: 0.89 },
    { id: 'france24', name: 'France 24', category: 'general', reliability: 0.87 },
    { id: 'rt', name: 'RT', category: 'general', reliability: 0.65 },
    { id: 'sputnik-news', name: 'Sputnik News', category: 'general', reliability: 0.60 },

    // Crypto & Finance (for prediction markets)
    { id: 'coindesk', name: 'CoinDesk', category: 'technology', reliability: 0.85 },
    { id: 'crypto-coins-news', name: 'Crypto Coins News', category: 'technology', reliability: 0.78 },

    // Additional Quality Sources
    { id: 'time', name: 'Time Magazine', category: 'general', reliability: 0.88 },
    { id: 'newsweek', name: 'Newsweek', category: 'general', reliability: 0.83 },
    { id: 'the-economist', name: 'The Economist', category: 'business', reliability: 0.95 },
    { id: 'hacker-news', name: 'Hacker News', category: 'technology', reliability: 0.84 },
    { id: 'reddit-r-all', name: 'Reddit /r/all', category: 'general', reliability: 0.70 },

    // Additional business sources
    { id: 'forbes', name: 'Forbes', category: 'business', reliability: 0.86 },
    { id: 'investor-business-daily', name: 'Investor Business Daily', category: 'business', reliability: 0.85 },
    { id: 'seeking-alpha', name: 'Seeking Alpha', category: 'business', reliability: 0.82 },
    { id: 'the-motley-fool', name: 'The Motley Fool', category: 'business', reliability: 0.80 }
  ];

  constructor() {
    this.apiKey = import.meta.env.VITE_NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ NewsAPI key not found in environment variables');
    }
  }

  /**
   * Get available news sources that the user can select from
   */
  getAvailableSources() {
    return this.availableSources.sort((a, b) => b.reliability - a.reliability);
  }

  /**
   * Extract search keywords from market topic for better news matching
   * Returns a smart query string optimized for NewsAPI
   * SUPPORTS MULTIPLE LANGUAGES - extracts entities regardless of language
   */
  private extractSearchKeywords(marketTopic: string): string {
    console.log(`🔍 Original market topic: "${marketTopic}"`);

    const topicLower = marketTopic.toLowerCase();

    // STEP 1: Extract entities (case-insensitive, language-agnostic)
    const cryptoTerms = ['bitcoin', 'btc', 'ethereum', 'eth', 'dogecoin', 'doge', 'cardano', 'ada', 'solana', 'sol', 'ripple', 'xrp'];
    const companyTerms = ['apple', 'google', 'microsoft', 'amazon', 'tesla', 'meta', 'nvidia', 'spacex'];
    const peopleTerms = ['trump', 'biden', 'musk', 'bezos', 'gates', 'zuckerberg'];

    const detectedEntities: string[] = [];

    // Detect crypto entities
    cryptoTerms.forEach(term => {
      if (topicLower.includes(term)) {
        detectedEntities.push(term);
      }
    });

    // Detect company entities
    companyTerms.forEach(term => {
      if (topicLower.includes(term)) {
        detectedEntities.push(term);
      }
    });

    // Detect people entities
    peopleTerms.forEach(term => {
      if (topicLower.includes(term)) {
        detectedEntities.push(term);
      }
    });

    // STEP 2: If we found entities, use entity-based search (works for any language!)
    if (detectedEntities.length > 0) {
      console.log(`🎯 Detected entities: ${detectedEntities.join(', ')}`);

      // Build query based on entities
      let query = detectedEntities.join(' OR '); // Use OR for multiple entities

      // Add context keywords
      const hasCrypto = cryptoTerms.some(t => detectedEntities.includes(t));
      const hasCompany = companyTerms.some(t => detectedEntities.includes(t));

      if (hasCrypto) {
        // Add price/prediction context for crypto
        query += ' AND (price OR prediction OR forecast OR analysis)';
      } else if (hasCompany) {
        // Add stock/earnings context for companies
        query += ' AND (stock OR earnings OR shares OR market)';
      }

      console.log(`✅ Entity-based query (multi-language): "${query}"`);
      return query;
    }

    // STEP 3: Fallback - remove common words in multiple languages
    const stopWords = [
      // English
      'will', 'be', 'the', 'is', 'are', 'was', 'were', 'on', 'in', 'at', 'by', 'for', 'to', 'from', 'with', 'and', 'or', 'but', 'of', 'a', 'an',
      // French
      'sera', 'quel', 'quelle', 'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais', 'dans', 'sur', 'pour', 'avec', 'à', 'au',
      // Spanish
      'será', 'cuál', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'o', 'pero', 'en', 'con', 'por', 'para',
      // Time words
      'this', 'next', 'last', 'week', 'month', 'year', 'day', 'today', 'tomorrow', 'mois', 'année', 'jour', 'fin', 'end'
    ];

    const cleaned = topicLower
      .replace(/[^\w\s$]/g, ' ') // Keep $ for crypto symbols
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ')
      .filter(term => term.length > 3 && !stopWords.includes(term))
      .slice(0, 3);

    if (words.length === 0) {
      console.warn('⚠️  Could not extract meaningful search terms');
      return marketTopic.substring(0, 50); // Use first 50 chars as fallback
    }

    const query = words.join(' AND ');
    console.log(`✅ Keyword-based query: "${query}"`);
    return query;
  }

  /**
   * Search for news articles using NewsAPI
   */
  async searchNews(
    marketTopic: string,
    selectedSources: string[] = [],
    maxResults: number = 20
  ): Promise<ProcessedNewsArticle[]> {

    if (!this.apiKey) {
      throw new Error('NewsAPI key not configured');
    }

    try {
      console.log(`🔍 Searching NewsAPI for: "${marketTopic}"`);
      console.log(`📰 Selected sources: ${selectedSources.join(', ')}`);

      const query = this.extractSearchKeywords(marketTopic);

      // Detect African country for targeted search
      const africanCountry = this.detectAfricanCountry(marketTopic);

      // Build API URL
      const params = new URLSearchParams({
        q: query,
        apiKey: this.apiKey,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: Math.min(maxResults * 2, 100).toString() // Fetch 2x to filter, NewsAPI max is 100
      });

      // If African country detected, use country filter instead of sources
      // (NewsAPI doesn't allow both sources and country parameters together)
      if (africanCountry) {
        console.log(`🌍 Using African country filter: ${africanCountry}`);
        params.append('country', africanCountry);
      } else if (selectedSources.length > 0) {
        // Add sources if specified (max 20 sources per request)
        const sourcesToUse = selectedSources.slice(0, 20);
        params.append('sources', sourcesToUse.join(','));
      }

      const url = `${this.baseUrl}/everything?${params.toString()}`;
      console.log(`🌐 NewsAPI URL: ${url.replace(this.apiKey, '[API_KEY_HIDDEN]')}`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: NewsApiResponse = await response.json();

      console.log(`✅ NewsAPI returned ${data.articles.length} articles`);

      // Process and filter articles
      const processedArticles: ProcessedNewsArticle[] = data.articles
        .filter(article =>
          article.title &&
          article.description &&
          article.url &&
          !article.title.toLowerCase().includes('[removed]')
        )
        .map((article, index) => {
          const relevanceScore = this.calculateRelevanceScore(
            article.title + ' ' + article.description,
            marketTopic
          );
          return {
            id: `newsapi_${Date.now()}_${index}`,
            source: article.source.name || 'Unknown Source',
            url: article.url,
            title: article.title,
            content: article.description + (article.content ? ' ' + article.content : ''),
            publishedAt: new Date(article.publishedAt),
            author: article.author || undefined,
            imageUrl: article.urlToImage || undefined,
            relevanceScore
          };
        })
        .filter(article => {
          // STRICT FILTERING: Only keep articles with relevance > 0.3
          if ((article.relevanceScore || 0) < 0.3) {
            console.log(`🚫 Filtered out low relevance (${(article.relevanceScore || 0).toFixed(2)}): "${article.title}"`);
            return false;
          }
          console.log(`✅ Keeping relevant (${(article.relevanceScore || 0).toFixed(2)}): "${article.title}"`);
          return true;
        })
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)) // Sort by relevance
        .slice(0, maxResults); // Limit results

      console.log(`📊 Kept ${processedArticles.length} highly relevant articles out of ${data.articles.length} total`);

      return processedArticles;

    } catch (error) {
      console.error('❌ NewsAPI search failed:', error);
      throw error;
    }
  }

  /**
   * Calculate relevance score based on keyword matching
   * Now much stricter - requires main entity to be present
   */
  private calculateRelevanceScore(text: string, marketTopic: string): number {
    const textLower = text.toLowerCase();
    const topicLower = marketTopic.toLowerCase();

    // Extract main entity/subject from the market topic
    const mainEntities = this.extractMainEntities(topicLower);

    // STRICT RULE: Article MUST contain at least one main entity
    const hasMainEntity = mainEntities.some(entity => textLower.includes(entity));
    if (!hasMainEntity) {
      console.log(`❌ Article rejected: No main entity found. Need one of: ${mainEntities.join(', ')}`);
      return 0; // Complete rejection if main entity not present
    }

    // Calculate how many main entities are present
    const matchedEntities = mainEntities.filter(entity => textLower.includes(entity));
    let score = matchedEntities.length / mainEntities.length;

    // Boost score for exact phrase matches
    const phrases = this.extractPhrases(topicLower);
    phrases.forEach(phrase => {
      if (textLower.includes(phrase)) {
        score += 0.3; // Significant boost for phrase matches
      }
    });

    // Penalize if text mentions completely unrelated topics
    const unrelatedTopics = ['gaza', 'israel', 'palestine', 'motogp', 'formula', 'racing', 'nfl', 'nba'];
    const topicContext = this.detectTopicContext(topicLower);

    // If article is about sports but topic isn't (or vice versa), penalize
    unrelatedTopics.forEach(topic => {
      if (textLower.includes(topic) && !topicLower.includes(topic) && !topicContext.includes(topic)) {
        score *= 0.3; // Heavy penalty for off-topic content
      }
    });

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Extract main entities (most important nouns/subjects) from topic
   */
  private extractMainEntities(topic: string): string[] {
    const entities: string[] = [];

    // Known entity patterns
    const cryptoPatterns = ['bitcoin', 'btc', 'ethereum', 'eth', 'dogecoin', 'doge', 'cardano', 'ada', 'solana', 'sol'];
    const companyPatterns = ['apple', 'google', 'microsoft', 'amazon', 'tesla', 'meta', 'nvidia'];
    const peoplePatterns = ['trump', 'biden', 'musk', 'bezos', 'gates'];

    // Extract entities
    cryptoPatterns.forEach(pattern => {
      if (topic.includes(pattern)) entities.push(pattern);
    });
    companyPatterns.forEach(pattern => {
      if (topic.includes(pattern)) entities.push(pattern);
    });
    peoplePatterns.forEach(pattern => {
      if (topic.includes(pattern)) entities.push(pattern);
    });

    // If no known entities, use first 2-3 important words
    if (entities.length === 0) {
      const words = topic
        .replace(/\b(will|be|the|is|are|was|were|on|in|at|by|for|to|from|with|and|or|but|of|a|an|this|next|week|month|year)\b/g, ' ')
        .split(' ')
        .filter(w => w.length > 3);
      entities.push(...words.slice(0, 2));
    }

    return entities;
  }

  /**
   * Detect if market is about an African country
   * Returns NewsAPI country code if detected, null otherwise
   */
  private detectAfricanCountry(marketTopic: string): string | null {
    const topicLower = marketTopic.toLowerCase();

    for (const [keyword, countryCode] of Object.entries(RESOLUTION_CONFIG.africanCountries)) {
      if (topicLower.includes(keyword)) {
        console.log(`🌍 Detected African country: ${keyword} → ${countryCode}`);
        return countryCode;
      }
    }

    return null;
  }

  /**
   * Extract meaningful phrases (2-3 word combinations)
   */
  private extractPhrases(topic: string): string[] {
    const words = topic.split(' ').filter(w => w.length > 2);
    const phrases: string[] = [];

    // Create 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }

    return phrases;
  }

  /**
   * Detect topic context (crypto, sports, politics, etc.)
   */
  private detectTopicContext(topic: string): string[] {
    const contexts: string[] = [];

    if (/bitcoin|ethereum|crypto|dogecoin|blockchain/.test(topic)) contexts.push('crypto');
    if (/nfl|nba|mlb|soccer|football|basketball/.test(topic)) contexts.push('sports');
    if (/trump|biden|election|congress|senate/.test(topic)) contexts.push('politics');
    if (/stock|shares|nasdaq|dow|s&p/.test(topic)) contexts.push('finance');

    return contexts;
  }

  /**
   * Get news sources information from NewsAPI
   */
  async getAvailableSourcesFromAPI(): Promise<NewsApiSource[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/sources?apiKey=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status}`);
      }

      const data = await response.json();
      return data.sources || [];

    } catch (error) {
      console.error('❌ Failed to fetch NewsAPI sources:', error);
      return [];
    }
  }

  /**
   * Test NewsAPI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sources?apiKey=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * THREE-SIGNAL SYSTEM: Calculate API score (0-30 points)
   * Based on news article analysis with source credibility weighting
   */
  async calculateAPISignalScore(
    marketClaim: string,
    region?: string
  ): Promise<{
    score: number;
    percentage: number;
    articles: ProcessedNewsArticle[];
    totalResults: number;
    sentiment: { positive: number; negative: number; neutral: number; score: number };
    recommendation: 'YES' | 'NO' | 'UNCERTAIN';
    warnings: string[];
  }> {
    const MAX_POINTS = 30;
    const warnings: string[] = [];

    try {
      // Fetch news articles
      const articles = await this.searchNews(marketClaim, [], 20);

      if (articles.length === 0) {
        warnings.push('No external API data available');
        return {
          score: 15, // Neutral score if no data
          percentage: 50,
          articles: [],
          totalResults: 0,
          sentiment: { positive: 0, negative: 0, neutral: 0, score: 0 },
          recommendation: 'UNCERTAIN',
          warnings
        };
      }

      // Source credibility tier weights
      const getSourceWeight = (sourceName: string): number => {
        const lowerSource = sourceName.toLowerCase();

        // Tier 1: Major African + International trusted sources (1.5x weight)
        const tier1 = ['bbc', 'reuters', 'associated press', 'nation.africa', 'standardmedia', 'thecitizen', 'premiumtimes', 'aljazeera'];
        if (tier1.some(s => lowerSource.includes(s))) return 1.5;

        // Tier 2: International news (1.2x weight)
        const tier2 = ['cnn', 'guardian', 'bloomberg', 'financial times', 'wall street journal', 'washington post', 'new york times'];
        if (tier2.some(s => lowerSource.includes(s))) return 1.2;

        // Tier 3: Regional media (1.0x weight)
        const tier3 = ['allafrica', 'africanews', 'yahoo', 'google news'];
        if (tier3.some(s => lowerSource.includes(s))) return 1.0;

        // Tier 4: Unknown sources (0.4x weight)
        return 0.4;
      };

      // Analyze sentiment with credibility weighting
      const positiveWords = ['confirm', 'confirmed', 'success', 'win', 'won', 'achieve', 'achieved', 'complete', 'completed', 'yes', 'true', 'approved', 'passed'];
      const negativeWords = ['deny', 'denied', 'fail', 'failed', 'lose', 'lost', 'cancel', 'cancelled', 'delay', 'delayed', 'no', 'false', 'rejected'];

      let weightedConfirming = 0;
      let weightedDenying = 0;
      let weightedNeutral = 0;

      let sentimentPositive = 0;
      let sentimentNegative = 0;
      let sentimentNeutral = 0;

      articles.forEach(article => {
        const weight = getSourceWeight(article.source);
        const text = `${article.title} ${article.content}`.toLowerCase();

        const posCount = positiveWords.filter(word => text.includes(word)).length;
        const negCount = negativeWords.filter(word => text.includes(word)).length;

        if (posCount > negCount) {
          weightedConfirming += weight;
          sentimentPositive++;
        } else if (negCount > posCount) {
          weightedDenying += weight;
          sentimentNegative++;
        } else {
          weightedNeutral += weight;
          sentimentNeutral++;
        }
      });

      const total = weightedConfirming + weightedDenying + weightedNeutral;
      const yesPercentage = total > 0 ? (weightedConfirming / total) * 100 : 50;
      const apiConsensus = Math.abs(yesPercentage - 50);

      // Base score (0-25 points) based on consensus strength
      let score = (apiConsensus / 50) * 25;

      // Source quality bonus (0-5 points)
      const avgWeight = articles.length > 0 ? total / articles.length : 0;
      const qualityBonus = Math.min(5, avgWeight * 5);
      score += qualityBonus;

      // Low article count warning
      if (articles.length < 5) {
        warnings.push(`Low API result count: only ${articles.length} articles`);
      }

      score = Math.max(0, Math.min(MAX_POINTS, score));

      // Determine recommendation
      let recommendation: 'YES' | 'NO' | 'UNCERTAIN' = 'UNCERTAIN';
      if (yesPercentage > 66) recommendation = 'YES';
      else if (yesPercentage < 34) recommendation = 'NO';

      // Calculate sentiment score (-1 to +1)
      const sentimentTotal = articles.length || 1;
      const sentimentScore = (sentimentPositive - sentimentNegative) / sentimentTotal;

      console.log(`📊 API Signal Score:
        Score: ${score.toFixed(2)}/30
        Percentage: ${yesPercentage.toFixed(1)}% YES
        Articles: ${articles.length}
        Sentiment: ${sentimentPositive} positive, ${sentimentNegative} negative, ${sentimentNeutral} neutral
        Recommendation: ${recommendation}
      `);

      return {
        score,
        percentage: yesPercentage,
        articles,
        totalResults: articles.length,
        sentiment: {
          positive: sentimentPositive,
          negative: sentimentNegative,
          neutral: sentimentNeutral,
          score: sentimentScore
        },
        recommendation,
        warnings
      };

    } catch (error) {
      console.error('❌ API signal calculation failed:', error);
      warnings.push('API fetch failed');
      return {
        score: 15,
        percentage: 50,
        articles: [],
        totalResults: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0, score: 0 },
        recommendation: 'UNCERTAIN',
        warnings
      };
    }
  }
}

export const newsApiService = new NewsApiService();