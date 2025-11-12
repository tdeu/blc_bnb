type DataSourceType = 'NEWS' | 'HISTORICAL' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE';

interface ClassificationResult {
  type: DataSourceType;
  confidence: number;
  keywords: string[];
  reasoning: string;
}

export class MarketClassificationService {
  // Enhanced keyword patterns for different market types
  private readonly classificationPatterns = {
    NEWS: {
      indicators: [
        'will', 'going to', 'expected to', 'announced', 'breaking', 'recent',
        'today', 'yesterday', 'this week', 'this month', 'current', 'latest',
        'trump', 'biden', 'election', 'government', 'policy', 'covid', 'ukraine',
        'stock market', 'economy', 'inflation', 'war', 'climate summit'
      ],
      timeIndicators: ['2024', '2025', 'before', 'after', 'during', 'by the end'],
      confidence: 0.8
    },

    HISTORICAL: {
      indicators: [
        'has', 'was', 'were', 'did', 'existed', 'happened', 'occurred',
        'historically', 'history', 'ancient', 'founded', 'established',
        'jesus', 'napoleon', 'caesar', 'cleopatra', 'einstein', 'lincoln',
        'world war', 'revolution', 'empire', 'dynasty', 'medieval', 'renaissance',
        'archaeological', 'excavation', 'artifact', 'civilization', 'century',
        'bc', 'ad', 'bce', 'ce', 'decade ago', 'years ago'
      ],
      timeIndicators: [
        '1900s', '1800s', '1700s', '19th century', '20th century', 'middle ages',
        'stone age', 'bronze age', 'iron age', 'antiquity'
      ],
      confidence: 0.9
    },

    ACADEMIC: {
      indicators: [
        'research', 'study', 'studies', 'proven', 'evidence', 'scientific',
        'peer-reviewed', 'published', 'journal', 'experiment', 'analysis',
        'hypothesis', 'theory', 'findings', 'conclusion', 'methodology',
        'data shows', 'statistics', 'survey', 'clinical trial', 'meta-analysis',
        'correlation', 'causation', 'significant', 'p-value', 'confidence interval'
      ],
      scientificFields: [
        'medicine', 'psychology', 'biology', 'physics', 'chemistry', 'neuroscience',
        'genetics', 'oncology', 'cardiology', 'psychiatry', 'sociology', 'economics'
      ],
      confidence: 0.85
    },

    GENERAL_KNOWLEDGE: {
      indicators: [
        'what is', 'definition', 'meaning', 'explain', 'how does', 'why does',
        'facts about', 'information', 'encyclopedia', 'wikipedia', 'common knowledge',
        'generally known', 'widely accepted', 'consensus', 'standard', 'typical'
      ],
      conceptualTerms: [
        'concept', 'principle', 'law', 'rule', 'formula', 'equation', 'theorem',
        'classification', 'category', 'type', 'species', 'genus', 'family'
      ],
      confidence: 0.7
    }
  };

  /**
   * Automatically classify a market question into the appropriate data source type
   */
  classifyMarket(marketQuestion: string): ClassificationResult {
    const question = marketQuestion.toLowerCase().trim();
    const scores: { [key in DataSourceType]: { score: number; keywords: string[]; } } = {
      NEWS: { score: 0, keywords: [] },
      HISTORICAL: { score: 0, keywords: [] },
      ACADEMIC: { score: 0, keywords: [] },
      GENERAL_KNOWLEDGE: { score: 0, keywords: [] }
    };

    // Check each classification type
    for (const [type, patterns] of Object.entries(this.classificationPatterns)) {
      const typeKey = type as DataSourceType;
      const typePatterns = patterns as any;

      // Check main indicators
      for (const indicator of typePatterns.indicators) {
        if (question.includes(indicator.toLowerCase())) {
          scores[typeKey].score += 2;
          scores[typeKey].keywords.push(indicator);
        }
      }

      // Check time indicators (if they exist)
      if (typePatterns.timeIndicators) {
        for (const timeIndicator of typePatterns.timeIndicators) {
          if (question.includes(timeIndicator.toLowerCase())) {
            scores[typeKey].score += 1.5;
            scores[typeKey].keywords.push(timeIndicator);
          }
        }
      }

      // Check scientific fields for ACADEMIC
      if (typeKey === 'ACADEMIC' && typePatterns.scientificFields) {
        for (const field of typePatterns.scientificFields) {
          if (question.includes(field.toLowerCase())) {
            scores[typeKey].score += 1.5;
            scores[typeKey].keywords.push(field);
          }
        }
      }

      // Check conceptual terms for GENERAL_KNOWLEDGE
      if (typeKey === 'GENERAL_KNOWLEDGE' && typePatterns.conceptualTerms) {
        for (const term of typePatterns.conceptualTerms) {
          if (question.includes(term.toLowerCase())) {
            scores[typeKey].score += 1;
            scores[typeKey].keywords.push(term);
          }
        }
      }
    }

    // Apply additional context-based scoring
    this.applyContextualScoring(question, scores);

    // Find the highest scoring type
    let bestType: DataSourceType = 'NEWS'; // Default fallback
    let bestScore = scores.NEWS.score;
    let bestKeywords = scores.NEWS.keywords;

    for (const [type, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestType = type as DataSourceType;
        bestScore = data.score;
        bestKeywords = data.keywords;
      }
    }

    // Calculate confidence based on score gap and absolute score
    const secondBestScore = Math.max(...Object.values(scores)
      .map(s => s.score)
      .filter(score => score !== bestScore));

    const scoreGap = bestScore - secondBestScore;
    const baseConfidence = this.classificationPatterns[bestType].confidence;

    // Adjust confidence based on score strength and gap
    let confidence = baseConfidence;
    if (bestScore >= 4 && scoreGap >= 2) {
      confidence = Math.min(0.95, baseConfidence + 0.1);
    } else if (bestScore < 2) {
      confidence = Math.max(0.3, baseConfidence - 0.2);
    }

    return {
      type: bestType,
      confidence: confidence,
      keywords: bestKeywords.slice(0, 5), // Limit to top 5 keywords
      reasoning: this.generateReasoning(bestType, bestKeywords, bestScore, question)
    };
  }

  /**
   * Apply additional contextual scoring rules
   */
  private applyContextualScoring(
    question: string,
    scores: { [key in DataSourceType]: { score: number; keywords: string[]; } }
  ): void {
    // Future tense strongly indicates NEWS
    if (this.containsFutureTense(question)) {
      scores.NEWS.score += 3;
      scores.NEWS.keywords.push('future_tense');
    }

    // Past tense with distant time indicators suggests HISTORICAL
    if (this.containsDistantPast(question)) {
      scores.HISTORICAL.score += 2;
      scores.HISTORICAL.keywords.push('distant_past');
    }

    // Question format suggests GENERAL_KNOWLEDGE
    if (this.isDefinitionQuestion(question)) {
      scores.GENERAL_KNOWLEDGE.score += 2;
      scores.GENERAL_KNOWLEDGE.keywords.push('definition_format');
    }

    // Academic language patterns
    if (this.containsAcademicLanguage(question)) {
      scores.ACADEMIC.score += 2;
      scores.ACADEMIC.keywords.push('academic_language');
    }

    // Named entity recognition for historical figures
    if (this.containsHistoricalEntity(question)) {
      scores.HISTORICAL.score += 3;
      scores.HISTORICAL.keywords.push('historical_entity');
    }
  }

  private containsFutureTense(question: string): boolean {
    const futureTensePatterns = [
      /will\s+\w+/, /going\s+to/, /expected\s+to/, /likely\s+to/,
      /predict/, /forecast/, /by\s+\d{4}/, /before\s+\d{4}/
    ];
    return futureTensePatterns.some(pattern => pattern.test(question));
  }

  private containsDistantPast(question: string): boolean {
    const distantPastPatterns = [
      /\d+\s+(years?|decades?|centuries?)\s+ago/,
      /in\s+the\s+\d+(st|nd|rd|th)\s+century/,
      /during\s+the\s+(ancient|medieval|renaissance)/,
      /(bc|bce|ad|ce)\s*\d+/
    ];
    return distantPastPatterns.some(pattern => pattern.test(question));
  }

  private isDefinitionQuestion(question: string): boolean {
    const definitionPatterns = [
      /^what\s+is/, /^what\s+are/, /^who\s+is/, /^who\s+was/,
      /^how\s+does/, /^why\s+does/, /define/, /definition\s+of/,
      /meaning\s+of/, /explain\s+the/
    ];
    return definitionPatterns.some(pattern => pattern.test(question));
  }

  private containsAcademicLanguage(question: string): boolean {
    const academicPatterns = [
      /according\s+to\s+(research|studies)/, /peer[\s-]reviewed/,
      /clinical\s+trial/, /meta[\s-]analysis/, /statistical\s+significance/,
      /confidence\s+interval/, /hypothesis/, /methodology/
    ];
    return academicPatterns.some(pattern => pattern.test(question));
  }

  private containsHistoricalEntity(question: string): boolean {
    // Famous historical figures and events
    const historicalEntities = [
      'jesus', 'christ', 'napoleon', 'caesar', 'cleopatra', 'einstein',
      'lincoln', 'washington', 'churchill', 'gandhi', 'hitler', 'stalin',
      'world war', 'cold war', 'french revolution', 'american revolution',
      'roman empire', 'byzantine empire', 'ottoman empire', 'british empire'
    ];

    return historicalEntities.some(entity =>
      question.includes(entity.toLowerCase())
    );
  }

  private generateReasoning(
    type: DataSourceType,
    keywords: string[],
    score: number,
    question: string
  ): string {
    const keywordList = keywords.length > 0 ? keywords.join(', ') : 'contextual patterns';

    switch (type) {
      case 'NEWS':
        return `Classified as NEWS based on ${keywordList}. Contains current affairs, recent events, or future predictions that require up-to-date news coverage.`;

      case 'HISTORICAL':
        return `Classified as HISTORICAL based on ${keywordList}. References past events, historical figures, or distant time periods requiring historical documentation.`;

      case 'ACADEMIC':
        return `Classified as ACADEMIC based on ${keywordList}. Contains scientific terminology, research references, or requires peer-reviewed academic sources.`;

      case 'GENERAL_KNOWLEDGE':
        return `Classified as GENERAL KNOWLEDGE based on ${keywordList}. Appears to be seeking factual information or definitions available in encyclopedic sources.`;

      default:
        return `Auto-classified with ${score} confidence points from detected patterns: ${keywordList}.`;
    }
  }

  /**
   * Get human-readable explanation of classification types
   */
  getClassificationExplanations(): { [key in DataSourceType]: string } {
    return {
      NEWS: "Recent events, current affairs, breaking news, political developments, economic updates, and future predictions that require real-time news coverage.",
      HISTORICAL: "Past events, historical figures, ancient civilizations, wars, empires, and any questions about what happened in history.",
      ACADEMIC: "Scientific research, peer-reviewed studies, medical findings, academic theories, and questions requiring scholarly sources.",
      GENERAL_KNOWLEDGE: "Factual information, definitions, encyclopedia entries, widely known facts, and established knowledge."
    };
  }
}

export const marketClassificationService = new MarketClassificationService();