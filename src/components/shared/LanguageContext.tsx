import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'fr' | 'sw';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation & General
    truthMarkets: 'Truth Markets',
    portfolio: 'Portfolio',
    verify: 'Verify',
    community: 'Community',
    social: 'Social',
    governance: 'Governance',
    history: 'History',
    settings: 'Settings',
    about: 'About',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    
    // Market Terms
    truth: 'Truth',
    false: 'False',
    truthYes: 'Truth',
    truthNo: 'False',
    cast: 'Cast',
    position: 'Position',
    amount: 'Amount',
    odds: 'Odds',
    pool: 'Pool',
    totalPool: 'Total Pool',
    yesPool: 'Truth Pool',
    noPool: 'False Pool',
    verifiers: 'Verifiers',
    totalVerifiers: 'Total Verifiers',
    
    // Actions
    quickCastTruth: 'Quick Cast Truth',
    quickCastFalse: 'Quick Cast False',
    castYourPosition: 'Cast Your Position',
    castPosition: 'Cast Position',
    confirmCast: 'Confirm Cast',
    customAmount: 'Custom Amount',
    potentialReturn: 'Potential Return',
    
    // Market Info
    marketOverview: 'Market Overview',
    marketDescription: 'Market Description',
    marketRules: 'Market Rules',
    marketStatistics: 'Market Statistics',
    marketStatus: 'Market Status',
    marketAge: 'Market Age',
    verificationMethodology: 'Verification Methodology',
    rulesDescription: 'These rules govern how this truth market operates and will be resolved.',
    conditions: 'Conditions',
    
    // Time & Status
    expiresIn: 'Expires in',
    expired: 'Expired',
    daysShort: 'd',
    hoursShort: 'h',
    active: 'Active',
    views: 'Views',
    likes: 'Likes',
    comments: 'Comments',
    
    // Filters & Categories
    trending: 'Trending',
    endingSoon: 'Ending Soon',
    africanTruthMarkets: 'African Truth Markets',
    presentEvents: 'Present Events',
    futureEvents: 'Future Events',
    truthVerification: 'Truth Verification',
    entertainment: 'Entertainment',
    celebrityGossip: 'Celebrity Gossip',
    finance: 'Finance',
    politics: 'Politics',
    sports: 'Sports',
    technology: 'Technology',
    climate: 'Climate',
    health: 'Health',
    categories: 'Categories',
    
    // Search & UI
    searchMarkets: 'Search markets...',
    activeMarkets: 'Active Markets',
    noMarketsFound: 'No markets found',
    tryDifferentFilter: 'Try adjusting your filters or search terms',
    
    // Balance & Wallet
    currentBalance: 'Current Balance',
    insufficientBalance: 'Insufficient balance',
    balance: 'Balance',
    eth: 'HBAR',
    
    // Confirmation & Messages
    castConfirmationDesc: 'Are you sure you want to cast this position?',
    cancel: 'Cancel',
    share: 'Share',
    
    // Community & Comments
    communityDiscussion: 'Community Discussion',
    shareYourThoughts: 'Share your thoughts on this truth market',
    writeCommentPlaceholder: 'What are your thoughts on this claim? Share your analysis...',
    postComment: 'Post Comment',
    reply: 'Reply',
    neutral: 'Neutral',
    
    // AI & Analysis
    aiAnalysis: 'AI Analysis',
    insights: 'Insights',
    aiConfidenceScore: 'AI Confidence Score',
    aiConfidenceExplanation: 'Based on analysis of multiple data sources and historical patterns',
    keyFactors: 'Key Factors',
    dataSources: 'Data Sources',
    
    // Navigation
    backToMarkets: 'Back to Markets',
    overview: 'Overview',
    rules: 'Rules',
    analysis: 'Analysis',
    
    // Market Details
    truthVerificationPool: 'Truth Verification Pool',
    totalVolume: 'Total Volume',
    liquidity: 'Liquidity',
    liquidityPool: 'Liquidity Pool',
    
    // Descriptions
    truthMarketsDesc: 'Verify trending news and cast your position on truth claims across Africa',
    marketRulesDescription: 'These rules govern how this truth market operates and will be resolved.'
  },
  
  fr: {
    // Navigation & General
    truthMarkets: 'Marchés de Vérité',
    portfolio: 'Portefeuille',
    verify: 'Vérifier',
    community: 'Communauté',
    social: 'Social',
    governance: 'Gouvernance',
    history: 'Historique',
    settings: 'Paramètres',
    about: 'À propos',
    contact: 'Contact',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    
    // Market Terms
    truth: 'Vrai',
    false: 'Faux',
    truthYes: 'Vrai',
    truthNo: 'Faux',
    cast: 'Parier',
    position: 'Position',
    amount: 'Montant',
    odds: 'Cotes',
    pool: 'Pool',
    totalPool: 'Pool Total',
    yesPool: 'Pool Vrai',
    noPool: 'Pool Faux',
    verifiers: 'Vérificateurs',
    totalVerifiers: 'Total Vérificateurs',
    
    // Actions
    quickCastTruth: 'Pari Rapide Vrai',
    quickCastFalse: 'Pari Rapide Faux',
    castYourPosition: 'Prenez Position',
    castPosition: 'Prendre Position',
    confirmCast: 'Confirmer le Pari',
    customAmount: 'Montant Personnalisé',
    potentialReturn: 'Retour Potentiel',
    
    // Market Info
    marketOverview: 'Aperçu du Marché',
    marketDescription: 'Description du Marché',
    marketRules: 'Règles du Marché',
    marketStatistics: 'Statistiques du Marché',
    marketStatus: 'Statut du Marché',
    marketAge: 'Âge du Marché',
    verificationMethodology: 'Méthodologie de Vérification',
    rulesDescription: 'Ces règles régissent le fonctionnement et la résolution de ce marché de vérité.',
    conditions: 'Conditions',
    
    // Time & Status
    expiresIn: 'Expire dans',
    expired: 'Expiré',
    daysShort: 'j',
    hoursShort: 'h',
    active: 'Actif',
    views: 'Vues',
    likes: 'J\'aime',
    comments: 'Commentaires',
    
    // Filters & Categories
    trending: 'Tendance',
    endingSoon: 'Se Termine Bientôt',
    africanTruthMarkets: 'Marchés de Vérité Africains',
    presentEvents: 'Événements Actuels',
    futureEvents: 'Événements Futurs',
    truthVerification: 'Vérification de Vérité',
    entertainment: 'Divertissement',
    celebrityGossip: 'Potins de Célébrités',
    finance: 'Finance',
    politics: 'Politique',
    sports: 'Sports',
    technology: 'Technologie',
    climate: 'Climat',
    health: 'Santé',
    categories: 'Catégories',
    
    // Search & UI
    searchMarkets: 'Rechercher des marchés...',
    activeMarkets: 'Marchés Actifs',
    noMarketsFound: 'Aucun marché trouvé',
    tryDifferentFilter: 'Essayez d\'ajuster vos filtres ou termes de recherche',
    
    // Balance & Wallet
    currentBalance: 'Solde Actuel',
    insufficientBalance: 'Solde insuffisant',
    balance: 'Solde',
    eth: 'HBAR',
    
    // Confirmation & Messages
    castConfirmationDesc: 'Êtes-vous sûr de vouloir prendre cette position?',
    cancel: 'Annuler',
    share: 'Partager',
    
    // Community & Comments
    communityDiscussion: 'Discussion Communautaire',
    shareYourThoughts: 'Partagez vos réflexions sur ce marché de vérité',
    writeCommentPlaceholder: 'Quelles sont vos réflexions sur cette affirmation? Partagez votre analyse...',
    postComment: 'Publier un Commentaire',
    reply: 'Répondre',
    neutral: 'Neutre',
    
    // AI & Analysis
    aiAnalysis: 'Analyse IA',
    insights: 'Aperçus',
    aiConfidenceScore: 'Score de Confiance IA',
    aiConfidenceExplanation: 'Basé sur l\'analyse de plusieurs sources de données et modèles historiques',
    keyFactors: 'Facteurs Clés',
    dataSources: 'Sources de Données',
    
    // Navigation
    backToMarkets: 'Retour aux Marchés',
    overview: 'Aperçu',
    rules: 'Règles',
    analysis: 'Analyse',
    
    // Market Details
    truthVerificationPool: 'Pool de Vérification de Vérité',
    totalVolume: 'Volume Total',
    liquidity: 'Liquidité',
    liquidityPool: 'Pool de Liquidité',
    
    // Descriptions
    truthMarketsDesc: 'Vérifiez les actualités tendances et prenez position sur les revendications de vérité à travers l\'Afrique',
    marketRulesDescription: 'Ces règles régissent le fonctionnement et la résolution de ce marché de vérité.'
  },
  
  sw: {
    // Navigation & General
    truthMarkets: 'Masoko ya Ukweli',
    portfolio: 'Mkoba',
    verify: 'Thibitisha',
    community: 'Jamii',
    social: 'Kijamii',
    governance: 'Utawala',
    history: 'Historia',
    settings: 'Mipangilio',
    about: 'Kuhusu',
    contact: 'Wasiliana',
    privacy: 'Faragha',
    terms: 'Masharti',
    
    // Market Terms
    truth: 'Ukweli',
    false: 'Uongo',
    truthYes: 'Ukweli',
    truthNo: 'Uongo',
    cast: 'Piga Kura',
    position: 'Msimamo',
    amount: 'Kiasi',
    odds: 'Uwezekano',
    pool: 'Mfuko',
    totalPool: 'Jumla ya Mfuko',
    yesPool: 'Mfuko wa Ukweli',
    noPool: 'Mfuko wa Uongo',
    verifiers: 'Wathibitishaji',
    totalVerifiers: 'Jumla ya Wathibitishaji',
    
    // Actions
    quickCastTruth: 'Piga Kura Ukweli Haraka',
    quickCastFalse: 'Piga Kura Uongo Haraka',
    castYourPosition: 'Chukua Msimamo Wako',
    castPosition: 'Chukua Msimamo',
    confirmCast: 'Thibitisha Kura',
    customAmount: 'Kiasi cha Kawaida',
    potentialReturn: 'Mapato Yanayowezekana',
    
    // Market Info
    marketOverview: 'Muhtasari wa Soko',
    marketDescription: 'Maelezo ya Soko',
    marketRules: 'Sheria za Soko',
    marketStatistics: 'Takwimu za Soko',
    marketStatus: 'Hali ya Soko',
    marketAge: 'Umri wa Soko',
    verificationMethodology: 'Mbinu za Uthibitisho',
    rulesDescription: 'Sheria hizi zinaongoza jinsi soko hili la ukweli linavyofanya kazi na kufumbuliwa.',
    conditions: 'Masharti',
    
    // Time & Status
    expiresIn: 'Inaisha baada ya',
    expired: 'Imeisha',
    daysShort: 's',
    hoursShort: 'm',
    active: 'Hai',
    views: 'Mionozo',
    likes: 'Kupenda',
    comments: 'Maoni',
    
    // Filters & Categories
    trending: 'Maarufu',
    endingSoon: 'Inaisha Hivi Karibuni',
    africanTruthMarkets: 'Masoko ya Ukweli ya Kiafrika',
    presentEvents: 'Matukio ya Sasa',
    futureEvents: 'Matukio ya Baadaye',
    truthVerification: 'Uthibitisho wa Ukweli',
    entertainment: 'Burudani',
    celebrityGossip: 'Uvumi wa Mashuhuri',
    finance: 'Fedha',
    politics: 'Siasa',
    sports: 'Michezo',
    technology: 'Teknolojia',
    climate: 'Tabianchi',
    health: 'Afya',
    categories: 'Makundi',
    
    // Search & UI
    searchMarkets: 'Tafuta masoko...',
    activeMarkets: 'Masoko Hai',
    noMarketsFound: 'Hakuna masoko yaliyopatikana',
    tryDifferentFilter: 'Jaribu kubadilisha vichungi vyako au maneno ya utafutaji',
    
    // Balance & Wallet
    currentBalance: 'Salio la Sasa',
    insufficientBalance: 'Salio halikutoshi',
    balance: 'Salio',
    eth: 'HBAR',
    
    // Confirmation & Messages
    castConfirmationDesc: 'Una uhakika unataka kuchukua msimamo huu?',
    cancel: 'Ghairi',
    share: 'Shiriki',
    
    // Community & Comments
    communityDiscussion: 'Mjadala wa Kijamii',
    shareYourThoughts: 'Shiriki mawazo yako kuhusu soko hili la ukweli',
    writeCommentPlaceholder: 'Ni mawazo gani unayo kuhusu dai hili? Shiriki uchambuzi wako...',
    postComment: 'Chapisha Maoni',
    reply: 'Jibu',
    neutral: 'Kati',
    
    // AI & Analysis
    aiAnalysis: 'Uchambuzi wa AI',
    insights: 'Maarifa',
    aiConfidenceScore: 'Kiwango cha Imani cha AI',
    aiConfidenceExplanation: 'Kulingana na uchambuzi wa vyanzo vingi vya data na mifumo ya kihistoria',
    keyFactors: 'Mambo Muhimu',
    dataSources: 'Vyanzo vya Data',
    
    // Navigation
    backToMarkets: 'Rudi kwa Masoko',
    overview: 'Muhtasari',
    rules: 'Sheria',
    analysis: 'Uchambuzi',
    
    // Market Details
    truthVerificationPool: 'Mfuko wa Uthibitisho wa Ukweli',
    totalVolume: 'Jumla ya Ujazo',
    liquidity: 'Urahisi wa Fedha',
    liquidityPool: 'Mfuko wa Ukwasi',
    
    // Descriptions
    truthMarketsDesc: 'Thibitisha habari zinazovuma na chukua msimamo wako kuhusu madai ya ukweli kote Afrika',
    marketRulesDescription: 'Sheria hizi zinaongoza jinsi soko hili la ukweli linavyofanya kazi na kufumbuliwa.'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blockcast-language');
      if (saved && ['en', 'fr', 'sw'].includes(saved)) {
        return saved as Language;
      }

      // Default to English - users can manually switch languages
      // Auto-detect browser language (commented out to force English default)
      // const browserLang = navigator.language.toLowerCase();
      // if (browserLang.includes('fr')) return 'fr';
      // if (browserLang.includes('sw')) return 'sw';
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blockcast-language', language);
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}