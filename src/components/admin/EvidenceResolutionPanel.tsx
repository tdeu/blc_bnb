import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Brain, Eye, CheckCircle, XCircle, Clock, Gavel, ExternalLink, AlertTriangle, PlayCircle, Settings, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { newsApiService } from '../../services/newsApiService';
import { wikipediaService } from '../../services/wikipediaService';
import { marketClassificationService } from '../../services/marketClassificationService';
import { EvidenceAggregationService, type AggregationResult } from '../../services/evidenceAggregationService';
import { finalConfidenceCalculator, type ConfidenceBreakdown } from '../../services/finalConfidenceCalculator';

// Type definitions for environment variables
declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
    };
  }
}

interface EvidenceResolutionPanelProps {
  userProfile: {
    walletAddress: string;
    displayName?: string;
  };
}

type DataSourceType = 'NEWS' | 'HISTORICAL' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE';

interface MarketWithEvidence {
  id: string;
  claim: string;
  status: 'pending_resolution' | 'disputing' | 'resolved' | 'disputable';
  expiresAt: Date;
  dispute_period_end?: string;
  evidence_count: number;
  evidences: Evidence[];
  yesOdds?: number;
  noOdds?: number;
  ai_resolution?: {
    recommendation: string;
    confidence: number; // AI engine confidence (e.g., 95%)
    finalConfidence?: number; // Adaptive final confidence after combining market odds + evidence + AI (e.g., 78%)
    reasoning: string;
    timestamp: string;
    keyFactors?: string[];
    sourceAnalysis?: Record<string, SourceAnalysis>;
    scrapedContent?: any[];
    processingTimeMs?: number;
    sourceArticles?: any[];
    newsArticles?: any[];
    dataSourceUsed?: DataSourceType;
    sourceType?: string;
    // New entity extraction fields
    extractedEntities?: {
      mainSubject: string;
      secondaryEntities: string[];
      keywords: string[];
      context: string;
      searchQueries?: string[];
    };
    usedHederaAgent?: boolean;
    searchQueries?: string[];
  };
  resolution_data?: any;
  // Hybrid AI fields
  data_source_type: DataSourceType;
  admin_override_classification: boolean;
  auto_detected_type?: DataSourceType;
  classification_confidence?: number;
  keywords_detected?: string[];
  // Timestamps for tracking when analysis was last run
  ai_analysis_timestamp?: string;
  aggregation_timestamp?: string;
  evidence_period_start?: string;
}

interface Evidence {
  id: string;
  user_id: string;
  evidence_text: string;
  evidence_links: string[];
  created_at: string;
  submission_fee: number;
  language: string;
  ai_quality_score?: number;
  admin_reviewed?: boolean;
  // New aggregation fields
  stance?: 'supporting' | 'disputing' | 'neutral';
  source_credibility_score?: number;
  admin_stance_verified?: boolean;
  confidence_impact?: number;
  source_type?: 'academic' | 'government' | 'news' | 'expert_opinion' | 'social_media' | 'blog' | 'anonymous' | 'other';
  quality_score?: number;
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  // New admin validation fields
  admin_validated_legitimate?: boolean;
  admin_validated_against_community?: boolean;
}

interface SourceAnalysis {
  position: 'YES' | 'NO' | 'NEUTRAL';
  summary: string;
}

const EvidenceResolutionPanel: React.FC<EvidenceResolutionPanelProps> = ({ userProfile }) => {
  const [markets, setMarkets] = useState<MarketWithEvidence[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketWithEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [marketTabs, setMarketTabs] = useState<{[marketId: string]: 'odds' | 'evidence' | 'ai' | 'summary'}>({});
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    externalAPIs: ['bbc', 'reuters', 'newsapi'],
    confidenceThreshold: 0.8,
    autoResolve: false
  });
  const [processingAI, setProcessingAI] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [manualResolution, setManualResolution] = useState({
    outcome: '' as 'yes' | 'no' | '',
    reasoning: '',
    overrideAI: false
  });
  const [selectedNewsSources, setSelectedNewsSources] = useState<string[]>([
    'bbc-news', 'reuters', 'associated-press', 'bloomberg', 'the-guardian-uk',
    'the-new-york-times', 'al-jazeera-english', 'financial-times', 'cnn', 'the-washington-post'
  ]); // Default selection - 10 diverse, high-reliability sources
  const [availableNewsSources, setAvailableNewsSources] = useState(newsApiService.getAvailableSources());
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  // Hybrid AI classification state
  const [marketClassification, setMarketClassification] = useState<{[marketId: string]: DataSourceType}>({});
  const [showClassificationOverride, setShowClassificationOverride] = useState<{[marketId: string]: boolean}>({});
  // Evidence stance management state
  const [editingEvidence, setEditingEvidence] = useState<{[evidenceId: string]: boolean}>({});
  const [evidenceUpdates, setEvidenceUpdates] = useState<{[evidenceId: string]: Partial<Evidence>}>({});
  const [expandedEvidence, setExpandedEvidence] = useState<{[marketId: string]: string | null}>({});
  // Aggregation results state
  const [aggregationResults, setAggregationResults] = useState<{[marketId: string]: AggregationResult}>({});
  const [calculatingAggregation, setCalculatingAggregation] = useState<{[marketId: string]: boolean}>({});
  // Confidence breakdown state (adaptive weighting results)
  const [confidenceBreakdowns, setConfidenceBreakdowns] = useState<{[marketId: string]: ConfidenceBreakdown | null}>({});

  useEffect(() => {
    loadMarketsWithEvidence();
  }, [activeTab]);

  // Auto-classify markets when they're loaded
  useEffect(() => {
    if (markets.length > 0) {
      autoClassifyMarkets();
    }
  }, [markets.length]);

  // Calculate confidence breakdowns for markets with AI resolution
  useEffect(() => {
    const calculateBreakdowns = async () => {
      const newBreakdowns: {[marketId: string]: ConfidenceBreakdown | null} = {};

      for (const market of markets) {
        // Only calculate if market has required data
        if (market.ai_resolution && market.yesOdds && market.noOdds) {
          try {
            // Normalize recommendation to ensure consistent format
            const rawRecommendation = String(market.ai_resolution.recommendation).toUpperCase();
            let normalizedRecommendation: 'YES' | 'NO' | 'INCONCLUSIVE';

            if (rawRecommendation === 'YES' || rawRecommendation === 'TRUE') {
              normalizedRecommendation = 'YES';
            } else if (rawRecommendation === 'NO' || rawRecommendation === 'FALSE') {
              normalizedRecommendation = 'NO';
            } else {
              normalizedRecommendation = 'INCONCLUSIVE';
            }

            const breakdown = await finalConfidenceCalculator.calculate({
              yesOdds: market.yesOdds,
              noOdds: market.noOdds,
              evidences: market.evidences || [],
              aiRecommendation: normalizedRecommendation,
              aiConfidence: market.ai_resolution.confidence,
              apiSourceType: market.ai_resolution.sourceType || market.ai_resolution.dataSourceUsed
            });
            newBreakdowns[market.id] = breakdown;

            // Store final confidence in market's ai_resolution if not already set
            if (!market.ai_resolution.finalConfidence || market.ai_resolution.finalConfidence !== breakdown.finalConfidence) {
              setMarkets(prev => prev.map(m =>
                m.id === market.id && m.ai_resolution
                  ? {
                      ...m,
                      ai_resolution: {
                        ...m.ai_resolution,
                        finalConfidence: breakdown.finalConfidence
                      }
                    }
                  : m
              ));
            }
          } catch (error) {
            console.error(`Failed to calculate confidence for market ${market.id}:`, error);
            newBreakdowns[market.id] = null;
          }
        } else {
          newBreakdowns[market.id] = null;
        }
      }

      setConfidenceBreakdowns(newBreakdowns);
    };

    if (markets.length > 0) {
      calculateBreakdowns();
    }
  }, [markets]);

  const autoClassifyMarkets = () => {
    setMarkets(prevMarkets => {
      return prevMarkets.map(market => {
        // Skip if already has auto-detected classification
        if (market.auto_detected_type) {
          return market;
        }

        // Perform auto-classification
        const classification = marketClassificationService.classifyMarket(market.claim);

        // Update local state for new classifications
        setMarketClassification(prev => ({
          ...prev,
          [market.id]: classification.type
        }));

        return {
          ...market,
          auto_detected_type: classification.type,
          classification_confidence: classification.confidence,
          keywords_detected: classification.keywords,
          // Use auto-detected type if no manual classification exists
          data_source_type: market.admin_override_classification ? market.data_source_type : classification.type
        };
      });
    });
  };

  const toggleMarketExpansion = (marketId: string) => {
    if (expandedMarket === marketId) {
      setExpandedMarket(null);
    } else {
      setExpandedMarket(marketId);
      // Set default tab to 'odds' if not already set
      if (!marketTabs[marketId]) {
        setMarketTabs(prev => ({ ...prev, [marketId]: 'odds' }));
      }
    }
  };

  const setMarketTab = (marketId: string, tab: 'odds' | 'evidence' | 'ai' | 'summary') => {
    setMarketTabs(prev => ({ ...prev, [marketId]: tab }));
  };

  const getActiveMarketTab = (marketId: string): 'odds' | 'evidence' | 'ai' | 'summary' => {
    return marketTabs[marketId] || 'odds';
  };

  const loadMarketsWithEvidence = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading real markets with evidence...');
      
      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Step 1: Get markets in resolution phase (including disputable markets)
      const { data: marketsData, error: marketsError } = await supabase
        .from('approved_markets')
        .select('*')
        .in('status', ['pending_resolution', 'disputing', 'resolved', 'disputable'])
        .order('created_at', { ascending: false });

      if (marketsError) {
        throw new Error(`Failed to fetch markets: ${marketsError.message}`);
      }

      console.log('📊 Found markets in resolution phase:', marketsData?.length || 0);

      if (!marketsData || marketsData.length === 0) {
        setMarkets([]);
        return;
      }

      // Step 2: Get evidence for each market
      const marketsWithEvidence: MarketWithEvidence[] = [];
      
      for (const market of marketsData) {
        console.log(`🔍 Loading evidence for market: ${market.id}`);
        
        const { data: evidenceData, error: evidenceError } = await supabase
          .from('evidence_submissions')
          .select('*')
          .eq('market_id', market.id)
          .order('created_at', { ascending: false });

        if (evidenceError) {
          console.warn(`⚠️ Failed to fetch evidence for ${market.id}:`, evidenceError);
        }

        const evidences: Evidence[] = (evidenceData || []).map(evidence => ({
          id: evidence.id,
          user_id: evidence.user_id,
          evidence_text: evidence.evidence_text || '',
          evidence_links: evidence.evidence_links || [],
          created_at: evidence.created_at,
          submission_fee: evidence.submission_fee || 0,
          language: evidence.language || 'en',
          ai_quality_score: evidence.ai_quality_score,
          admin_reviewed: evidence.status === 'reviewed' || evidence.status === 'accepted' || false,
          // New aggregation fields
          stance: evidence.stance || 'neutral',
          source_credibility_score: evidence.source_credibility_score || 1.0,
          admin_stance_verified: evidence.admin_stance_verified || false,
          confidence_impact: evidence.confidence_impact || 0.0,
          source_type: evidence.source_type || 'other',
          quality_score: evidence.quality_score || 1.0,
          status: evidence.status || 'pending'
        }));

        console.log(`✅ Found ${evidences.length} evidence items for ${market.claim}`);

        // Step 3: Get existing AI resolution if any (load from persisted data)
        let aiResolution: any = {
          recommendation: 'PENDING',
          confidence: 0.0,
          reasoning: 'Awaiting admin trigger for AI analysis',
          timestamp: new Date().toISOString()
        };

        if (market.resolution_data) {
          try {
            const resData = typeof market.resolution_data === 'string'
              ? JSON.parse(market.resolution_data)
              : market.resolution_data;

            if (resData.recommendation || resData.outcome) {
              // Load ALL persisted AI resolution fields
              aiResolution = {
                recommendation: resData.recommendation || resData.outcome?.toUpperCase() || 'PENDING',
                confidence: resData.confidence || 0.5,
                reasoning: resData.reasoning || resData.analysis || 'AI analysis completed',
                timestamp: resData.timestamp || market.updated_at || new Date().toISOString(),
                keyFactors: resData.keyFactors || [],
                sourceAnalysis: resData.sourceAnalysis || {},
                scrapedContent: resData.scrapedContent || [],
                processingTimeMs: resData.processingTimeMs,
                sourceArticles: resData.sourceArticles || [],
                dataSourceUsed: resData.dataSourceUsed,
                sourceType: resData.sourceType,
                extractedEntities: resData.extractedEntities,
                usedHederaAgent: resData.usedHederaAgent || false,
                searchQueries: resData.searchQueries || [],
                finalConfidence: resData.finalConfidence
              };
              console.log(`📥 Loaded persisted AI resolution for market ${market.id}`);
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse resolution data:', parseError);
          }
        }

        // Step 4: Load persisted aggregation results if any
        if (market.aggregation_results) {
          try {
            const aggData = typeof market.aggregation_results === 'string'
              ? JSON.parse(market.aggregation_results)
              : market.aggregation_results;

            // Store in aggregation state
            setAggregationResults(prev => ({
              ...prev,
              [market.id]: aggData
            }));
            console.log(`📥 Loaded persisted aggregation results for market ${market.id}`);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse aggregation results:', parseError);
          }
        }

        const marketWithEvidence: MarketWithEvidence = {
          id: market.id,
          claim: market.claim,
          status: market.status as any,
          expiresAt: new Date(market.expires_at),
          dispute_period_end: market.dispute_period_end,
          evidence_count: evidences.length,
          evidences,
          yesOdds: market.yes_odds || 0,
          noOdds: market.no_odds || 0,
          ai_resolution: aiResolution,
          resolution_data: market.resolution_data,
          // Hybrid AI fields with defaults
          data_source_type: market.data_source_type || 'NEWS',
          admin_override_classification: market.admin_override_classification || false,
          auto_detected_type: market.auto_detected_type || undefined,
          classification_confidence: market.classification_confidence || undefined,
          keywords_detected: market.keywords_detected || undefined,
          // Timestamps
          ai_analysis_timestamp: market.ai_analysis_timestamp,
          aggregation_timestamp: market.aggregation_timestamp
        };

        marketsWithEvidence.push(marketWithEvidence);
      }

      // Filter by active tab
      const filteredMarkets = marketsWithEvidence.filter(market =>
        activeTab === 'pending'
          ? market.status === 'pending_resolution' || market.status === 'disputing' || market.status === 'disputable'
          : market.status === 'resolved'
      );

      console.log(`📋 Showing ${filteredMarkets.length} ${activeTab} markets`);
      setMarkets(filteredMarkets);

    } catch (error) {
      console.error('❌ Error loading markets with evidence:', error);
      toast.error(`Failed to load markets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerAIAnalysis = async (marketId: string) => {
    setProcessingAI(true);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting enhanced AI analysis with entity extraction for market:', marketId);

      // Find the market
      const market = markets.find(m => m.id === marketId);
      if (!market) {
        throw new Error('Market not found');
      }

      // Determine data source type (use override if set, otherwise use current classification)
      const dataSourceType = marketClassification[market.id] || market.data_source_type;
      console.log(`📊 Using data source: ${dataSourceType}`);

      // ===== STEP 1: Extract Entities from Market Claim =====
      toast.info('🔍 Extracting key entities and keywords...');
      const { entityExtractionService } = await import('../../services/entityExtractionService');
      const entities = await entityExtractionService.extractEntities(market.claim);

      console.log('✅ Extracted entities:', entities);
      toast.success(`Found key entities: ${entities.mainSubject}, ${entities.secondaryEntities.slice(0, 2).join(', ')}`);

      // ===== STEP 2: Generate Source-Specific Search Queries =====
      const searchQueries = await entityExtractionService.generateSourceSpecificQueries(
        entities,
        dataSourceType
      );
      console.log(`🔎 Generated ${searchQueries.length} search queries:`, searchQueries);

      let sourceArticles: any[] = [];
      let sourceType = '';

      // ===== STEP 3: Fetch Articles Using Entity-Based Queries =====
      if (dataSourceType === 'HISTORICAL') {
        // Use Wikipedia for HISTORICAL data source
        toast.info(`📚 Searching Wikipedia for historical content...`);

        // Search with entity-based queries
        let allArticles: any[] = [];
        for (const query of searchQueries.slice(0, 3)) {
          console.log(`   🔍 Wikipedia search: "${query}"`);
          const articles = await wikipediaService.searchWikipedia(query, 3);
          allArticles = [...allArticles, ...articles];
        }

        // Deduplicate and take top 10
        const uniqueArticles = Array.from(
          new Map(allArticles.map(a => [a.url, a])).values()
        ).slice(0, 10);

        if (uniqueArticles.length === 0) {
          throw new Error(`No relevant Wikipedia articles found for this historical topic`);
        }

        sourceArticles = uniqueArticles;
        sourceType = 'Wikipedia';

      } else if (['NEWS', 'ACADEMIC', 'GENERAL_KNOWLEDGE'].includes(dataSourceType)) {
        // Use Perplexity AI for NEWS, ACADEMIC, and GENERAL_KNOWLEDGE (single-step analysis)
        const sourceLabel = dataSourceType === 'NEWS' ? 'news' :
                           dataSourceType === 'ACADEMIC' ? 'academic research' :
                           'general knowledge';
        toast.info(`🔮 Analyzing with Perplexity AI for ${sourceLabel}...`);

        console.log(`🔮 Using Perplexity AI for ${dataSourceType} (direct analysis)`);

        try {
          // Import Perplexity service
          const { perplexityService } = await import('../../services/perplexityService');

          // Use the new direct analysis method (search + analysis in one step)
          const perplexityAnalysis = await perplexityService.analyzeForResolution(
            market.claim,
            dataSourceType as 'NEWS' | 'ACADEMIC' | 'GENERAL_KNOWLEDGE'
          );

          console.log(`✅ Perplexity analysis complete: ${perplexityAnalysis.recommendation} (${(perplexityAnalysis.confidence * 100).toFixed(0)}% confidence)`);
          console.log(`📚 Sources: ${perplexityAnalysis.sources.length}`);

          // Set the final analysis result directly from Perplexity
          const processingTime = Date.now() - startTime;

          setMarkets(prev => prev.map(marketItem =>
            marketItem.id === marketId
              ? {
                  ...marketItem,
                  ai_resolution: {
                    recommendation: perplexityAnalysis.recommendation,
                    confidence: perplexityAnalysis.confidence,
                    reasoning: perplexityAnalysis.reasoning,
                    sources: perplexityAnalysis.sources,
                    analyzed_at: new Date().toISOString()
                  },
                  last_signal_calculation: new Date().toISOString()
                }
              : marketItem
          ));

          toast.success(`✅ Analysis complete: ${perplexityAnalysis.recommendation} with ${(perplexityAnalysis.confidence * 100).toFixed(0)}% confidence`, {
            duration: 5000
          });

          return; // Exit early - we're done!

        } catch (perplexityError) {
          console.error('❌ Perplexity analysis failed:', perplexityError);
          toast.error(`Analysis failed: ${perplexityError.message}`);
          throw new Error(`Perplexity analysis failed: ${perplexityError.message}`);
        }

      } else {
        // Fallback for unknown data source types
        toast.info(`📚 Searching Wikipedia for ${dataSourceType.toLowerCase()} content...`);

        // Search with entity-based queries
        let allArticles: any[] = [];
        for (const query of searchQueries.slice(0, 3)) {
          console.log(`   🔍 Wikipedia search: "${query}"`);
          const articles = await wikipediaService.searchWikipedia(query, 3);
          allArticles = [...allArticles, ...articles];
        }

        // Deduplicate and take top 10
        const uniqueArticles = Array.from(
          new Map(allArticles.map(a => [a.url, a])).values()
        ).slice(0, 10);

        if (uniqueArticles.length === 0) {
          throw new Error(`No relevant Wikipedia articles found for this ${dataSourceType.toLowerCase()} topic`);
        }

        sourceArticles = uniqueArticles;
        sourceType = 'Wikipedia';
      }

      toast.info(`✅ Found ${sourceArticles.length} relevant ${sourceType} articles. Running AI analysis...`);

      // ===== STEP 4: AI Analysis (Hedera imports removed) =====
      const { aiAnalysisService } = await import('../../services/aiAnalysisService');
      // Hedera AI service removed - using standard AI analysis only

      // Convert articles to the format expected by AI service
      const scrapedContent = sourceArticles.map(article => ({
        id: article.id,
        source: article.source,
        url: article.url,
        title: article.title,
        content: article.content,
        publishedAt: article.publishedAt,
        relevanceScore: article.relevanceScore
      }));

      // AI Analysis (Hedera Agent removed - using standard AI only)
      let analysisResult: any;
      let usedHederaAgent = false;

      try {
        toast.info('🤖 Running AI analysis...');

        // Use standard AI analysis (Hedera Agent removed)
        analysisResult = await aiAnalysisService.analyzeContentWithSourceType(
          market.claim,
          scrapedContent,
          dataSourceType
        );
        usedHederaAgent = false;

      } catch (analysisError) {
        console.error('⚠️ AI analysis failed:', analysisError);
        throw analysisError;
      }

      const processingTime = Date.now() - startTime;

      // ===== STEP 5: Update Market with Results =====
      setMarkets(prev => prev.map(marketItem =>
        marketItem.id === marketId
          ? {
              ...marketItem,
              ai_resolution: {
                recommendation: analysisResult.recommendation,
                confidence: analysisResult.confidence,
                reasoning: analysisResult.reasoning,
                timestamp: new Date().toISOString(),
                keyFactors: analysisResult.keyFactors,
                sourceAnalysis: analysisResult.sourceAnalysis,
                scrapedContent: scrapedContent,
                processingTimeMs: processingTime,
                sourceArticles: sourceArticles,
                dataSourceUsed: dataSourceType,
                sourceType: sourceType,
                // New fields
                extractedEntities: entities,
                usedHederaAgent,
                searchQueries: searchQueries.slice(0, 3)
              }
            }
          : marketItem
      ));

      // ===== STEP 6: Persist AI Resolution to Database =====
      const aiResolutionData = {
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
        timestamp: new Date().toISOString(),
        keyFactors: analysisResult.keyFactors,
        sourceAnalysis: analysisResult.sourceAnalysis,
        scrapedContent: scrapedContent,
        processingTimeMs: processingTime,
        sourceArticles: sourceArticles,
        dataSourceUsed: dataSourceType,
        sourceType: sourceType,
        extractedEntities: entities,
        usedHederaAgent,
        searchQueries: searchQueries.slice(0, 3)
      };
      await saveAIResolutionToDatabase(marketId, aiResolutionData);

      const confidencePercent = (analysisResult.confidence * 100).toFixed(0);
      const agentBadge = usedHederaAgent ? ' 🔷 (Hedera AI)' : '';
      toast.success(`Analysis complete! ${sourceArticles.length} ${sourceType} articles analyzed. ${entities.mainSubject} → ${analysisResult.recommendation} (${confidencePercent}% certainty)${agentBadge}`);

      // Update database with the classification if admin made an override
      if (marketClassification[market.id] && marketClassification[market.id] !== market.data_source_type) {
        await updateMarketClassification(market.id, marketClassification[market.id]);
      }

      // ===== STEP 7: Auto-calculate Final Confidence Breakdown for Summary Tab =====
      // This recalculates the adaptive weighted confidence score that combines:
      // - Market odds (betting signal)
      // - Evidence submissions (user proof)
      // - AI analysis (external verification)
      setTimeout(async () => {
        try {
          const updatedMarket = markets.find(m => m.id === marketId);
          if (updatedMarket && updatedMarket.ai_resolution) {
            // Normalize recommendation to ensure consistent format
            // Hedera AI can return: YES, NO, INVALID, TRUE, FALSE
            // Calculator expects: YES, NO, INCONCLUSIVE
            const rawRecommendation = String(updatedMarket.ai_resolution.recommendation).toUpperCase();
            let normalizedRecommendation: 'YES' | 'NO' | 'INCONCLUSIVE';

            if (rawRecommendation === 'YES' || rawRecommendation === 'TRUE') {
              normalizedRecommendation = 'YES';
            } else if (rawRecommendation === 'NO' || rawRecommendation === 'FALSE') {
              normalizedRecommendation = 'NO';
            } else {
              // INVALID, INCONCLUSIVE, or any other value → INCONCLUSIVE
              normalizedRecommendation = 'INCONCLUSIVE';
            }

            console.log(`🎯 [Auto-calc] Market ${marketId}: Raw recommendation "${rawRecommendation}" → Normalized "${normalizedRecommendation}" with ${updatedMarket.ai_resolution.confidence} confidence`);

            const breakdown = await finalConfidenceCalculator.calculate({
              yesOdds: updatedMarket.yesOdds,
              noOdds: updatedMarket.noOdds,
              evidences: updatedMarket.evidences || [],
              aiRecommendation: normalizedRecommendation,
              aiConfidence: updatedMarket.ai_resolution.confidence
            });

            // Update state with breakdown
            setConfidenceBreakdowns(prev => ({
              ...prev,
              [marketId]: breakdown
            }));

            // Also update market with final confidence
            setMarkets(prev => prev.map(m =>
              m.id === marketId && m.ai_resolution
                ? {
                    ...m,
                    ai_resolution: {
                      ...m.ai_resolution,
                      finalConfidence: breakdown.finalConfidence
                    }
                  }
                : m
            ));

            console.log(`✅ Auto-calculated confidence breakdown for market ${marketId}: ${breakdown.finalConfidence.toFixed(1)}%`);
          }
        } catch (calcError) {
          console.warn('⚠️ Failed to auto-calculate confidence breakdown:', calcError);
        }
      }, 500);

    } catch (error) {
      console.error('❌ Error during AI analysis:', error);
      toast.error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingAI(false);
    }
  };

  // Calculate aggregation for a market
  const calculateAggregation = async (marketId: string) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    setCalculatingAggregation(prev => ({ ...prev, [marketId]: true }));

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Check if AI analysis exists
      if (!market.ai_resolution || market.ai_resolution.recommendation === 'PENDING') {
        toast.warning('Please run AI analysis first before calculating aggregation');
        return;
      }

      // Convert evidence to aggregation service format
      const evidenceItems = market.evidences
        .filter(e => e.admin_stance_verified) // Only use admin-verified evidence
        .map(e => ({
          id: e.id,
          stance: e.stance || 'neutral',
          quality_score: e.quality_score || 1.0,
          source_credibility_score: e.source_credibility_score || 1.0,
          source_type: e.source_type || 'other',
          admin_stance_verified: e.admin_stance_verified || false,
          submission_fee: e.submission_fee,
          evidence_text: e.evidence_text,
        }));

      // Convert AI analysis to aggregation service format
      const aiAnalysis = {
        recommendation: market.ai_resolution.recommendation as 'YES' | 'NO' | 'INCONCLUSIVE',
        confidence: market.ai_resolution.confidence,
        dataSourceUsed: market.ai_resolution.dataSourceUsed || market.data_source_type,
        reasoning: market.ai_resolution.reasoning,
        keyFactors: market.ai_resolution.keyFactors,
        sourceAnalysis: market.ai_resolution.sourceAnalysis,
      };

      // Calculate aggregation
      const result = await EvidenceAggregationService.calculateMarketAggregation(
        marketId,
        aiAnalysis,
        evidenceItems,
        supabase
      );

      // Update local state
      setAggregationResults(prev => ({
        ...prev,
        [marketId]: result
      }));

      // Persist aggregation results to database
      await saveAggregationToDatabase(marketId, result);

      toast.success(`Aggregation calculated: ${result.finalConfidence.toFixed(1)}% confidence`);

    } catch (error) {
      console.error('Error calculating aggregation:', error);
      toast.error('Failed to calculate evidence aggregation');
    } finally {
      setCalculatingAggregation(prev => ({ ...prev, [marketId]: false }));
    }
  };

  // Update evidence stance and related fields
  const updateEvidenceStance = async (evidenceId: string, updates: Partial<Evidence>) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Build update object with only provided fields that exist in DB
      const updateData: any = {};

      if (updates.stance !== undefined) updateData.stance = updates.stance;
      if (updates.source_credibility_score !== undefined) updateData.source_credibility_score = updates.source_credibility_score;
      if (updates.source_type !== undefined) updateData.source_type = updates.source_type;
      if (updates.quality_score !== undefined) updateData.quality_score = updates.quality_score;
      if (updates.status !== undefined) updateData.status = updates.status;
      // Note: admin_stance_verified doesn't exist in DB - removed
      if (updates.admin_validated_legitimate !== undefined) updateData.admin_validated_legitimate = updates.admin_validated_legitimate;
      if (updates.admin_validated_against_community !== undefined) updateData.admin_validated_against_community = updates.admin_validated_against_community;

      console.log('Updating evidence:', evidenceId, 'with data:', updateData);

      const { data, error } = await supabase
        .from('evidence_submissions')
        .update(updateData)
        .eq('id', evidenceId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Update successful, returned data:', data);

      // Update local state
      setMarkets(prev => prev.map(market => ({
        ...market,
        evidences: market.evidences.map(evidence =>
          evidence.id === evidenceId
            ? { ...evidence, ...updates }
            : evidence
        )
      })));

      // Clear editing state
      setEditingEvidence(prev => ({ ...prev, [evidenceId]: false }));
      setEvidenceUpdates(prev => {
        const newState = { ...prev };
        delete newState[evidenceId];
        return newState;
      });

      toast.success('Evidence stance updated successfully');

      // Recalculate aggregation for the market if AI analysis exists
      const evidence = markets.flatMap(m => m.evidences).find(e => e.id === evidenceId);
      const market = markets.find(m => m.evidences.some(e => e.id === evidenceId));
      if (market && market.ai_resolution && market.ai_resolution.recommendation !== 'PENDING') {
        // Automatically recalculate aggregation in the background
        setTimeout(() => calculateAggregation(market.id), 1000);
      }

    } catch (error: any) {
      console.error('Error updating evidence stance:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast.error(`Failed to update evidence stance: ${error?.message || 'Unknown error'}`);
    }
  };

  // Update market classification in database
  const updateMarketClassification = async (marketId: string, newType: DataSourceType) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      await supabase
        .from('approved_markets')
        .update({
          data_source_type: newType,
          admin_override_classification: true
        })
        .eq('id', marketId);

      console.log(`✅ Updated market ${marketId} classification to ${newType}`);
    } catch (error) {
      console.warn('⚠️ Failed to update market classification in database:', error);
    }
  };

  // Save AI resolution results to database for persistence
  const saveAIResolutionToDatabase = async (marketId: string, aiResolution: any) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const resolutionData = {
        recommendation: aiResolution.recommendation,
        confidence: aiResolution.confidence,
        reasoning: aiResolution.reasoning,
        timestamp: aiResolution.timestamp || new Date().toISOString(),
        keyFactors: aiResolution.keyFactors,
        sourceAnalysis: aiResolution.sourceAnalysis,
        scrapedContent: aiResolution.scrapedContent,
        processingTimeMs: aiResolution.processingTimeMs,
        sourceArticles: aiResolution.sourceArticles,
        dataSourceUsed: aiResolution.dataSourceUsed,
        sourceType: aiResolution.sourceType,
        extractedEntities: aiResolution.extractedEntities,
        usedHederaAgent: aiResolution.usedHederaAgent,
        searchQueries: aiResolution.searchQueries,
        finalConfidence: aiResolution.finalConfidence
      };

      const { error } = await supabase
        .from('approved_markets')
        .update({
          resolution_data: resolutionData,
          ai_analysis_timestamp: new Date().toISOString()
        })
        .eq('id', marketId);

      if (error) {
        console.error('❌ Failed to save AI resolution to database:', error);
        throw error;
      }

      console.log(`✅ Saved AI resolution to database for market ${marketId}`);
    } catch (error) {
      console.warn('⚠️ Failed to persist AI resolution to database:', error);
      // Don't throw - we want the UI to still work even if DB save fails
    }
  };

  // Save aggregation results to database for persistence
  const saveAggregationToDatabase = async (marketId: string, aggregationResult: AggregationResult) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { error } = await supabase
        .from('approved_markets')
        .update({
          aggregation_results: aggregationResult,
          aggregation_timestamp: new Date().toISOString()
        })
        .eq('id', marketId);

      if (error) {
        console.error('❌ Failed to save aggregation to database:', error);
        throw error;
      }

      console.log(`✅ Saved aggregation results to database for market ${marketId}`);
    } catch (error) {
      console.warn('⚠️ Failed to persist aggregation to database:', error);
      // Don't throw - we want the UI to still work even if DB save fails
    }
  };

  const executeResolution = async () => {
    if (!selectedMarket) return;

    try {
      // Import resolution service
      const { resolutionService } = await import('../../utils/resolutionService');

      // Determine outcome and confidence
      let outcome: 'yes' | 'no';
      let confidence: number;

      if (manualResolution.overrideAI) {
        // Admin manual override
        if (!manualResolution.outcome || !manualResolution.reasoning) {
          toast.error('Please provide outcome and reasoning for manual override');
          return;
        }
        outcome = manualResolution.outcome;
        confidence = 100; // Manual override gets 100% confidence
      } else {
        // Use AI recommendation
        if (!selectedMarket.ai_resolution) {
          toast.error('No AI resolution found');
          return;
        }

        const recommendation = String(selectedMarket.ai_resolution.recommendation).toUpperCase();
        if (recommendation === 'YES' || recommendation === 'TRUE') {
          outcome = 'yes';
        } else if (recommendation === 'NO' || recommendation === 'FALSE') {
          outcome = 'no';
        } else {
          toast.error('Invalid AI recommendation - cannot resolve');
          return;
        }

        // Use final confidence from breakdown, fallback to AI confidence
        const breakdown = confidenceBreakdowns[selectedMarket.id];
        confidence = Math.round(
          breakdown?.finalConfidence ||
          selectedMarket.ai_resolution.finalConfidence ||
          (selectedMarket.ai_resolution.confidence * 100)
        );
      }

      // Show loading toast
      const loadingToast = toast.loading(`Executing final resolution on-chain...`);

      // Call smart contract
      console.log(`🔐 Executing finalResolveMarket(${selectedMarket.id}, ${outcome}, ${confidence})`);
      const result = await resolutionService.finalResolveMarket(selectedMarket.id, outcome, confidence);

      toast.dismiss(loadingToast);
      toast.success(`✅ Resolution executed! TX: ${result.transactionId?.slice(0, 12)}...`);

      // Update market status
      setMarkets(prev => prev.map(market =>
        market.id === selectedMarket.id
          ? { ...market, status: 'resolved' as const }
          : market
      ));

      setShowResolveDialog(false);
      setSelectedMarket(null);
      loadMarketsWithEvidence();

    } catch (error) {
      console.error('❌ Error executing resolution:', error);
      toast.error(`Failed to execute resolution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_resolution':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Pending</Badge>;
      case 'disputing':
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-700 border-orange-500/30">Disputing</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">High ({(confidence * 100).toFixed(0)}%)</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Medium ({(confidence * 100).toFixed(0)}%)</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Low ({(confidence * 100).toFixed(0)}%)</Badge>;
    }
  };

  // Check if market is within 24 hours of dispute period ending (6 days out of 7)
  const isDisputePeriodEndingSoon = (market: MarketWithEvidence): boolean => {
    if (!market.dispute_period_end || market.status !== 'disputing') return false;

    const disputeEnd = new Date(market.dispute_period_end);
    const now = new Date();
    const hoursRemaining = (disputeEnd.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Warning if less than 24 hours remaining (day 6 out of 7)
    return hoursRemaining > 0 && hoursRemaining <= 24;
  };

  const getDisputeTimeWarning = (market: MarketWithEvidence) => {
    if (!market.dispute_period_end || market.status !== 'disputing') return null;

    const disputeEnd = new Date(market.dispute_period_end);
    const now = new Date();
    const hoursRemaining = Math.max(0, (disputeEnd.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursRemaining <= 24 && hoursRemaining > 0) {
      return (
        <Badge className="bg-red-600 text-white animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1 inline" />
          {Math.floor(hoursRemaining)}h left - Generate Final Resolution!
        </Badge>
      );
    }
    return null;
  };

  const getEvidencePeriodInfo = (market: MarketWithEvidence): string | null => {
    const MAX_EVIDENCE_DAYS = 30;

    // Calculate evidence start date
    const evidenceStartDate = market.evidence_period_start
      ? new Date(market.evidence_period_start)
      : market.expiresAt
        ? new Date(market.expiresAt)
        : null;

    if (!evidenceStartDate) return null;

    const now = new Date();
    const daysSinceExpiry = Math.floor((now.getTime() - evidenceStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = MAX_EVIDENCE_DAYS - daysSinceExpiry;

    // Only show for markets in pending_resolution or disputing status
    if (market.status !== 'pending_resolution' && market.status !== 'disputing') return null;

    // Don't show negative days
    if (daysSinceExpiry < 0) return null;

    if (daysRemaining > 0) {
      return `Day ${daysSinceExpiry} of evidence period. ${daysRemaining} days remaining.`;
    } else {
      return `Day ${daysSinceExpiry} of evidence period. Period expired.`;
    }
  };

  // Check if market is ready for final resolution (RED ALERT)
  const getReadyForPayoutAlert = (market: MarketWithEvidence) => {
    const MIN_EVIDENCE_DAYS = 7;
    const CONFIDENCE_THRESHOLD = 80;

    // Calculate evidence start date
    const evidenceStartDate = market.evidence_period_start
      ? new Date(market.evidence_period_start)
      : market.expiresAt
        ? new Date(market.expiresAt)
        : null;

    if (!evidenceStartDate) return null;
    if (market.status !== 'pending_resolution' && market.status !== 'disputable') return null;

    const now = new Date();
    const daysSinceExpiry = Math.floor((now.getTime() - evidenceStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get confidence from breakdown or AI resolution
    const breakdown = confidenceBreakdowns[market.id];
    const confidence = breakdown?.finalConfidence ||
      (market.ai_resolution?.finalConfidence) ||
      (market.ai_resolution?.confidence ? market.ai_resolution.confidence * 100 : 0);

    // RED ALERT: 7+ days AND confidence >= 80%
    if (daysSinceExpiry >= MIN_EVIDENCE_DAYS && confidence >= CONFIDENCE_THRESHOLD) {
      return (
        <Badge className="bg-red-600 text-white animate-pulse shadow-lg">
          <AlertTriangle className="h-3 w-3 mr-1 inline" />
          SEND FOR PAYOUT - {confidence.toFixed(0)}% CONFIDENCE
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evidence & Resolution Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review evidence, supervise AI analysis, and manage market resolutions
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowAIDialog(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          AI Config
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('pending')}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Pending Resolution ({markets.filter(m => m.status !== 'resolved').length})
        </Button>
        <Button
          variant={activeTab === 'resolved' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('resolved')}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Resolved ({markets.filter(m => m.status === 'resolved').length})
        </Button>
      </div>

      {/* Markets List - New Compact Layout */}
      {loading ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-gray-400 animate-pulse mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading markets with evidence...</p>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No {activeTab === 'pending' ? 'pending' : 'resolved'} markets found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {markets.map((market) => (
            <div key={market.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Compact Market Header */}
              <div 
                className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleMarketExpansion(market.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {market.claim}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(market.status)}
                        <Badge variant="outline" className="text-xs">
                          {market.evidence_count} Evidence
                        </Badge>
                        {market.ai_resolution && getConfidenceBadge(
                          market.ai_resolution.finalConfidence !== undefined
                            ? market.ai_resolution.finalConfidence / 100  // Final confidence is 0-100, convert to 0-1
                            : market.ai_resolution.confidence  // Fallback to AI confidence
                        )}
                        {getDisputeTimeWarning(market)}
                        {getReadyForPayoutAlert(market)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                      <div>ID: {market.id.slice(-8)}</div>
                      <div>Expires: {market.expiresAt.toLocaleDateString()}</div>
                      {getEvidencePeriodInfo(market) && (
                        <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                          {getEvidencePeriodInfo(market)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center gap-2">
                    {expandedMarket === market.id ? (
                      <Badge variant="outline" className="text-xs">Expanded</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Click to expand</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Market Content */}
              {expandedMarket === market.id && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {/* Horizontal Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        getActiveMarketTab(market.id) === 'odds'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setMarketTab(market.id, 'odds')}
                    >
                      📊 Prediction Odds
                    </button>
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        getActiveMarketTab(market.id) === 'evidence'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setMarketTab(market.id, 'evidence')}
                    >
                      📝 Evidence ({market.evidence_count})
                    </button>
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        getActiveMarketTab(market.id) === 'ai'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setMarketTab(market.id, 'ai')}
                    >
                      🤖 AI Engine
                    </button>
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        getActiveMarketTab(market.id) === 'summary'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setMarketTab(market.id, 'summary')}
                    >
                      📋 Summary
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {/* Prediction Odds Tab */}
                    {getActiveMarketTab(market.id) === 'odds' && (
                      <div>
                        <h4 className="font-medium mb-4">Final Prediction Odds (Market Closed)</h4>
                        <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium">
                            These are the final odds when the market closed for betting
                          </div>
                          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                            <div className="text-center p-6 rounded-lg border-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 dark:border-green-700 shadow-sm">
                              <div className="text-sm mb-2 text-green-700 dark:text-green-300 font-semibold uppercase tracking-wide">Yes Odds</div>
                              <div className="text-5xl font-bold text-green-900 dark:text-green-100">{market.yesOdds?.toFixed(2) || '0.00'}x</div>
                            </div>
                            <div className="text-center p-6 rounded-lg border-2 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border-red-400 dark:border-red-700 shadow-sm">
                              <div className="text-sm mb-2 text-red-700 dark:text-red-300 font-semibold uppercase tracking-wide">No Odds</div>
                              <div className="text-5xl font-bold text-red-900 dark:text-red-100">{market.noOdds?.toFixed(2) || '0.00'}x</div>
                            </div>
                          </div>
                          <div className="mt-6 text-xs text-center text-gray-600 dark:text-gray-400 font-medium">
                            Market closed on {market.expiresAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Evidence Tab */}
                    {getActiveMarketTab(market.id) === 'evidence' && (
                      <div>
                        <div className="mb-4">
                          <h4 className="font-medium text-lg mb-1">User Evidence Submissions</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Review and validate evidence submitted by users for this market
                          </p>
                        </div>

                        {market.evidence_count === 0 ? (
                          <div className="text-center py-6 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            No evidence submitted yet
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {market.evidences.map((evidence, index) => {
                              const isExpanded = expandedEvidence[market.id] === evidence.id;

                              return (
                              <div key={evidence.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Evidence Header - Always Visible & Clickable */}
                                <div
                                  className="bg-gray-50 dark:bg-gray-800 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                  onClick={() => {
                                    setExpandedEvidence(prev => ({
                                      ...prev,
                                      [market.id]: isExpanded ? null : evidence.id
                                    }));
                                  }}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-sm font-semibold">#{index + 1}</Badge>
                                        <Badge variant="outline" className="text-sm">{evidence.submission_fee} HBAR</Badge>
                                        <Badge
                                          variant={evidence.stance === 'supporting' ? 'default' : evidence.stance === 'disputing' ? 'destructive' : 'secondary'}
                                          className="text-sm"
                                        >
                                          {evidence.stance === 'supporting' ? '✅ Supports YES' :
                                           evidence.stance === 'disputing' ? '❌ Supports NO' : '⚪ Neutral'}
                                        </Badge>
                                        {evidence.admin_stance_verified && (
                                          <Badge variant="outline" className="text-sm bg-green-50 text-green-700 dark:bg-green-900/30">
                                            ✓ Admin Verified
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                        Submitted by: {evidence.user_id.slice(0, 20)}...{evidence.user_id.slice(-8)}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={
                                        evidence.status === 'accepted' ? 'default' :
                                        evidence.status === 'rejected' ? 'destructive' :
                                        evidence.status === 'reviewed' ? 'secondary' : 'outline'
                                      }
                                      className="text-sm font-semibold px-3 py-1"
                                    >
                                      {evidence.status === 'accepted' ? '✅ ACCEPTED' :
                                       evidence.status === 'rejected' ? '❌ REJECTED' :
                                       evidence.status === 'reviewed' ? '👀 REVIEWED' : '⏳ PENDING'}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-3">
                                      <span>📅 {new Date(evidence.created_at).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>📄 {evidence.source_type || 'other'} source</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span>Quality: {evidence.quality_score?.toFixed(1) || '1.0'}/5.0</span>
                                      <span>•</span>
                                      <span>Credibility: {(evidence.source_credibility_score || 1.0).toFixed(1)}</span>
                                      <ChevronDown className={`h-5 w-5 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>

                                  {/* Evidence Preview Text - Always visible */}
                                  <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                      {evidence.evidence_text}
                                    </p>
                                  </div>
                                </div>

                                {/* Evidence Content - Expandable Section */}
                                {isExpanded && (
                                <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                  <div className="mb-4">
                                    <h6 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Full Evidence Text</h6>
                                    <p className="text-base leading-relaxed text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                      {evidence.evidence_text}
                                    </p>
                                  </div>

                                  {evidence.evidence_links && evidence.evidence_links.length > 0 && (
                                    <div className="mb-4">
                                      <h6 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Source Links</h6>
                                      <div className="flex flex-wrap gap-2">
                                        {evidence.evidence_links.map((link, linkIdx) => (
                                          <a
                                            key={linkIdx}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800"
                                          >
                                            🔗 Source Link {linkIdx + 1}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* STEP 1: Stance Selection - What does this evidence support? */}
                                  <div className="mb-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                                    <h6 className="text-base font-bold text-blue-900 dark:text-blue-100 mb-2">🎯 Step 1: What does this evidence support?</h6>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                                      Select which outcome this evidence supports
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                      {/* YES Card */}
                                      <div
                                        onClick={() => {
                                          const hasLegitimate = evidence.admin_validated_legitimate === true;
                                          const hasAgainstCommunity = evidence.admin_validated_against_community === true;

                                          // Auto-accept if selecting stance AND both checkboxes are already checked
                                          const newStatus = (hasLegitimate && hasAgainstCommunity) ? 'accepted' : 'rejected';

                                          updateEvidenceStance(evidence.id, {
                                            stance: 'supporting_yes',
                                            status: newStatus
                                          });
                                        }}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                          evidence.stance === 'supporting_yes' || evidence.stance === 'supporting'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg'
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-green-300 hover:shadow-md'
                                        }`}
                                      >
                                        <div className="text-center">
                                          <div className="text-4xl mb-2">✅</div>
                                          <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                            Supports YES
                                          </div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Evidence suggests claim is TRUE
                                          </div>
                                          {(evidence.stance === 'supporting_yes' || evidence.stance === 'supporting') && (
                                            <div className="mt-2 flex items-center justify-center gap-1 text-green-600 dark:text-green-400 font-semibold text-sm">
                                              <CheckCircle className="h-4 w-4" />
                                              Selected
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* NO Card */}
                                      <div
                                        onClick={() => {
                                          const hasLegitimate = evidence.admin_validated_legitimate === true;
                                          const hasAgainstCommunity = evidence.admin_validated_against_community === true;

                                          // Auto-accept if selecting stance AND both checkboxes are already checked
                                          const newStatus = (hasLegitimate && hasAgainstCommunity) ? 'accepted' : 'rejected';

                                          updateEvidenceStance(evidence.id, {
                                            stance: 'supporting_no',
                                            status: newStatus
                                          });
                                        }}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                          evidence.stance === 'supporting_no' || evidence.stance === 'disputing'
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg'
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-red-300 hover:shadow-md'
                                        }`}
                                      >
                                        <div className="text-center">
                                          <div className="text-4xl mb-2">❌</div>
                                          <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                            Supports NO
                                          </div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Evidence suggests claim is FALSE
                                          </div>
                                          {(evidence.stance === 'supporting_no' || evidence.stance === 'disputing') && (
                                            <div className="mt-2 flex items-center justify-center gap-1 text-red-600 dark:text-red-400 font-semibold text-sm">
                                              <CheckCircle className="h-4 w-4" />
                                              Selected
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* STEP 2: Validation Checkboxes - DRIVES Accept/Reject Decision */}
                                  <div className="mb-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                                    <h6 className="text-base font-bold text-amber-900 dark:text-amber-100 mb-2">📋 Step 2: Evidence Validation (Required)</h6>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                                      To ACCEPT evidence: Stance must be selected (Step 1) AND both checkboxes below must be ✅
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                        <input
                                          type="checkbox"
                                          id={`legitimate-${evidence.id}`}
                                          checked={evidence.admin_validated_legitimate === true}
                                          onChange={(e) => {
                                            const newLegitimate = e.target.checked;
                                            const currentAgainstCommunity = evidence.admin_validated_against_community === true;
                                            const hasStance = evidence.stance === 'supporting_yes' || evidence.stance === 'supporting_no' ||
                                                            evidence.stance === 'supporting' || evidence.stance === 'disputing';

                                            // Auto-accept if ALL THREE are true: stance + both checkboxes
                                            const newStatus = (hasStance && newLegitimate && currentAgainstCommunity) ? 'accepted' : 'rejected';

                                            updateEvidenceStance(evidence.id, {
                                              admin_validated_legitimate: newLegitimate,
                                              status: newStatus
                                            });
                                          }}
                                          className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                          <label htmlFor={`legitimate-${evidence.id}`} className="text-base font-semibold text-gray-900 dark:text-white cursor-pointer">
                                            ✅ Evidence is Legitimate
                                          </label>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                            Is this from a credible, verifiable source?
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                        <input
                                          type="checkbox"
                                          id={`against-community-${evidence.id}`}
                                          checked={evidence.admin_validated_against_community === true}
                                          onChange={(e) => {
                                            const newAgainstCommunity = e.target.checked;
                                            const currentLegitimate = evidence.admin_validated_legitimate === true;
                                            const hasStance = evidence.stance === 'supporting_yes' || evidence.stance === 'supporting_no' ||
                                                            evidence.stance === 'supporting' || evidence.stance === 'disputing';

                                            // Auto-accept if ALL THREE are true: stance + both checkboxes
                                            const newStatus = (hasStance && currentLegitimate && newAgainstCommunity) ? 'accepted' : 'rejected';

                                            updateEvidenceStance(evidence.id, {
                                              admin_validated_against_community: newAgainstCommunity,
                                              status: newStatus
                                            });
                                          }}
                                          className="mt-1 h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="flex-1">
                                          <label htmlFor={`against-community-${evidence.id}`} className="text-base font-semibold text-gray-900 dark:text-white cursor-pointer">
                                            ⚠️ Challenges Market Consensus
                                          </label>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                            Does this contradict current market odds? (Gets 3x weight)
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Indicator */}
                                    {(() => {
                                      const hasStance = evidence.stance === 'supporting_yes' || evidence.stance === 'supporting_no' ||
                                                       evidence.stance === 'supporting' || evidence.stance === 'disputing';
                                      const hasLegitimate = evidence.admin_validated_legitimate === true;
                                      const hasAgainstCommunity = evidence.admin_validated_against_community === true;
                                      const isFullyAccepted = hasStance && hasLegitimate && hasAgainstCommunity;

                                      return (
                                        <div className={`mt-4 p-4 rounded-lg border-2 ${
                                          isFullyAccepted
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                            : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                        }`}>
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              {isFullyAccepted ? (
                                                <>
                                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                  <span className="font-bold text-green-900 dark:text-green-100">ACCEPTED - Gets 3x weight in resolution</span>
                                                </>
                                              ) : (
                                                <>
                                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                  <span className="font-bold text-red-900 dark:text-red-100">REJECTED - Will not contribute to resolution</span>
                                                </>
                                              )}
                                            </div>

                                            {/* Checklist of requirements */}
                                            {!isFullyAccepted && (
                                              <div className="ml-7 space-y-1 text-sm">
                                                <div className={hasStance ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                                  {hasStance ? '✅' : '❌'} Stance selected (Step 1)
                                                </div>
                                                <div className={hasLegitimate ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                                  {hasLegitimate ? '✅' : '❌'} Evidence is legitimate
                                                </div>
                                                <div className={hasAgainstCommunity ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                                  {hasAgainstCommunity ? '✅' : '❌'} Challenges market consensus
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Advanced Settings Toggle */}
                                  <div className="flex items-center justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingEvidence(prev => ({
                                        ...prev,
                                        [evidence.id]: !prev[evidence.id]
                                      }))}
                                      className="gap-1"
                                    >
                                      <Settings className="h-4 w-4" />
                                      {editingEvidence[evidence.id] ? 'Close' : 'Advanced Settings'}
                                    </Button>
                                  </div>
                                </div>
                                )}

                                {/* Stance Assignment Interface */}
                                {editingEvidence[evidence.id] && (
                                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/20">
                                    <h6 className="font-medium mb-3 text-blue-900 dark:text-blue-100">Admin Review & Stance Assignment</h6>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Stance Assignment */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Evidence Stance</Label>
                                        <Select
                                          value={evidenceUpdates[evidence.id]?.stance || evidence.stance || 'neutral'}
                                          onValueChange={(value: 'supporting' | 'disputing' | 'neutral') =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], stance: value }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="supporting">✅ Supporting - Evidence supports the claim</SelectItem>
                                            <SelectItem value="disputing">❌ Disputing - Evidence disputes the claim</SelectItem>
                                            <SelectItem value="neutral">⚪ Neutral - Evidence is factual but neutral</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Source Type */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Source Type</Label>
                                        <Select
                                          value={evidenceUpdates[evidence.id]?.source_type || evidence.source_type || 'other'}
                                          onValueChange={(value: 'academic' | 'government' | 'news' | 'expert_opinion' | 'social_media' | 'blog' | 'anonymous' | 'other') =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], source_type: value }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="academic">🎓 Academic/Research</SelectItem>
                                            <SelectItem value="government">🏛️ Government/Official</SelectItem>
                                            <SelectItem value="news">📰 News/Journalism</SelectItem>
                                            <SelectItem value="expert_opinion">👨‍⚕️ Expert Opinion</SelectItem>
                                            <SelectItem value="social_media">📱 Social Media</SelectItem>
                                            <SelectItem value="blog">📝 Blog/Personal</SelectItem>
                                            <SelectItem value="anonymous">❓ Anonymous</SelectItem>
                                            <SelectItem value="other">📄 Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Quality Score */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Quality Score (0-5.0)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="5"
                                          step="0.1"
                                          value={evidenceUpdates[evidence.id]?.quality_score || evidence.quality_score || 1.0}
                                          onChange={(e) =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], quality_score: parseFloat(e.target.value) || 1.0 }
                                            }))
                                          }
                                        />
                                      </div>

                                      {/* Source Credibility */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Source Credibility (0-1.0)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="1"
                                          step="0.1"
                                          value={evidenceUpdates[evidence.id]?.source_credibility_score || evidence.source_credibility_score || 1.0}
                                          onChange={(e) =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], source_credibility_score: parseFloat(e.target.value) || 1.0 }
                                            }))
                                          }
                                        />
                                      </div>

                                      {/* Evidence Legitimate Toggle */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Evidence Legitimate?</Label>
                                        <Select
                                          value={evidenceUpdates[evidence.id]?.admin_validated_legitimate !== undefined ?
                                            String(evidenceUpdates[evidence.id]?.admin_validated_legitimate) :
                                            String(evidence.admin_validated_legitimate || false)}
                                          onValueChange={(value: string) =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], admin_validated_legitimate: value === 'true' }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="true">✅ Yes - Evidence is credible and valid</SelectItem>
                                            <SelectItem value="false">❌ No - Evidence is not credible</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500 mt-1">Is this evidence from a credible source and factually accurate?</p>
                                      </div>

                                      {/* Against Community Toggle */}
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Against Community Consensus?</Label>
                                        <Select
                                          value={evidenceUpdates[evidence.id]?.admin_validated_against_community !== undefined ?
                                            String(evidenceUpdates[evidence.id]?.admin_validated_against_community) :
                                            String(evidence.admin_validated_against_community || false)}
                                          onValueChange={(value: string) =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], admin_validated_against_community: value === 'true' }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="true">✅ Yes - Challenges market consensus</SelectItem>
                                            <SelectItem value="false">❌ No - Aligns with market</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500 mt-1">Does this evidence go against what the prediction market suggests?</p>
                                      </div>

                                      {/* Status */}
                                      <div className="md:col-span-2">
                                        <Label className="text-sm font-medium mb-2 block">Review Status</Label>
                                        <Select
                                          value={evidenceUpdates[evidence.id]?.status || evidence.status || 'pending'}
                                          onValueChange={(value: 'pending' | 'reviewed' | 'accepted' | 'rejected') =>
                                            setEvidenceUpdates(prev => ({
                                              ...prev,
                                              [evidence.id]: { ...prev[evidence.id], status: value }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="pending">⏳ Pending Review</SelectItem>
                                            <SelectItem value="reviewed">👀 Reviewed</SelectItem>
                                            <SelectItem value="accepted">✅ Accepted</SelectItem>
                                            <SelectItem value="rejected">❌ Rejected</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 mt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingEvidence(prev => ({ ...prev, [evidence.id]: false }))}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => updateEvidenceStance(evidence.id, evidenceUpdates[evidence.id] || {})}
                                        className="gap-2"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        Update Evidence
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {getActiveMarketTab(market.id) === 'ai' && (
                      <div>
                        <h4 className="font-medium mb-3">AI Engine & Data Sources</h4>
                        <div className="space-y-4">

                          {/* Market Classification Section */}
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-lg border-2 border-amber-200 dark:border-amber-800">
                            <div className="mb-4">
                              <h5 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">📊 Select Data Source Type</h5>
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                Choose the most appropriate analysis type for this market. Recommended options are highlighted.
                              </p>
                            </div>

                            {/* Classification Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {/* NEWS Card */}
                              {(() => {
                                const isSelected = (marketClassification[market.id] || market.data_source_type) === 'NEWS';
                                const claim = market.claim.toLowerCase();
                                const isRecommended = claim.includes('2024') || claim.includes('2025') ||
                                  claim.includes('will') || claim.includes('announce') || claim.includes('report') ||
                                  claim.includes('election') || claim.includes('government') || claim.includes('policy');

                                return (
                                  <div
                                    onClick={() => setMarketClassification(prev => ({ ...prev, [market.id]: 'NEWS' }))}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 hover:shadow-md'
                                    }`}
                                  >
                                    {isRecommended && (
                                      <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-green-600 text-white shadow-md">✨ Recommended</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="text-3xl">📰</div>
                                      <div>
                                        <h6 className="font-bold text-base">NEWS</h6>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Recent events & current affairs</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">📡 Data Sources:</div>
                                        <div className="text-gray-600 dark:text-gray-400">Perplexity AI (real-time web search with citations)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">AI Analysis: Anthropic Claude (reasoning & verification)</div>
                                      </div>

                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">✅ Best for:</div>
                                        <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                          <li>• Events happening in 2024-2025</li>
                                          <li>• Breaking news & announcements</li>
                                          <li>• Political & economic developments</li>
                                        </ul>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                                        <CheckCircle className="h-4 w-4" />
                                        Selected
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* HISTORICAL Card */}
                              {(() => {
                                const isSelected = (marketClassification[market.id] || market.data_source_type) === 'HISTORICAL';
                                const claim = market.claim.toLowerCase();
                                const isRecommended = /\b(19|20)\d{2}\b/.test(claim) && !claim.includes('2024') && !claim.includes('2025') ||
                                  claim.includes('historical') || claim.includes('past') || claim.includes('before') ||
                                  claim.includes('ancient') || claim.includes('century');

                                return (
                                  <div
                                    onClick={() => setMarketClassification(prev => ({ ...prev, [market.id]: 'HISTORICAL' }))}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-300 hover:shadow-md'
                                    }`}
                                  >
                                    {isRecommended && (
                                      <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-green-600 text-white shadow-md">✨ Recommended</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="text-3xl">🏛️</div>
                                      <div>
                                        <h6 className="font-bold text-base">HISTORICAL</h6>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Past events & historical facts</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">📡 Data Sources:</div>
                                        <div className="text-gray-600 dark:text-gray-400">Wikipedia (historical articles & archives)</div>
                                      </div>

                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">✅ Best for:</div>
                                        <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                          <li>• Events before 2024</li>
                                          <li>• Historical facts & records</li>
                                          <li>• Verified past outcomes</li>
                                        </ul>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                                        <CheckCircle className="h-4 w-4" />
                                        Selected
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* ACADEMIC Card */}
                              {(() => {
                                const isSelected = (marketClassification[market.id] || market.data_source_type) === 'ACADEMIC';
                                const claim = market.claim.toLowerCase();
                                const isRecommended = claim.includes('study') || claim.includes('research') ||
                                  claim.includes('scientific') || claim.includes('scientists') || claim.includes('evidence') ||
                                  claim.includes('climate') || claim.includes('medical') || claim.includes('vaccine');

                                return (
                                  <div
                                    onClick={() => setMarketClassification(prev => ({ ...prev, [market.id]: 'ACADEMIC' }))}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300 hover:shadow-md'
                                    }`}
                                  >
                                    {isRecommended && (
                                      <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-green-600 text-white shadow-md">✨ Recommended</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="text-3xl">🎓</div>
                                      <div>
                                        <h6 className="font-bold text-base">ACADEMIC</h6>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Scientific & research-based</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">📡 Data Sources:</div>
                                        <div className="text-gray-600 dark:text-gray-400">Perplexity AI (academic search with citations)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Optimized for peer-reviewed research</div>
                                      </div>

                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">✅ Best for:</div>
                                        <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                          <li>• Scientific claims & studies</li>
                                          <li>• Research-backed facts</li>
                                          <li>• Medical & health topics</li>
                                        </ul>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                        <CheckCircle className="h-4 w-4" />
                                        Selected
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* GENERAL KNOWLEDGE Card */}
                              {(() => {
                                const isSelected = (marketClassification[market.id] || market.data_source_type) === 'GENERAL_KNOWLEDGE';
                                const claim = market.claim.toLowerCase();
                                const isRecommended = claim.includes('definition') || claim.includes('what is') ||
                                  claim.includes('how many') || claim.includes('capital') || claim.includes('located') ||
                                  claim.includes('population') || claim.includes('country');

                                return (
                                  <div
                                    onClick={() => setMarketClassification(prev => ({ ...prev, [market.id]: 'GENERAL_KNOWLEDGE' }))}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-lg'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-teal-300 hover:shadow-md'
                                    }`}
                                  >
                                    {isRecommended && (
                                      <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-green-600 text-white shadow-md">✨ Recommended</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="text-3xl">🌐</div>
                                      <div>
                                        <h6 className="font-bold text-base">GENERAL KNOWLEDGE</h6>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Encyclopedia & common facts</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">📡 Data Sources:</div>
                                        <div className="text-gray-600 dark:text-gray-400">Perplexity AI (general web search with citations)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Broad coverage of factual information</div>
                                      </div>

                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">✅ Best for:</div>
                                        <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                          <li>• Factual questions</li>
                                          <li>• Definitions & explanations</li>
                                          <li>• Geographic & demographic data</li>
                                        </ul>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
                                        <CheckCircle className="h-4 w-4" />
                                        Selected
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Current Selection Summary */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selected:</span>
                                <Badge
                                  variant={
                                    (marketClassification[market.id] || market.data_source_type) === 'NEWS' ? 'default' :
                                    (marketClassification[market.id] || market.data_source_type) === 'HISTORICAL' ? 'secondary' :
                                    (marketClassification[market.id] || market.data_source_type) === 'ACADEMIC' ? 'outline' : 'destructive'
                                  }
                                  className="font-bold"
                                >
                                  {(marketClassification[market.id] || market.data_source_type) === 'NEWS' && '📰 NEWS'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'HISTORICAL' && '🏛️ HISTORICAL'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'ACADEMIC' && '🎓 ACADEMIC'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'GENERAL_KNOWLEDGE' && '🌐 GENERAL KNOWLEDGE'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* News Source Selection - Only show for NEWS type */}
                          {(marketClassification[market.id] || market.data_source_type) === 'NEWS' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-blue-900 dark:text-blue-100">News Source Selection</h5>
                                <Badge variant="outline" className="text-xs">
                                  {selectedNewsSources.length}/10 sources
                                </Badge>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                                Select up to 10 news sources for AI analysis.
                              </p>

                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {selectedNewsSources.map((sourceId) => {
                                    const source = availableNewsSources.find(s => s.id === sourceId);
                                    return source ? (
                                      <Badge key={sourceId} variant="secondary" className="text-xs">
                                        {source.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI Analysis Button - Large and Prominent */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg border-2 border-green-300 dark:border-green-700">
                            <div className="mb-3">
                              <h5 className="text-base font-bold text-green-900 dark:text-green-100 mb-1">🤖 Ready to Analyze</h5>
                              <p className="text-sm text-green-800 dark:text-green-200">
                                Click below to run AI analysis using the selected data source type.
                              </p>
                            </div>

                            <Button
                              onClick={() => triggerAIAnalysis(market.id)}
                              disabled={processingAI}
                              className="gap-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingAI ? (
                                <>
                                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                  Processing AI Analysis...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-6 w-6" />
                                  {(marketClassification[market.id] || market.data_source_type) === 'NEWS' && '📰 Run NEWS Analysis'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'HISTORICAL' && '🏛️ Run HISTORICAL Analysis'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'ACADEMIC' && '🎓 Run ACADEMIC Analysis'}
                                  {(marketClassification[market.id] || market.data_source_type) === 'GENERAL_KNOWLEDGE' && '🌐 Run GENERAL KNOWLEDGE Analysis'}
                                </>
                              )}
                            </Button>

                            {processingAI && (
                              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full" />
                                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    AI Analysis in Progress...
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-200">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <span>🔍 Extracting key entities and keywords from market claim...</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <span>📰 Fetching articles from {
                                      (marketClassification[market.id] || market.data_source_type) === 'HISTORICAL'
                                        ? 'Wikipedia'
                                        : 'Perplexity AI'
                                    } using entity-based queries...</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <span>🔷 Running Hedera AI Agent analysis...</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <span>🧠 Analyzing sources with Claude AI...</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <span>📊 Generating final recommendation...</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                            
                          {market.ai_resolution && market.ai_resolution.recommendation !== 'PENDING' && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md">
                              {/* Header with Hedera Badge */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Brain className="h-6 w-6 text-green-600 dark:text-green-400" />
                                  <span className="font-bold text-lg text-gray-900 dark:text-white">AI Analysis Complete</span>
                                  {(market.ai_resolution as any).usedHederaAgent && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                      🔷 Hedera AI Agent
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-sm font-bold">
                                  {(market.ai_resolution.confidence * 100).toFixed(0)}% Certainty
                                </Badge>
                              </div>

                              {/* Extracted Entities Section */}
                              {(market.ai_resolution as any).extractedEntities && (
                                <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <h6 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>🎯</span> Extracted Entities & Keywords
                                  </h6>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-2">
                                      <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">Main Subject:</span>
                                      <Badge variant="default" className="text-sm">{(market.ai_resolution as any).extractedEntities.mainSubject}</Badge>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">Related Entities:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {(market.ai_resolution as any).extractedEntities.secondaryEntities.map((entity: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs">{entity}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">Search Keywords:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {(market.ai_resolution as any).extractedEntities.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">{keyword}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Main Conclusion */}
                              <div className="mb-4">
                                <h6 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">📊 AI Verdict:</h6>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="font-bold text-2xl">
                                      {market.ai_resolution.recommendation === 'YES' ? '✅' :
                                       market.ai_resolution.recommendation === 'NO' ? '❌' : '❓'}
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        Based on my analysis, {(market.ai_resolution as any).extractedEntities?.mainSubject || 'this claim'} is{' '}
                                        <span className={market.ai_resolution.recommendation === 'YES' ? 'text-green-600' : 'text-red-600'}>
                                          {market.ai_resolution.recommendation === 'YES' ? 'TRUE' : 'FALSE'}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        with a certainty of <span className="font-bold">{(market.ai_resolution.confidence * 100).toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pl-11">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                      {market.ai_resolution.reasoning}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Search Queries Used */}
                              {(market.ai_resolution as any).searchQueries && (market.ai_resolution as any).searchQueries.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <h6 className="font-medium text-xs mb-2 text-blue-900 dark:text-blue-100">🔍 Search Queries Used:</h6>
                                  <div className="flex flex-wrap gap-2">
                                    {(market.ai_resolution as any).searchQueries.map((query: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs text-blue-700 dark:text-blue-300">
                                        "{query}"
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Key Factors */}
                              {market.ai_resolution.keyFactors && market.ai_resolution.keyFactors.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">🔑 Key Evidence Points:</h6>
                                  <ul className="space-y-2">
                                    {market.ai_resolution.keyFactors.map((factor, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                        <span className="text-gray-700 dark:text-gray-300">{factor}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {market.ai_resolution.sourceAnalysis && Object.keys(market.ai_resolution.sourceAnalysis).length > 0 && (
                                <div>
                                  <h6 className="font-medium text-sm mb-2">Source Analysis:</h6>
                                  <div className="space-y-2">
                                    {Object.entries(market.ai_resolution.sourceAnalysis).map(([source, analysis]) => {
                                      const typedAnalysis = analysis as SourceAnalysis;
                                      return (
                                        <div key={source} className="border border-gray-200 dark:border-gray-700 p-2 rounded text-xs">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{source}</span>
                                            <Badge size="sm" variant={
                                              typedAnalysis.position === 'YES' ? 'default' :
                                              typedAnalysis.position === 'NO' ? 'destructive' : 'secondary'
                                            }>
                                              {typedAnalysis.position}
                                            </Badge>
                                          </div>
                                          <p className="text-gray-600 dark:text-gray-400">{typedAnalysis.summary}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {(market.ai_resolution.sourceArticles || market.ai_resolution.newsArticles) &&
                               ((market.ai_resolution.sourceArticles && market.ai_resolution.sourceArticles.length > 0) ||
                                (market.ai_resolution.newsArticles && market.ai_resolution.newsArticles.length > 0)) && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <h6 className="font-medium text-sm">
                                      {market.ai_resolution.sourceType || 'News'} Articles Analyzed
                                      ({(market.ai_resolution.sourceArticles || market.ai_resolution.newsArticles).length}):
                                    </h6>
                                    {market.ai_resolution.dataSourceUsed && (
                                      <Badge variant="outline" className="text-xs">
                                        {market.ai_resolution.dataSourceUsed}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {(market.ai_resolution.sourceArticles || market.ai_resolution.newsArticles).map((article, idx) => (
                                      <div key={idx} className="border border-gray-200 dark:border-gray-700 p-3 rounded">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h3 className="font-medium text-sm line-clamp-2 mb-1">{article.title}</h3>
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline" className="text-xs">{article.source}</Badge>
                                              {article.relevanceScore && (
                                                <Badge variant="outline" className="text-xs">
                                                  {((article.relevanceScore * 100).toFixed(0))}% relevant
                                                </Badge>
                                              )}
                                              <span className="text-xs text-gray-500">
                                                {new Date(article.publishedAt).toLocaleDateString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                                          {article.content}
                                        </p>
                                        <div className="flex items-center justify-between">
                                          {article.author && (
                                            <span className="text-xs text-gray-500">By {article.author}</span>
                                          )}
                                          <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-600 text-xs flex items-center gap-1"
                                          >
                                            Read Article <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {market.ai_resolution.processingTimeMs && (() => {
                                const timeInSeconds = (market.ai_resolution.processingTimeMs / 1000).toFixed(1);
                                return (
                                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    Processing time: {timeInSeconds}s
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary Tab */}
                    {getActiveMarketTab(market.id) === 'summary' && (() => {
                      // Get pre-calculated confidence breakdown from state
                      const confidenceBreakdown = confidenceBreakdowns[market.id] || null;

                      // Format timestamp helper
                      const formatTimestamp = (timestamp?: string) => {
                        if (!timestamp) return 'Never run';
                        const date = new Date(timestamp);
                        const now = new Date();
                        const diff = now.getTime() - date.getTime();
                        const minutes = Math.floor(diff / 60000);
                        const hours = Math.floor(diff / 3600000);
                        const days = Math.floor(diff / 86400000);

                        if (minutes < 1) return 'Just now';
                        if (minutes < 60) return `${minutes}m ago`;
                        if (hours < 24) return `${hours}h ago`;
                        if (days < 7) return `${days}d ago`;
                        return date.toLocaleDateString();
                      };

                      return (
                      <div>
                        <h4 className="font-medium mb-4">Final Resolution Summary</h4>

                        {/* Data Source & Timestamp Info Card */}
                        <div className="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Analysis Status
                              </h5>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600 dark:text-gray-400">AI Engine:</div>
                                  <div className="font-medium">
                                    {market.ai_analysis_timestamp ? (
                                      <span className="text-green-600 dark:text-green-400">
                                        ✓ {formatTimestamp(market.ai_analysis_timestamp)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">Not run</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600 dark:text-gray-400">Evidence Check:</div>
                                  <div className="font-medium">
                                    {market.aggregation_timestamp ? (
                                      <span className="text-green-600 dark:text-green-400">
                                        ✓ {formatTimestamp(market.aggregation_timestamp)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">Not run</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <strong>Data Source:</strong> {market.ai_resolution?.sourceType || 'Perplexity AI'}
                                {market.ai_resolution?.sourceType?.includes('Perplexity') && ' (AI-powered search with citations)'}
                                {market.ai_resolution?.sourceType?.includes('Wikipedia') && ' (Historical encyclopedia)'}
                                {market.ai_resolution?.sourceType?.includes('NewsAPI') && ' (News aggregator)'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">

                          {confidenceBreakdown ? (
                            <>
                              {/* Final Confidence Score - Big Display */}
                              <div className="border-2 border-primary p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                <div className="text-center">
                                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">FINAL CONFIDENCE SCORE</h3>
                                  <div className="text-6xl font-bold mb-2" style={{
                                    color: confidenceBreakdown.finalConfidence >= 90 ? '#16a34a' :
                                           confidenceBreakdown.finalConfidence >= 70 ? '#2563eb' :
                                           confidenceBreakdown.finalConfidence >= 50 ? '#eab308' : '#dc2626'
                                  }}>
                                    {confidenceBreakdown.finalConfidence.toFixed(1)}%
                                  </div>
                                  <Badge
                                    variant={confidenceBreakdown.finalRecommendation === 'YES' ? 'default' : 'destructive'}
                                    className="text-lg py-1 px-4"
                                  >
                                    RECOMMEND: {confidenceBreakdown.finalRecommendation}
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {finalConfidenceCalculator.getConfidenceLevel(confidenceBreakdown.finalConfidence)} CONFIDENCE
                                  </p>
                                </div>
                              </div>

                              {/* Adaptive Strategy Transparency Card */}
                              <div className={`border-2 p-4 rounded-lg ${
                                confidenceBreakdown.strategy === 'MARKET_VALIDATED' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                                confidenceBreakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                                'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <div className="text-2xl mt-0.5">
                                    {confidenceBreakdown.strategy === 'MARKET_VALIDATED' ? '✅' :
                                     confidenceBreakdown.strategy === 'EVIDENCE_CONTRADICTS' ? '⚠️' :
                                     '⚖️'}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1 flex items-center gap-2">
                                      <span>Adaptive Strategy: </span>
                                      <Badge variant={
                                        confidenceBreakdown.strategy === 'MARKET_VALIDATED' ? 'default' :
                                        confidenceBreakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'destructive' :
                                        'outline'
                                      }>
                                        {confidenceBreakdown.strategy === 'MARKET_VALIDATED' ? 'MARKET VALIDATED' :
                                         confidenceBreakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'EVIDENCE CONTRADICTS' :
                                         'STANDARD (MIXED SIGNALS)'}
                                      </Badge>
                                    </h5>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                      {confidenceBreakdown.strategyExplanation}
                                    </p>
                                    <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                      <div className="flex gap-4">
                                        <span>Market Weight: <strong>{confidenceBreakdown.marketOddsWeight}%</strong></span>
                                        <span>Evidence Weight: <strong>{confidenceBreakdown.evidenceWeight}%</strong></span>
                                        <span>AI Weight: <strong>{confidenceBreakdown.apiWeight}%</strong></span>
                                      </div>
                                      {confidenceBreakdown.suspectManipulation && (
                                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200">
                                          🚨 <strong>Potential Manipulation Detected:</strong> High-quality evidence strongly contradicts market consensus
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Component Breakdown */}
                              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <h5 className="font-medium mb-4 flex items-center gap-2">
                                  <span>📊</span> Confidence Components
                                </h5>

                                {/* Market Odds - Adaptive Weight */}
                                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">1. Market Odds</span>
                                    <Badge variant="outline" className="text-xs">{confidenceBreakdown.marketOddsWeight}% Weight</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                      <div
                                        className="bg-blue-600 h-3 rounded-full transition-all"
                                        style={{ width: `${confidenceBreakdown.marketOddsDetails.confidenceFromOdds}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-16 text-right">{confidenceBreakdown.marketOddsDetails.confidenceFromOdds.toFixed(1)}%</span>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <div>Yes Odds: {market.yesOdds?.toFixed(2)}x → {(confidenceBreakdown.marketOddsDetails.yesImpliedProbability * 100).toFixed(1)}% implied</div>
                                    <div>No Odds: {market.noOdds?.toFixed(2)}x → {(confidenceBreakdown.marketOddsDetails.noImpliedProbability * 100).toFixed(1)}% implied</div>
                                    <div className="font-medium text-primary">Contributes: +{confidenceBreakdown.marketOddsContribution.toFixed(1)} points</div>
                                  </div>
                                </div>

                                {/* Evidence - Adaptive Weight */}
                                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">2. Evidence Analysis</span>
                                    <Badge variant="outline" className="text-xs">{confidenceBreakdown.evidenceWeight}% Weight</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                      <div
                                        className="bg-green-600 h-3 rounded-full transition-all"
                                        style={{ width: `${confidenceBreakdown.evidenceScore}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-16 text-right">{confidenceBreakdown.evidenceScore.toFixed(1)}%</span>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <div>Total: {confidenceBreakdown.evidenceDetails.totalEvidences} | Accepted: {confidenceBreakdown.evidenceDetails.acceptedEvidences}</div>
                                    <div>Legitimate: {confidenceBreakdown.evidenceDetails.legitimateCount} | Against Community: {confidenceBreakdown.evidenceDetails.againstCommunityCount}</div>
                                    <div className="text-amber-600 dark:text-amber-400">⭐ High-Value (Both): {confidenceBreakdown.evidenceDetails.legitimateAndAgainstCommunity} (3x weight)</div>
                                    <div>Supporting YES: {confidenceBreakdown.evidenceDetails.yesSupporting} | Supporting NO: {confidenceBreakdown.evidenceDetails.noSupporting}</div>
                                    <div className="font-medium text-primary">Contributes: +{confidenceBreakdown.evidenceContribution.toFixed(1)} points</div>
                                  </div>
                                </div>

                                {/* External API - Adaptive Weight */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">3. External API</span>
                                    <Badge variant="outline" className="text-xs">{confidenceBreakdown.apiWeight}% Weight</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                      <div
                                        className="bg-purple-600 h-3 rounded-full transition-all"
                                        style={{ width: `${confidenceBreakdown.apiScore}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-16 text-right">{confidenceBreakdown.apiScore.toFixed(1)}%</span>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <div>Recommendation: {confidenceBreakdown.apiDetails.recommendation}</div>
                                    <div>Source: {confidenceBreakdown.apiDetails.sourceType || 'External API'}</div>
                                    <div>Raw Confidence: {(market.ai_resolution.confidence * 100).toFixed(1)}%</div>
                                    <div className="font-medium text-primary">Contributes: +{confidenceBreakdown.apiContribution.toFixed(1)} points</div>
                                  </div>
                                </div>
                              </div>

                              {/* Execute Final Resolution Button - 80% Threshold Logic */}
                              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                {(() => {
                                  // Calculate days since evidence period started
                                  const evidenceStartDate = market.evidence_period_start
                                    ? new Date(market.evidence_period_start)
                                    : market.expiresAt
                                      ? new Date(market.expiresAt)
                                      : null;

                                  if (!evidenceStartDate) {
                                    return (
                                      <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Evidence period not yet started</p>
                                      </div>
                                    );
                                  }

                                  const now = new Date();
                                  const daysSinceExpiry = Math.floor((now.getTime() - evidenceStartDate.getTime()) / (1000 * 60 * 60 * 24));
                                  const confidence = confidenceBreakdown.finalConfidence;
                                  const MIN_EVIDENCE_DAYS = 7;
                                  const MAX_EVIDENCE_DAYS = 30;
                                  const CONFIDENCE_THRESHOLD = 80;

                                  // State 1: Still in minimum evidence period (< 7 days)
                                  if (daysSinceExpiry < MIN_EVIDENCE_DAYS) {
                                    const daysRemaining = MIN_EVIDENCE_DAYS - daysSinceExpiry;
                                    return (
                                      <>
                                        <Button
                                          disabled
                                          className="gap-2 w-full"
                                          size="lg"
                                          variant="secondary"
                                        >
                                          <Clock className="h-5 w-5" />
                                          Collecting Evidence ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining)
                                        </Button>
                                        <p className="text-xs text-center text-gray-500 mt-2">
                                          Minimum 7-day evidence period required. Current confidence: {confidence.toFixed(1)}%
                                        </p>
                                      </>
                                    );
                                  }

                                  // State 2: After 7 days, confidence >= 80% - READY FOR RESOLUTION
                                  if (confidence >= CONFIDENCE_THRESHOLD) {
                                    return (
                                      <>
                                        <Button
                                          onClick={() => {
                                            setSelectedMarket(market);
                                            setShowResolveDialog(true);
                                          }}
                                          className="gap-2 w-full bg-green-600 hover:bg-green-700 text-white"
                                          size="lg"
                                        >
                                          <Gavel className="h-5 w-5" />
                                          Generate Final Resolution & Payout
                                        </Button>
                                        <p className="text-xs text-center text-green-700 dark:text-green-300 mt-2">
                                          ✓ Confidence threshold met: {confidence.toFixed(1)}% (minimum: {CONFIDENCE_THRESHOLD}%)
                                        </p>
                                      </>
                                    );
                                  }

                                  // State 3: After 30 days, confidence still < 80% - REFUND OPTION
                                  if (daysSinceExpiry >= MAX_EVIDENCE_DAYS) {
                                    return (
                                      <>
                                        <Button
                                          onClick={async () => {
                                            try {
                                              if (!market.contractAddress) {
                                                toast.error('Market contract address not found');
                                                return;
                                              }
                                              toast.info('Initiating refund process...');
                                              // Hedera EVM service removed - TODO: Implement BSC refund
                                              toast.error('Refund not implemented for BSC yet');
                                              // Refresh markets
                                              await loadMarketsWithEvidence();
                                            } catch (error: any) {
                                              console.error('Refund error:', error);
                                              toast.error(`Refund failed: ${error.message}`);
                                            }
                                          }}
                                          className="gap-2 w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                                          size="lg"
                                        >
                                          <AlertTriangle className="h-5 w-5" />
                                          Market Inconclusive - Refund All Bets
                                        </Button>
                                        <p className="text-xs text-center text-yellow-700 dark:text-yellow-300 mt-2">
                                          {daysSinceExpiry} days elapsed. Confidence: {confidence.toFixed(1)}% (never reached {CONFIDENCE_THRESHOLD}%)
                                        </p>
                                      </>
                                    );
                                  }

                                  // State 4: Between 7-30 days, confidence < 80% - WAITING FOR MORE EVIDENCE
                                  return (
                                    <>
                                      <Button
                                        disabled
                                        className="gap-2 w-full"
                                        size="lg"
                                        variant="outline"
                                      >
                                        <AlertTriangle className="h-5 w-5" />
                                        Confidence Too Low ({confidence.toFixed(1)}% - need {CONFIDENCE_THRESHOLD}%+)
                                      </Button>
                                      <p className="text-xs text-center text-gray-500 mt-2">
                                        Day {daysSinceExpiry} of evidence period. Market will accept evidence for {MAX_EVIDENCE_DAYS - daysSinceExpiry} more days.
                                      </p>
                                    </>
                                  );
                                })()}
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-yellow-600" />
                              <h5 className="font-medium mb-2">Cannot Calculate Confidence</h5>
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                                Please complete the following steps first:
                              </p>
                              <ul className="text-sm text-left max-w-md mx-auto space-y-2">
                                {!market.yesOdds && <li className="flex items-center gap-2">❌ Market odds not available</li>}
                                {!market.ai_resolution && <li className="flex items-center gap-2">❌ Run AI Engine analysis in the AI tab</li>}
                                {market.evidences.filter(e => e.status === 'accepted').length === 0 && (
                                  <li className="flex items-center gap-2">⚠️  No evidence accepted yet (optional but recommended)</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Configuration Dialog */}
      <AlertDialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>AI Resolution Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Configure external data sources and AI analysis parameters
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">External Data Sources</Label>
              <div className="space-y-2 mt-2">
                {['BBC News', 'Reuters Africa', 'NewsAPI', 'Government Sources'].map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">{source}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Confidence Threshold for Auto-Resolution</Label>
              <Select value={aiConfig.confidenceThreshold.toString()} onValueChange={(value) => 
                setAiConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(value) }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.9">90% - Very High</SelectItem>
                  <SelectItem value="0.8">80% - High</SelectItem>
                  <SelectItem value="0.7">70% - Medium</SelectItem>
                  <SelectItem value="0.6">60% - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Save Configuration</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolution Execution Dialog - Enhanced */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">⚖️ Execute Market Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              Review the complete analysis breakdown before executing the final resolution.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedMarket && (() => {
            const breakdown = confidenceBreakdowns[selectedMarket.id];
            const hasLowConfidence = breakdown && breakdown.finalConfidence < 70;
            const hasManipulationWarning = breakdown && breakdown.suspectManipulation;

            return (
              <div className="space-y-4">
                {/* Market Question */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-lg mb-1">{selectedMarket.claim}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Market ID: {selectedMarket.id}</span>
                    <span>•</span>
                    <span>Status: {selectedMarket.status}</span>
                  </div>
                </div>

                {/* Final Confidence Score - Prominent */}
                {breakdown && (
                  <div className="border-2 border-primary p-5 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div className="text-center mb-4">
                      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Final Confidence</h3>
                      <div className="text-5xl font-bold mb-2" style={{
                        color: breakdown.finalConfidence >= 90 ? '#16a34a' :
                               breakdown.finalConfidence >= 70 ? '#2563eb' :
                               breakdown.finalConfidence >= 50 ? '#eab308' : '#dc2626'
                      }}>
                        {breakdown.finalConfidence.toFixed(1)}%
                      </div>
                      <Badge
                        variant={breakdown.finalRecommendation === 'YES' ? 'default' : 'destructive'}
                        className="text-base py-1.5 px-5 font-bold"
                      >
                        RESOLVE: {breakdown.finalRecommendation}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        {finalConfidenceCalculator.getConfidenceLevel(breakdown.finalConfidence)} CONFIDENCE
                      </p>
                    </div>

                    {/* Quick Summary Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Market Odds</div>
                        <div className="font-bold text-sm">{breakdown.marketOddsDetails.confidenceFromOdds.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">({breakdown.marketOddsWeight}% weight)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Evidence</div>
                        <div className="font-bold text-sm">{breakdown.evidenceScore.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">({breakdown.evidenceWeight}% weight)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">AI Analysis</div>
                        <div className="font-bold text-sm">{breakdown.apiScore.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">({breakdown.apiWeight}% weight)</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Safety Warnings */}
                {hasLowConfidence && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-700 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-amber-900 dark:text-amber-100 mb-1">⚠️ Low Confidence Warning</h5>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Confidence is below 70%. Consider reviewing evidence and market data before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasManipulationWarning && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-red-900 dark:text-red-100 mb-1">🚨 Potential Market Manipulation Detected</h5>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          High-quality evidence strongly contradicts market consensus. Review carefully before executing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adaptive Strategy Explanation */}
                {breakdown && (
                  <div className={`border-2 p-3 rounded-lg ${
                    breakdown.strategy === 'MARKET_VALIDATED' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                    breakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">STRATEGY:</span>
                      <Badge variant={
                        breakdown.strategy === 'MARKET_VALIDATED' ? 'default' :
                        breakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'destructive' :
                        'outline'
                      }>
                        {breakdown.strategy === 'MARKET_VALIDATED' ? 'MARKET VALIDATED' :
                         breakdown.strategy === 'EVIDENCE_CONTRADICTS' ? 'EVIDENCE CONTRADICTS' :
                         'STANDARD (MIXED SIGNALS)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {breakdown.strategyExplanation}
                    </p>
                  </div>
                )}

                {/* AI Reasoning */}
                {selectedMarket.ai_resolution && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                    <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Analysis Reasoning
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedMarket.ai_resolution.reasoning}
                    </p>
                  </div>
                )}

                {/* Override Section */}
                <div className="space-y-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="overrideAI"
                      checked={manualResolution.overrideAI}
                      onChange={(e) => setManualResolution(prev => ({ ...prev, overrideAI: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="overrideAI" className="text-sm font-medium">Override AI decision with manual resolution</Label>
                  </div>

                  {manualResolution.overrideAI && (
                    <div className="space-y-3 pl-6 border-l-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                      <div>
                        <Label className="text-sm font-medium">Manual Outcome</Label>
                        <Select
                          value={manualResolution.outcome}
                          onValueChange={(value: 'yes' | 'no') =>
                            setManualResolution(prev => ({ ...prev, outcome: value }))
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ YES - Claim is True</SelectItem>
                            <SelectItem value="no">❌ NO - Claim is False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Reasoning for Override (Required)</Label>
                        <Textarea
                          placeholder="Explain why you're overriding the AI decision..."
                          value={manualResolution.reasoning}
                          onChange={(e) => setManualResolution(prev => ({ ...prev, reasoning: e.target.value }))}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pre-execution Checklist */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <CheckCircle className="h-4 w-4" />
                    Pre-Execution Checklist
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-green-600 rounded-full" />
                      <span>Market has expired and is ready for resolution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-green-600 rounded-full" />
                      <span>All evidence has been reviewed and validated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-green-600 rounded-full" />
                      <span>AI analysis has been completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-green-600 rounded-full" />
                      <span>Final confidence score has been calculated</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeResolution}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
            >
              <Gavel className="h-4 w-4 mr-2" />
              Execute Resolution On-Chain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EvidenceResolutionPanel;