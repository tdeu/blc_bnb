import { AnthropicClient } from './anthropicClient';
import { ScrapedContent } from './webScrapingService';

type DataSourceType = 'NEWS' | 'HISTORICAL' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE';

export interface AIAnalysisResult {
  recommendation: 'YES' | 'NO' | 'INCONCLUSIVE';
  confidence: number; // 0-1 scale
  reasoning: string;
  keyFactors: string[];
  sourceAnalysis: {
    [sourceName: string]: {
      position: 'YES' | 'NO' | 'NEUTRAL';
      confidence: number;
      summary: string;
    };
  };
  processingTimeMs: number;
}

export class AIAnalysisService {
  private anthropicClient: AnthropicClient;

  constructor() {
    this.anthropicClient = new AnthropicClient();
  }

  /**
   * Analyze scraped content and generate Y/N recommendation
   */
  async analyzeContent(
    marketQuestion: string,
    scrapedContent: ScrapedContent[]
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Analyzing ${scrapedContent.length} pieces of content for: "${marketQuestion}"`);

      if (scrapedContent.length === 0) {
        return {
          recommendation: 'INCONCLUSIVE',
          confidence: 0,
          reasoning: 'No external content found to analyze.',
          keyFactors: [],
          sourceAnalysis: {},
          processingTimeMs: Date.now() - startTime
        };
      }

      // Detect if this is verification (past event) or prediction (future event)
      const isVerification = this.detectVerificationQuestion(marketQuestion);
      console.log(`📊 Market type detected: ${isVerification ? 'VERIFICATION (past event)' : 'PREDICTION (future event)'}`);

      // Create appropriate analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(marketQuestion, scrapedContent, isVerification);

      // Get AI analysis
      const aiResponse = await this.anthropicClient.generateAnalysis(analysisPrompt);

      // Parse the AI response
      const analysisResult = this.parseAIResponse(aiResponse, scrapedContent, startTime);

      console.log(`✅ AI analysis complete: ${analysisResult.recommendation} (${(analysisResult.confidence * 100).toFixed(0)}% confidence)`);

      return analysisResult;

    } catch (error) {
      console.error('❌ Error during AI analysis:', error);

      return {
        recommendation: 'INCONCLUSIVE',
        confidence: 0,
        reasoning: `Analysis failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        keyFactors: ['Technical error during analysis'],
        sourceAnalysis: {},
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Enhanced analysis method that considers data source type
   */
  async analyzeContentWithSourceType(
    marketQuestion: string,
    scrapedContent: ScrapedContent[],
    dataSourceType: DataSourceType
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Analyzing ${scrapedContent.length} ${dataSourceType} sources for: "${marketQuestion}"`);

      if (scrapedContent.length === 0) {
        return {
          recommendation: 'INCONCLUSIVE',
          confidence: 0,
          reasoning: `No ${dataSourceType.toLowerCase()} content found to analyze.`,
          keyFactors: [],
          sourceAnalysis: {},
          processingTimeMs: Date.now() - startTime
        };
      }

      // Build analysis prompt based on data source type
      const analysisPrompt = this.buildSourceTypeSpecificPrompt(marketQuestion, scrapedContent, dataSourceType);

      // Get AI analysis
      const aiResponse = await this.anthropicClient.generateAnalysis(analysisPrompt);

      // Parse the AI response
      const analysisResult = this.parseAIResponse(aiResponse, scrapedContent, startTime);

      console.log(`✅ AI analysis (${dataSourceType}) complete: ${analysisResult.recommendation} (${(analysisResult.confidence * 100).toFixed(0)}% confidence)`);

      return analysisResult;

    } catch (error) {
      console.error('❌ Error during AI analysis:', error);

      return {
        recommendation: 'INCONCLUSIVE',
        confidence: 0,
        reasoning: `Analysis failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        keyFactors: ['Technical error during analysis'],
        sourceAnalysis: {},
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Detect if question is about verification (past event) vs prediction (future event)
   */
  private detectVerificationQuestion(question: string): boolean {
    const verificationKeywords = [
      'did', 'has', 'have', 'was', 'were', 'happened', 'occurred', 'existed', 'exist',
      'really', 'actually', 'truly', 'fact', 'true', 'false', 'confirm', 'verify',
      'already', 'previously', 'past', 'before', 'ago', 'in the past'
    ];

    const futureKeywords = [
      'will', 'shall', 'going to', 'predict', 'forecast', 'future', 'next',
      'by 2024', 'by 2025', 'by end of', 'before', 'after', 'soon', 'upcoming'
    ];

    const questionLower = question.toLowerCase();

    const verificationCount = verificationKeywords.filter(keyword =>
      questionLower.includes(keyword)
    ).length;

    const futureCount = futureKeywords.filter(keyword =>
      questionLower.includes(keyword)
    ).length;

    // If more verification keywords, it's likely a verification question
    return verificationCount > futureCount;
  }

  /**
   * Build source-type-specific prompt for AI analysis
   */
  private buildSourceTypeSpecificPrompt(
    marketQuestion: string,
    scrapedContent: ScrapedContent[],
    dataSourceType: DataSourceType
  ): string {
    const contentSummary = scrapedContent.map((content, index) => {
      return `## Source ${index + 1}: ${content.source}
**URL**: ${content.url}
**Title**: ${content.title}
**Content**: ${content.content}
**Relevance Score**: ${((content.relevanceScore || 0) * 100).toFixed(0)}%
`;
    }).join('\n\n');

    const sourcesUsed = [...new Set(scrapedContent.map(c => c.source))].join(', ');

    switch (dataSourceType) {
      case 'NEWS':
        return this.buildNewsPrompt(marketQuestion, contentSummary, sourcesUsed, scrapedContent);

      case 'HISTORICAL':
        return this.buildHistoricalPrompt(marketQuestion, contentSummary, sourcesUsed, scrapedContent);

      case 'ACADEMIC':
        return this.buildAcademicPrompt(marketQuestion, contentSummary, sourcesUsed, scrapedContent);

      case 'GENERAL_KNOWLEDGE':
        return this.buildGeneralKnowledgePrompt(marketQuestion, contentSummary, sourcesUsed, scrapedContent);

      default:
        // Fallback to the original method
        return this.buildAnalysisPrompt(marketQuestion, scrapedContent);
    }
  }

  private buildNewsPrompt(marketQuestion: string, contentSummary: string, sourcesUsed: string, scrapedContent: ScrapedContent[]): string {
    return `You are an expert news analyst evaluating current events and future predictions based on recent news coverage.

**NEWS ANALYSIS QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Analyze recent news coverage and current trends to determine if this event is likely to occur or has occurred.

**ANALYSIS CRITERIA**:
1. Focus on recent developments, breaking news, and current affairs
2. Weight sources by credibility (established news outlets = very high; tabloids = lower)
3. Look for official statements, expert opinions, and reliable reporting
4. Consider breaking news that may change the situation rapidly
5. Account for media bias and seek multiple perspectives

**NEWS CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

${this.getStandardOutputFormat(scrapedContent)}

**IMPORTANT GUIDELINES**:
- Answer YES if current news trends strongly support the outcome
- Answer NO if reliable news sources indicate the outcome is unlikely
- Answer INCONCLUSIVE if news coverage is mixed, limited, or unreliable
- Be aware that news can be fast-changing - recent developments are most important
- Consider source credibility when weighing conflicting reports`;
  }

  private buildHistoricalPrompt(marketQuestion: string, contentSummary: string, sourcesUsed: string, scrapedContent: ScrapedContent[]): string {
    return `You are a professional historian and fact-checker analyzing historical claims using encyclopedic and scholarly sources.

**HISTORICAL QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Determine the historical accuracy of this claim based on documented evidence, scholarly consensus, and reliable historical sources.

**HISTORICAL ANALYSIS CRITERIA**:
1. Focus on documented historical evidence and scholarly consensus
2. Weight sources by academic credibility (peer-reviewed, established institutions = highest)
3. Look for archaeological evidence, primary sources, and expert historical analysis
4. Consider the quality of historical documentation for the time period
5. Distinguish between historical facts, legends, and disputed claims

**HISTORICAL CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

${this.getStandardOutputFormat(scrapedContent)}

**IMPORTANT GUIDELINES**:
- Answer YES if there is strong historical evidence and scholarly consensus
- Answer NO if historical evidence clearly contradicts the claim
- Answer INCONCLUSIVE if evidence is insufficient, disputed, or from periods with poor documentation
- Ancient and religious claims often have lower certainty than modern historical events
- Multiple independent historical sources increase confidence`;
  }

  private buildAcademicPrompt(marketQuestion: string, contentSummary: string, sourcesUsed: string, scrapedContent: ScrapedContent[]): string {
    return `You are a research analyst evaluating scientific and academic claims based on scholarly evidence and research findings.

**ACADEMIC/SCIENTIFIC QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Evaluate this claim based on scientific evidence, peer-reviewed research, and academic consensus.

**ACADEMIC ANALYSIS CRITERIA**:
1. Prioritize peer-reviewed research and established scientific institutions
2. Look for meta-analyses, systematic reviews, and large-scale studies
3. Consider the quality of methodology and statistical significance
4. Account for scientific consensus and areas of ongoing debate
5. Distinguish between correlation and causation

**ACADEMIC CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

${this.getStandardOutputFormat(scrapedContent)}

**IMPORTANT GUIDELINES**:
- Answer YES if there is strong scientific evidence and academic consensus
- Answer NO if research clearly contradicts the claim
- Answer INCONCLUSIVE if evidence is mixed, limited, or research is ongoing
- Higher standards of evidence required for scientific claims
- Consider the replication crisis and prefer well-established findings`;
  }

  private buildGeneralKnowledgePrompt(marketQuestion: string, contentSummary: string, sourcesUsed: string, scrapedContent: ScrapedContent[]): string {
    return `You are an expert fact-checker evaluating general knowledge claims using encyclopedic sources and established facts.

**GENERAL KNOWLEDGE QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Determine if this claim aligns with established general knowledge, definitions, and widely accepted facts.

**GENERAL KNOWLEDGE CRITERIA**:
1. Focus on well-established facts and definitions
2. Look for consistency across multiple encyclopedic sources
3. Consider widely accepted knowledge and expert consensus
4. Weight established institutions and reference sources highly
5. Distinguish between facts, opinions, and disputed information

**GENERAL KNOWLEDGE CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

${this.getStandardOutputFormat(scrapedContent)}

**IMPORTANT GUIDELINES**:
- Answer YES if established sources consistently confirm the claim
- Answer NO if authoritative sources clearly contradict the claim
- Answer INCONCLUSIVE if sources are inconsistent or information is disputed
- Higher confidence for well-documented facts, lower for edge cases
- Encyclopedic consensus is a strong indicator of established truth`;
  }

  private getStandardOutputFormat(scrapedContent: ScrapedContent[]): string {
    return `**CRITICAL: YOU MUST RESPOND IN EXACTLY THIS FORMAT** (do not deviate from this structure):

RECOMMENDATION: [MUST BE ONE OF: YES, NO, or INCONCLUSIVE]
CONFIDENCE: [MUST BE a decimal number between 0.0 and 1.0, e.g., 0.85 for 85%]
REASONING: [Write 2-3 clear sentences explaining your decision based on the evidence you analyzed]

KEY_FACTORS:
- [Most important supporting factor 1]
- [Most important supporting factor 2]
- [Most important supporting factor 3]

SOURCE_ANALYSIS:
${scrapedContent.map(content =>
`${content.source}: [YES/NO/NEUTRAL] - [Brief summary of this source's position]`
).join('\n')}

**EXAMPLE OF CORRECT FORMAT**:
RECOMMENDATION: YES
CONFIDENCE: 0.85
REASONING: Multiple authoritative sources confirm this claim with strong evidence. The consensus across news outlets and verified data supports a positive outcome.

KEY_FACTORS:
- Official announcement from credible institution confirms the claim
- Multiple independent sources report consistent information
- Historical data and trends support this conclusion

SOURCE_ANALYSIS:
BBC News: YES - Reports official confirmation with direct quotes
Reuters: YES - Verified through multiple sources`;
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(marketQuestion: string, scrapedContent: ScrapedContent[], isVerification: boolean = false): string {
    const contentSummary = scrapedContent.map((content, index) => {
      return `## Source ${index + 1}: ${content.source}
**URL**: ${content.url}
**Title**: ${content.title}
**Content**: ${content.content}
**Relevance Score**: ${(content.relevanceScore || 0 * 100).toFixed(0)}%
`;
    }).join('\n\n');

    const sourcesUsed = [...new Set(scrapedContent.map(c => c.source))].join(', ');

    if (isVerification) {
      return `You are an expert fact-checker analyzing historical events and verifying claims about past occurrences.

**VERIFICATION QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Determine whether this historical claim or past event is TRUE or FALSE based on factual evidence from trusted sources.

**VERIFICATION CRITERIA**:
1. Focus on historical records, documented evidence, and established facts
2. Weight sources by credibility (academic, established news = very high; others = high)
3. Look for primary sources, eyewitness accounts, or documented proof
4. Consider multiple independent confirmations
5. Distinguish between myth, legend, and documented historical fact

**CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

**REQUIRED OUTPUT FORMAT** (respond exactly in this format):

RECOMMENDATION: [YES/NO/INCONCLUSIVE]
CONFIDENCE: [number between 0.0 and 1.0]
REASONING: [2-3 sentences explaining your decision based on historical evidence]

KEY_FACTORS:
- [Most important historical evidence 1]
- [Most important historical evidence 2]
- [Most important historical evidence 3]

SOURCE_ANALYSIS:
${scrapedContent.map(content =>
`${content.source}: [YES/NO/NEUTRAL] - [Brief summary of this source's position]`
).join('\n')}

**IMPORTANT GUIDELINES**:
- Answer YES if there is strong historical evidence confirming the event occurred
- Answer NO if there is clear evidence the event did not occur or is false
- Answer INCONCLUSIVE if evidence is insufficient, conflicting, or uncertain
- Be especially careful with claims about ancient history, religious events, or disputed occurrences
- Higher confidence for well-documented modern events, lower for ancient/disputed claims`;
    } else {
      return `You are an expert analyst predicting future events based on current trends and evidence.

**PREDICTION QUESTION**: "${marketQuestion}"

**YOUR TASK**:
Analyze current trends, data, and expert opinions to predict whether this future event is likely to occur.

**PREDICTION CRITERIA**:
1. Focus on current trends, market data, and expert forecasts
2. Weight sources by credibility (financial institutions, experts = very high; others = high)
3. Look for leading indicators and predictive signals
4. Consider economic, technological, and social factors
5. Account for uncertainty inherent in future predictions

**CONTENT TO ANALYZE**:
Sources: ${sourcesUsed}

${contentSummary}

**REQUIRED OUTPUT FORMAT** (respond exactly in this format):

RECOMMENDATION: [YES/NO/INCONCLUSIVE]
CONFIDENCE: [number between 0.0 and 1.0]
REASONING: [2-3 sentences explaining your prediction based on current evidence]

KEY_FACTORS:
- [Most important predictive factor 1]
- [Most important predictive factor 2]
- [Most important predictive factor 3]

SOURCE_ANALYSIS:
${scrapedContent.map(content =>
`${content.source}: [YES/NO/NEUTRAL] - [Brief summary of this source's position]`
).join('\n')}

**IMPORTANT GUIDELINES**:
- Answer YES if trends strongly support the predicted outcome
- Answer NO if evidence suggests the outcome is unlikely
- Answer INCONCLUSIVE if future is too uncertain or evidence is mixed
- Be conservative with confidence - future predictions are inherently uncertain
- Consider multiple scenarios and potential disruptions`;
    }
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(aiResponse: any, scrapedContent: ScrapedContent[], startTime: number): AIAnalysisResult {
    try {
      // Extract the raw response text
      const responseText = aiResponse.rawResponse || aiResponse.content || aiResponse.toString();

      console.log('🔍 Parsing AI response...');
      console.log('📄 Response text length:', responseText.length);
      console.log('📄 Response preview:', responseText.substring(0, 500));

      // Parse recommendation
      const recommendationMatch = responseText.match(/RECOMMENDATION:\s*(YES|NO|INCONCLUSIVE)/i);
      const recommendation = (recommendationMatch?.[1]?.toUpperCase() as 'YES' | 'NO' | 'INCONCLUSIVE') || 'INCONCLUSIVE';

      if (!recommendationMatch) {
        console.warn('⚠️  No RECOMMENDATION: found in response. Attempting intelligent parsing...');
        // Try to intelligently determine recommendation from content
        const lowerText = responseText.toLowerCase();
        if (lowerText.includes('answer: yes') || lowerText.includes('verdict: yes') || lowerText.includes('result: yes')) {
          console.log('✅ Detected YES from alternative format');
          return this.parseAlternativeFormat(responseText, 'YES', scrapedContent, startTime);
        } else if (lowerText.includes('answer: no') || lowerText.includes('verdict: no') || lowerText.includes('result: no')) {
          console.log('✅ Detected NO from alternative format');
          return this.parseAlternativeFormat(responseText, 'NO', scrapedContent, startTime);
        }
      }

      // Parse confidence
      const confidenceMatch = responseText.match(/CONFIDENCE:\s*([\d.]+)/);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

      if (!confidenceMatch) {
        console.warn('⚠️  No CONFIDENCE: found in response');
      }

      // Parse reasoning
      const reasoningMatch = responseText.match(/REASONING:\s*([^\n\r]+(?:\s*[^\n\r]+)*?)(?=\n\s*KEY_FACTORS|\n\s*SOURCE_ANALYSIS|$)/s);
      const reasoning = reasoningMatch?.[1]?.trim() || 'Unable to parse reasoning from AI response.';

      if (!reasoningMatch) {
        console.warn('⚠️  No REASONING: found in response. Using full text as reasoning.');
        // Use first paragraph as reasoning if no explicit reasoning found
        const firstParagraph = responseText.split('\n\n')[0];
        if (firstParagraph && firstParagraph.length > 20) {
          console.log('✅ Using first paragraph as reasoning');
          return this.parseAlternativeFormat(responseText, recommendation, scrapedContent, startTime);
        }
      }

      // Parse key factors
      const keyFactorsMatch = responseText.match(/KEY_FACTORS:\s*([\s\S]*?)(?=SOURCE_ANALYSIS:|$)/);
      const keyFactorsText = keyFactorsMatch?.[1] || '';
      const keyFactors = keyFactorsText
        .split('\n')
        .map(line => line.replace(/^[\s\-•*]+/, '').trim())
        .filter(line => line.length > 5)
        .slice(0, 5);

      // Parse source analysis
      const sourceAnalysis: { [sourceName: string]: { position: 'YES' | 'NO' | 'NEUTRAL'; confidence: number; summary: string } } = {};

      const sourceAnalysisMatch = responseText.match(/SOURCE_ANALYSIS:\s*([\s\S]*?)$/);
      if (sourceAnalysisMatch) {
        const sourceLines = sourceAnalysisMatch[1].split('\n').filter(line => line.trim());

        for (const line of sourceLines) {
          const sourceMatch = line.match(/^([^:]+):\s*(YES|NO|NEUTRAL)\s*-\s*(.+)$/i);
          if (sourceMatch) {
            const sourceName = sourceMatch[1].trim();
            const position = sourceMatch[2].toUpperCase() as 'YES' | 'NO' | 'NEUTRAL';
            const summary = sourceMatch[3].trim();

            sourceAnalysis[sourceName] = {
              position,
              confidence: position === 'NEUTRAL' ? 0.5 : (confidence * 0.8), // Slightly lower than overall confidence
              summary
            };
          }
        }
      }

      return {
        recommendation,
        confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0-1
        reasoning,
        keyFactors,
        sourceAnalysis,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Error parsing AI response:', error);

      return {
        recommendation: 'INCONCLUSIVE',
        confidence: 0,
        reasoning: 'Failed to parse AI analysis response.',
        keyFactors: ['Response parsing error'],
        sourceAnalysis: {},
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Parse AI response when it doesn't follow the expected format
   * Attempts to extract meaningful information from unstructured text
   */
  private parseAlternativeFormat(
    responseText: string,
    recommendation: 'YES' | 'NO' | 'INCONCLUSIVE',
    scrapedContent: ScrapedContent[],
    startTime: number
  ): AIAnalysisResult {
    console.log('🔄 Using alternative format parsing');

    // Extract confidence from percentage mentions
    const percentMatches = responseText.match(/(\d+)%/g);
    let confidence = 0.5;
    if (percentMatches && percentMatches.length > 0) {
      // Use the first percentage found as confidence
      const firstPercent = parseInt(percentMatches[0].replace('%', ''));
      confidence = Math.min(1.0, firstPercent / 100);
      console.log(`✅ Extracted confidence: ${confidence} from ${percentMatches[0]}`);
    }

    // Extract reasoning - use first substantial paragraph
    const paragraphs = responseText.split('\n\n').filter(p => p.trim().length > 30);
    const reasoning = paragraphs.length > 0
      ? paragraphs[0].replace(/^(RECOMMENDATION|CONFIDENCE|REASONING):\s*/i, '').trim()
      : responseText.substring(0, 200) + '...';

    // Extract key factors from bullet points or numbered lists
    const keyFactors: string[] = [];
    const bulletMatches = responseText.match(/[-•*]\s*(.+)/g) || [];
    const numberedMatches = responseText.match(/\d+\.\s*(.+)/g) || [];

    [...bulletMatches, ...numberedMatches]
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 5)
      .forEach(factor => keyFactors.push(factor));

    // If no structured factors found, extract key sentences
    if (keyFactors.length === 0) {
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      keyFactors.push(...sentences.slice(0, 3).map(s => s.trim()));
    }

    // Create basic source analysis based on the sources we had
    const sourceAnalysis: { [sourceName: string]: { position: 'YES' | 'NO' | 'NEUTRAL'; confidence: number; summary: string } } = {};
    scrapedContent.slice(0, 5).forEach(content => {
      sourceAnalysis[content.source] = {
        position: recommendation,
        confidence: confidence * 0.8,
        summary: `Analysis incorporated ${content.source} data`
      };
    });

    console.log('✅ Alternative format parsing complete:', {
      recommendation,
      confidence,
      keyFactorsCount: keyFactors.length,
      sourcesCount: Object.keys(sourceAnalysis).length
    });

    return {
      recommendation,
      confidence,
      reasoning,
      keyFactors,
      sourceAnalysis,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generate a summary for the aggregate view
   */
  generateAggregateSummary(analysis: AIAnalysisResult): string {
    const confidencePercent = (analysis.confidence * 100).toFixed(0);
    const sourcesCount = Object.keys(analysis.sourceAnalysis).length;

    return `AI Engine analyzed ${sourcesCount} external sources and recommends: **${analysis.recommendation}** with ${confidencePercent}% confidence. ${analysis.reasoning}`;
  }
}

export const aiAnalysisService = new AIAnalysisService();