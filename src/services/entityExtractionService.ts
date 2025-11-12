import { AnthropicClient } from './anthropicClient';

// Create instance
const anthropicClient = new AnthropicClient();

/**
 * Entity Extraction Service
 *
 * Extracts key entities, keywords, and context from market claims
 * to improve API search relevance and AI analysis accuracy
 */

export interface ExtractedEntities {
  mainSubject: string; // Primary entity (e.g., "Alassane Ouattara")
  secondaryEntities: string[]; // Additional entities (e.g., "Côte d'Ivoire", "president")
  keywords: string[]; // Important keywords for searching
  context: string; // Brief context summary
  searchQueries: string[]; // Optimized search queries for APIs
}

class EntityExtractionService {
  /**
   * Extract entities and keywords from a market claim
   */
  async extractEntities(claim: string, description?: string): Promise<ExtractedEntities> {
    try {
      console.log('🔍 Extracting entities from claim:', claim);

      const fullText = description ? `${claim}\n\nDescription: ${description}` : claim;

      const prompt = `Analyze this prediction market claim and extract key entities and keywords.

CLAIM: "${fullText}"

Extract the following in JSON format:
{
  "mainSubject": "The primary person, place, or thing this claim is about",
  "secondaryEntities": ["List of 2-4 related entities (people, places, organizations)"],
  "keywords": ["List of 3-5 important keywords for searching"],
  "context": "One sentence summary of what this claim is about",
  "searchQueries": ["3-5 optimized search queries to find relevant information"]
}

Guidelines:
- mainSubject should be the most important entity (person name, place, organization, event)
- secondaryEntities should include related names, places, roles, or concepts
- keywords should be terms that would help find relevant articles
- searchQueries should be natural search phrases (like you'd type in Google)

Examples:
Claim: "Alassane Ouattara is the legitimate president of Côte d'Ivoire"
{
  "mainSubject": "Alassane Ouattara",
  "secondaryEntities": ["Côte d'Ivoire", "president", "Ivory Coast government"],
  "keywords": ["Ouattara", "president", "Côte d'Ivoire", "legitimacy", "election"],
  "context": "Verification of Alassane Ouattara's legitimacy as president of Côte d'Ivoire",
  "searchQueries": [
    "Alassane Ouattara president Côte d'Ivoire",
    "Ivory Coast president legitimacy",
    "Ouattara election results",
    "Côte d'Ivoire current president",
    "Alassane Ouattara government"
  ]
}

Claim: "Bitcoin will reach $100,000 by end of 2024"
{
  "mainSubject": "Bitcoin",
  "secondaryEntities": ["cryptocurrency", "$100,000", "2024"],
  "keywords": ["Bitcoin", "price", "$100,000", "cryptocurrency", "2024"],
  "context": "Prediction about Bitcoin reaching a $100,000 price point by December 2024",
  "searchQueries": [
    "Bitcoin price prediction 2024",
    "Bitcoin $100,000",
    "cryptocurrency market 2024",
    "Bitcoin price forecast",
    "Bitcoin reaches $100k"
  ]
}

Return ONLY valid JSON, no markdown formatting.`;

      const response = await anthropicClient.generateAnalysis(prompt);
      const text = response.rawResponse || response.content || JSON.stringify(response);

      // Parse the response
      let parsed: ExtractedEntities;
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse AI response, using fallback extraction:', parseError);
        parsed = this.fallbackExtraction(claim);
      }

      console.log('✅ Extracted entities:', parsed);
      return parsed;

    } catch (error) {
      console.error('❌ Entity extraction failed:', error);
      // Return fallback extraction
      return this.fallbackExtraction(claim);
    }
  }

  /**
   * Fallback extraction using simple heuristics
   */
  private fallbackExtraction(claim: string): ExtractedEntities {
    console.log('📋 Using fallback entity extraction');

    // Simple extraction: split by common delimiters and filter
    const words = claim.split(/[\s,]+/);
    const meaningfulWords = words.filter(w => w.length > 3);

    return {
      mainSubject: meaningfulWords[0] || claim.substring(0, 30),
      secondaryEntities: meaningfulWords.slice(1, 4),
      keywords: meaningfulWords.slice(0, 5),
      context: claim.substring(0, 100),
      searchQueries: [claim, ...meaningfulWords.slice(0, 3).map(w => `${w} ${meaningfulWords[0]}`)]
    };
  }

  /**
   * Generate search queries optimized for a specific source type
   */
  async generateSourceSpecificQueries(
    entities: ExtractedEntities,
    sourceType: 'NEWS' | 'HISTORICAL' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE'
  ): Promise<string[]> {
    const { mainSubject, secondaryEntities, keywords } = entities;

    switch (sourceType) {
      case 'NEWS':
        // Recent news queries
        return [
          `${mainSubject} latest news`,
          `${mainSubject} ${secondaryEntities[0]} recent`,
          `breaking ${mainSubject}`,
          ...keywords.slice(0, 2).map(k => `${k} news today`)
        ];

      case 'HISTORICAL':
        // Historical context queries
        return [
          `${mainSubject} history`,
          `${mainSubject} ${secondaryEntities[0]} historical`,
          `${mainSubject} background`,
          `history of ${mainSubject}`
        ];

      case 'ACADEMIC':
        // Academic/scholarly queries
        return [
          `${mainSubject} research`,
          `${mainSubject} study`,
          `${mainSubject} academic`,
          `scholarly ${mainSubject}`
        ];

      case 'GENERAL_KNOWLEDGE':
      default:
        // General encyclopedic queries
        return [
          mainSubject,
          `${mainSubject} ${secondaryEntities[0]}`,
          ...secondaryEntities.slice(0, 2),
          `what is ${mainSubject}`
        ];
    }
  }
}

export const entityExtractionService = new EntityExtractionService();
