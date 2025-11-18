import { VerificationResult } from '../components/verification/VerificationResults';

// Mock AI responses for different types of claims
export const mockAIResponses = {
  'coffee': {
    verdict: 'true' as const,
    confidence: 82,
    analysis: "Multiple peer-reviewed studies, including research published in the American Journal of Cardiology, have shown that moderate coffee consumption (3-4 cups daily) is associated with reduced risk of cardiovascular disease. The antioxidants and anti-inflammatory compounds in coffee appear to provide protective benefits. However, this applies to moderate consumption without excessive sugar or cream additions."
  },
  'great wall space': {
    verdict: 'false' as const,
    confidence: 95,
    analysis: "This is a persistent myth that has been thoroughly debunked. The Great Wall of China is not visible from space with the naked eye. NASA has confirmed this multiple times, and astronauts have stated that while some human-made structures can be seen from low Earth orbit under perfect conditions, the Great Wall is not one of them due to its narrow width and materials that blend with the landscape."
  },
  'brain 10 percent': {
    verdict: 'false' as const,
    confidence: 98,
    analysis: "This is one of the most persistent myths in popular psychology. Modern neuroscience and brain imaging techniques clearly show that humans use virtually all of their brain. Different areas are active at different times, and brain imaging shows that even simple tasks use much more than 10% of brain activity. The myth persists due to its appeal and misinterpretation of early neuroscience research."
  },
  'goldfish memory': {
    verdict: 'false' as const,
    confidence: 91,
    analysis: "Scientific studies have proven that goldfish have much longer memories than 3 seconds. Research has shown goldfish can remember things for at least 3 months, and can be trained to respond to different colors, sounds, and other sensory cues. This myth likely persists because it's used to justify keeping goldfish in small bowls, which is actually harmful to their wellbeing."
  },
  'lightning same place': {
    verdict: 'false' as const,
    confidence: 94,
    analysis: "Lightning absolutely can and does strike the same place multiple times. Tall structures like the Empire State Building are struck by lightning around 100 times per year. The myth likely comes from the mathematical improbability of lightning hitting any specific small area twice, but prominent or elevated locations are actually more likely to be struck repeatedly."
  },
  'covid origins': {
    verdict: 'mixed' as const,
    confidence: 65,
    analysis: "The origins of COVID-19 remain scientifically uncertain. While initial evidence pointed to natural zoonotic transmission from animals to humans, possibly through wet markets, the laboratory origin hypothesis cannot be definitively ruled out. Both the WHO and U.S. intelligence agencies have stated that more investigation is needed to determine the true origin with certainty."
  }
};

// Welcome bonus configuration
export const welcomeBonus = {
  amount: 2,
  currency: 'HBAR',
  message: 'Welcome to Blockcast! Here\'s 2 HBAR to get you started with truth verification!',
  icon: 'gift'
};

// Default verification result template
export const defaultVerificationResult = (claim: string): Omit<VerificationResult, 'verdict' | 'confidence' | 'aiAnalysis'> => ({
  id: `verification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  claim,
  sources: [
    {
      name: 'Academic Research',
      credibility: 95,
      url: '#'
    },
    {
      name: 'Scientific Journals',
      credibility: 92,
      url: '#'
    },
    {
      name: 'Expert Analysis',
      credibility: 88,
      url: '#'
    }
  ]
});

// Mock verification history for demo purposes
export const mockVerificationHistory = [
  {
    id: 'v1',
    claim: 'Coffee consumption is linked to reduced heart disease risk',
    verdict: 'true' as const,
    confidence: 82,
    date: new Date(Date.now() - 86400000),
    stake: 100
  },
  {
    id: 'v2',
    claim: 'The Great Wall of China is visible from space',
    verdict: 'false' as const,
    confidence: 95,
    date: new Date(Date.now() - 172800000),
    stake: 50
  },
  {
    id: 'v3',
    claim: 'Humans only use 10% of their brain',
    verdict: 'false' as const,
    confidence: 98,
    date: new Date(Date.now() - 259200000),
    stake: 75
  }
];