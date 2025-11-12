interface WikipediaSearchResult {
  ns: number;
  title: string;
  pageid: number;
  size: number;
  wordcount: number;
  snippet: string;
  timestamp: string;
}

interface WikipediaPage {
  pageid: number;
  ns: number;
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface ProcessedWikipediaArticle {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt: Date;
  relevanceScore?: number;
  imageUrl?: string;
  wordCount?: number;
}

export class WikipediaService {
  private readonly baseUrl = 'https://en.wikipedia.org/api/rest_v1';
  private readonly apiUrl = 'https://en.wikipedia.org/w/api.php';

  /**
   * Extract search keywords from market topic for Wikipedia search
   */
  private extractWikipediaKeywords(marketTopic: string): string[] {
    // Remove prediction market specific words and focus on core concepts
    const cleaned = marketTopic
      .toLowerCase()
      .replace(/\b(has|did|was|were|really|actually|truly|existed|happened|occurred|will|be|the|is|are|on|in|at|by|for|to|from|with|and|or|but)\b/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract meaningful terms, prioritizing proper nouns and important concepts
    const terms = cleaned.split(' ')
      .filter(term => term.length > 2)
      .slice(0, 3); // Limit to most important terms for Wikipedia search

    return terms;
  }

  /**
   * Search Wikipedia articles related to the market topic
   */
  async searchWikipedia(
    marketTopic: string,
    maxResults: number = 10
  ): Promise<ProcessedWikipediaArticle[]> {
    try {
      console.log(`🔍 Searching Wikipedia for: "${marketTopic}"`);

      const keywords = this.extractWikipediaKeywords(marketTopic);
      const searchQuery = keywords.join(' ');

      console.log(`📚 Wikipedia search terms: ${keywords.join(', ')}`);

      // Step 1: Search for relevant articles
      const searchResults = await this.performWikipediaSearch(searchQuery, maxResults);

      if (searchResults.length === 0) {
        console.log('⚠️ No Wikipedia articles found, trying broader search');
        // Try with just the first keyword if no results
        const broaderResults = await this.performWikipediaSearch(keywords[0], 5);
        if (broaderResults.length === 0) {
          return [];
        }
        searchResults.push(...broaderResults);
      }

      // Step 2: Get detailed content for each article
      const detailedArticles: ProcessedWikipediaArticle[] = [];

      for (const result of searchResults.slice(0, maxResults)) {
        try {
          const pageContent = await this.getWikipediaPageContent(result.title);
          if (pageContent) {
            const processedArticle: ProcessedWikipediaArticle = {
              id: `wikipedia_${result.pageid}`,
              source: 'Wikipedia',
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
              title: result.title,
              content: pageContent.extract,
              publishedAt: new Date(result.timestamp),
              wordCount: result.wordcount,
              imageUrl: pageContent.thumbnail?.source,
              relevanceScore: this.calculateWikipediaRelevance(
                result.title + ' ' + pageContent.extract,
                marketTopic
              )
            };

            detailedArticles.push(processedArticle);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get content for "${result.title}":`, error);
          continue;
        }

        // Add delay to be respectful to Wikipedia's API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Sort by relevance score
      const sortedArticles = detailedArticles
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      console.log(`✅ Found ${sortedArticles.length} relevant Wikipedia articles`);

      return sortedArticles;

    } catch (error) {
      console.error('❌ Wikipedia search failed:', error);
      throw error;
    }
  }

  /**
   * Perform Wikipedia search using the OpenSearch API
   */
  private async performWikipediaSearch(
    query: string,
    maxResults: number
  ): Promise<WikipediaSearchResult[]> {

    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      srlimit: maxResults.toString(),
      srprop: 'size|wordcount|timestamp|snippet',
      origin: '*' // Enable CORS
    });

    const searchUrl = `${this.apiUrl}?${params.toString()}`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Wikipedia search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.query?.search || [];
  }

  /**
   * Get detailed content for a specific Wikipedia page
   */
  private async getWikipediaPageContent(title: string): Promise<WikipediaPage | null> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        titles: title,
        prop: 'extracts|pageimages',
        exintro: 'true',
        explaintext: 'true',
        exsectionformat: 'plain',
        piprop: 'thumbnail',
        pithumbsize: '300',
        format: 'json',
        origin: '*'
      });

      const url = `${this.apiUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch Wikipedia page: ${response.status}`);
      }

      const data = await response.json();
      const pages = data.query?.pages;

      if (!pages) {
        return null;
      }

      // Get the first (and should be only) page
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page.missing) {
        return null;
      }

      // Limit extract length for performance
      const extract = page.extract ? page.extract.substring(0, 2000) : '';

      return {
        pageid: page.pageid,
        ns: page.ns,
        title: page.title,
        extract: extract,
        thumbnail: page.thumbnail
      };

    } catch (error) {
      console.error(`Error fetching Wikipedia page "${title}":`, error);
      return null;
    }
  }

  /**
   * Calculate relevance score for Wikipedia content
   */
  private calculateWikipediaRelevance(text: string, marketTopic: string): number {
    const keywords = this.extractWikipediaKeywords(marketTopic);
    const textLower = text.toLowerCase();

    let score = 0;
    let totalWeight = 0;

    keywords.forEach((keyword, index) => {
      const weight = keywords.length - index; // Earlier keywords are more important
      totalWeight += weight;

      // Exact matches get full weight
      if (textLower.includes(keyword.toLowerCase())) {
        score += weight;
      }

      // Partial matches get partial weight
      const words = keyword.split(' ');
      words.forEach(word => {
        if (word.length > 3 && textLower.includes(word.toLowerCase())) {
          score += weight * 0.3;
        }
      });
    });

    // Boost score for titles that match closely
    if (keywords.some(keyword => textLower.startsWith(keyword.toLowerCase()))) {
      score += 2;
      totalWeight += 2;
    }

    return totalWeight > 0 ? Math.min(score / totalWeight, 1) : 0;
  }

  /**
   * Get a summary of what Wikipedia will provide for a given topic
   */
  async getTopicSummary(marketTopic: string): Promise<string> {
    try {
      const keywords = this.extractWikipediaKeywords(marketTopic);
      const searchResults = await this.performWikipediaSearch(keywords.join(' '), 3);

      if (searchResults.length === 0) {
        return "No relevant Wikipedia articles found for this topic.";
      }

      const topTitles = searchResults.slice(0, 3).map(r => r.title);
      return `Will search Wikipedia articles: ${topTitles.join(', ')}`;

    } catch (error) {
      return "Wikipedia search preview unavailable.";
    }
  }

  /**
   * Test Wikipedia API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}?action=query&format=json&meta=siteinfo&origin=*`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const wikipediaService = new WikipediaService();