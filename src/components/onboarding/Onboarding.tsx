import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { CheckCircle, TrendingUp, Shield, Wallet, Users, ArrowRight, ArrowLeft, Gift, Target, Zap } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Blockcast',
    description: 'The future of prediction markets',
    icon: Target,
    content: {
      title: 'Predict the Future, Earn Rewards',
      description: 'Blockcast combines AI-powered fact-checking with cryptocurrency prediction markets. Bet on trending news, verify claims, and earn rewards for accurate predictions.',
      highlights: [
        'Real-time prediction markets',
        'AI fact-checking technology',
        'Blockchain transparency',
        'Social trading with friends'
      ]
    }
  },
  {
    id: 2,
    title: 'How Prediction Markets Work',
    description: 'Learn the basics of betting',
    icon: TrendingUp,
    content: {
      title: 'Simple YES/NO Betting',
      description: 'Each market asks a question about future events. You can bet YES if you think it will happen, or NO if you think it won\'t. Your potential winnings depend on the odds.',
      highlights: [
        'Buy YES if you think it will happen',
        'Buy NO if you think it won\'t',
        'Higher odds = higher potential returns',
        'Markets resolve based on real outcomes'
      ]
    }
  },
  {
    id: 3,
    title: 'AI Fact-Checking',
    description: 'Verify claims with AI',
    icon: Shield,
    content: {
      title: 'Smart Verification System',
      description: 'Our AI analyzes claims using multiple sources and provides confidence ratings. Use this feature to research before betting or verify news you see online.',
      highlights: [
        'Multi-source analysis',
        'Confidence ratings',
        'Blockchain verification',
        'Source credibility scores'
      ]
    }
  },
  {
    id: 4,
    title: 'Managing Your Wallet',
    description: 'Fund your account safely',
    icon: Wallet,
    content: {
      title: 'Secure HBAR Transactions',
      description: 'Add funds to your wallet to start betting. All transactions are secured on the blockchain. Start small and gradually increase your bets as you gain confidence.',
      highlights: [
        'Secure blockchain transactions',
        'Easy fund management',
        'Transparent betting history',
        'Responsible betting limits'
      ]
    }
  },
  {
    id: 5,
    title: 'Social Features',
    description: 'Invite friends and compete',
    icon: Users,
    content: {
      title: 'Better Together',
      description: 'Invite friends to join, share interesting markets, and compete on leaderboards. Earn referral bonuses when friends join and place their first bets.',
      highlights: [
        'Friend referral rewards',
        'Social leaderboards',
        'Share markets easily',
        'Competitive challenges'
      ]
    }
  },
  {
    id: 6,
    title: 'Ready to Start!',
    description: 'You\'re all set',
    icon: Zap,
    content: {
      title: 'Start Your Journey',
      description: 'You\'re now ready to explore Blockcast! Start with small bets, use the verification system, and don\'t forget to invite friends for extra rewards.',
      highlights: [
        'Explore trending markets',
        'Start with small amounts',
        'Verify claims before betting',
        'Share with friends for bonuses'
      ]
    }
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showQuickTour, setShowQuickTour] = useState(false);

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (showQuickTour) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Welcome Bonus!</CardTitle>
            <CardDescription>
              You've received 2 HBAR to start betting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">+2 HBAR</div>
              <p className="text-sm text-muted-foreground">Added to your wallet</p>
            </div>
            <Button onClick={onComplete} className="w-full">
              Start Exploring
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-xs">
              Step {currentStep + 1} of {onboardingSteps.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tutorial
            </Button>
          </div>
          
          <Progress value={progress} className="mb-6" />
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mb-2">{step.content.title}</CardTitle>
            <CardDescription className="text-center">
              {step.content.description}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {step.content.highlights.map((highlight, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">{highlight}</p>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                className="flex-1 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              className={`gap-2 ${currentStep === 0 ? 'w-full' : 'flex-1'}`}
            >
              {currentStep === onboardingSteps.length - 1 ? (
                <>
                  Get Started
                  <Zap className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}