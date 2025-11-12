import * as cheerio from 'cheerio';

export interface ScrapedContent {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
  author?: string;
  relevanceScore?: number;
}

export interface ExternalSource {
  id: string;
  name: string;
  baseUrl: string;
  category: 'news' | 'government' | 'academic' | 'financial';
  reliability: number; // 0-1 scale
  enabled: boolean;
  searchMethod: 'search' | 'rss' | 'api';
  searchPattern?: string; // URL pattern for search, e.g., "/search?q={query}"
  rssUrl?: string;
  apiKey?: string;
}

export class WebScrapingService {
  private defaultSources: ExternalSource[] = [
    {
      id: 'bbc',
      name: 'BBC News',
      baseUrl: 'https://www.bbc.com',
      category: 'news',
      reliability: 0.95,
      enabled: true,
      searchMethod: 'search',
      searchPattern: '/search?q={query}'
    },
    {
      id: 'reuters',
      name: 'Reuters',
      baseUrl: 'https://www.reuters.com',
      category: 'news',
      reliability: 0.98,
      enabled: true,
      searchMethod: 'search',
      searchPattern: '/search/news?blob={query}'
    },
    {
      id: 'cnn',
      name: 'CNN',
      baseUrl: 'https://www.cnn.com',
      category: 'news',
      reliability: 0.85,
      enabled: true,
      searchMethod: 'search',
      searchPattern: '/search?q={query}'
    },
    {
      id: 'ap',
      name: 'Associated Press',
      baseUrl: 'https://apnews.com',
      category: 'news',
      reliability: 0.97,
      enabled: true,
      searchMethod: 'search',
      searchPattern: '/search?q={query}'
    }
  ];

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract search terms from market topic
   */
  extractSearchTerms(marketTopic: string): string[] {
    // Simple extraction - can be enhanced with NLP later
    const cleaned = marketTopic
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove common words
    const stopWords = ['will', 'be', 'the', 'is', 'are', 'was', 'were', 'on', 'in', 'at', 'by', 'for', 'to', 'from', 'with', 'and', 'or', 'but'];
    const terms = cleaned.split(' ').filter(term =>
      term.length > 2 && !stopWords.includes(term)
    );

    return terms.slice(0, 5); // Limit to 5 most relevant terms
  }

  /**
   * Scrape a single source for content related to the market topic
   */
  async scrapeSource(source: ExternalSource, marketTopic: string): Promise<ScrapedContent[]> {
    try {
      console.log(`🔍 Scraping ${source.name} for: "${marketTopic}"`);

      const searchTerms = this.extractSearchTerms(marketTopic);
      const query = searchTerms.join(' ');

      if (source.searchMethod === 'search' && source.searchPattern) {
        const searchUrl = source.baseUrl + source.searchPattern.replace('{query}', encodeURIComponent(query));
        return await this.scrapeSearchResults(source, searchUrl, marketTopic);
      }

      // For now, return empty array for other methods
      console.log(`⚠️ Search method ${source.searchMethod} not implemented yet for ${source.name}`);
      return [];

    } catch (error) {
      console.error(`❌ Error scraping ${source.name}:`, error);
      return [];
    }
  }

  /**
   * Scrape search results page
   */
  private async scrapeSearchResults(source: ExternalSource, searchUrl: string, marketTopic: string): Promise<ScrapedContent[]> {
    try {
      // Add delay to be respectful to servers
      await this.delay(1000);

      console.log(`📡 Fetching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Debug logging
      console.log(`📄 HTML length: ${html.length} chars from ${source.name}`);
      console.log(`🔍 First 500 chars: ${html.substring(0, 500)}`);

      const $ = cheerio.load(html);

      return this.parseSearchResults($, source, marketTopic);

    } catch (error) {
      console.error(`❌ Error fetching ${searchUrl}:`, error);

      // TEMPORARY: Return mock content for testing when scraping fails
      console.log(`🔄 Using mock content for ${source.name} due to scraping failure`);
      return this.generateMockContent(source, marketTopic);
    }
  }

  /**
   * Generate mock content for testing when scraping fails
   */
  private generateMockContent(source: ExternalSource, marketTopic: string): ScrapedContent[] {
    // Generate relevant mock content based on the market topic
    const mockContent: ScrapedContent[] = [
      {
        id: `mock_${source.id}_${Date.now()}`,
        source: source.name,
        url: `https://${source.id}.com/mock-article`,
        title: `Mock Article about ${marketTopic.substring(0, 50)}`,
        content: `This is mock content for testing purposes. The actual article would contain relevant information about: ${marketTopic}. Mock analysis content to test the AI processing system.`,
        publishedAt: new Date(),
        relevanceScore: 0.8
      }
    ];

    console.log(`🎭 Generated ${mockContent.length} mock articles for ${source.name}`);
    return mockContent;
  }

  /**
   * Parse search results HTML based on source
   */
  private parseSearchResults($: cheerio.CheerioAPI, source: ExternalSource, marketTopic: string): ScrapedContent[] {
    const results: ScrapedContent[] = [];

    try {
      // Generic selectors - can be customized per source
      let articleSelectors: string[] = [];

      switch (source.id) {
        case 'bbc':
          articleSelectors = ['[data-testid="edinburgh-article"]', '.gs-c-promo', '.gel-layout__item'];
          break;
        case 'reuters':
          articleSelectors = ['.search-result-indiv', '.MediaStoryCard', '.story-card'];
          break;
        case 'cnn':
          articleSelectors = ['.cnn-search__result', '.cd__content', '.card'];
          break;
        case 'ap':
          articleSelectors = ['.SearchResultsModule-results', '.CardHeadline', '.Component-root'];
          break;
        default:
          // Generic fallback
          articleSelectors = ['article', '.article', '.story', '.news-item', '.result'];
      }

      console.log(`🎯 Trying selectors for ${source.name}:`, articleSelectors);

      for (const selector of articleSelectors) {
        const elements = $(selector);
        console.log(`🔍 Selector "${selector}" found ${elements.length} elements`);

        $(selector).slice(0, 5).each((i, element) => {
          const $el = $(element);

          // Extract title
          const title = $el.find('h1, h2, h3, h4, .title, .headline, [data-testid="edinburgh-article"] h3').first().text().trim()
            || $el.find('a').first().text().trim()
            || $el.text().substring(0, 100).trim();

          // Extract link
          const link = $el.find('a').first().attr('href') || '';
          const url = link.startsWith('http') ? link : (link.startsWith('/') ? source.baseUrl + link : '');

          // Extract snippet/content
          const content = $el.find('p, .summary, .description, .snippet').first().text().trim()
            || $el.text().trim();

          if (title && url && title.length > 10) {
            results.push({
              id: `${source.id}_${Date.now()}_${i}`,
              source: source.name,
              url,
              title,
              content: content.substring(0, 500), // Limit content length
              publishedAt: new Date(), // Could parse actual date from HTML
              relevanceScore: this.calculateRelevance(title + ' ' + content, marketTopic)
            });
          }
        });

        if (results.length > 0) break; // Found results with this selector
      }

    } catch (error) {
      console.error(`❌ Error parsing ${source.name} results:`, error);
    }

    console.log(`✅ Found ${results.length} results from ${source.name}`);
    return results.slice(0, 3); // Limit to top 3 results per source
  }

  /**
   * Calculate relevance score (simple keyword matching for now)
   */
  private calculateRelevance(text: string, marketTopic: string): number {
    const searchTerms = this.extractSearchTerms(marketTopic);
    const textLower = text.toLowerCase();

    let score = 0;
    for (const term of searchTerms) {
      if (textLower.includes(term.toLowerCase())) {
        score += 1;
      }
    }

    return Math.min(score / searchTerms.length, 1); // Normalize to 0-1
  }

  /**
   * Get available sources (can be filtered by admin selection)
   */
  getAvailableSources(): ExternalSource[] {
    return this.defaultSources.filter(source => source.enabled);
  }

  /**
   * Main entry point: scrape multiple sources for a market topic
   */
  async scrapeMultipleSources(sourceIds: string[], marketTopic: string): Promise<ScrapedContent[]> {
    console.log(`🚀 Starting backend scraping for "${marketTopic}"...`);

    try {
      // Call backend scraping endpoint
      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: marketTopic
        })
      });

      if (!response.ok) {
        throw new Error(`Backend scraping failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Backend scraping complete! Found ${data.total} total results`);

      // Convert backend results to our ScrapedContent format
      const results: ScrapedContent[] = data.results.map((item: any) => ({
        id: item.id,
        source: item.source,
        url: item.url,
        title: item.title,
        content: item.content,
        publishedAt: new Date(item.publishedAt),
        relevanceScore: item.relevanceScore
      }));

      return results;

    } catch (error) {
      console.error(`❌ Backend scraping failed:`, error);

      // Fallback to mock content if backend fails
      console.log(`🔄 Using mock content as fallback`);
      return this.generateMockContentForAllSources(marketTopic);
    }
  }

  /**
   * Generate mock content for all sources as fallback
   */
  private generateMockContentForAllSources(marketTopic: string): ScrapedContent[] {
    const sources = this.defaultSources.filter(source => source.enabled);
    const mockResults: ScrapedContent[] = [];

    for (const source of sources) {
      const mockContent = this.generateMockContent(source, marketTopic);
      mockResults.push(...mockContent);
    }

    console.log(`🎭 Generated ${mockResults.length} mock articles as fallback`);
    return mockResults;
  }
}

export const webScrapingService = new WebScrapingService();