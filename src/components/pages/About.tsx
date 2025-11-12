import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Shield, Globe, Users, Zap, Brain, Target, Award, TrendingUp, CheckCircle, Heart, Star } from 'lucide-react';
// Logo placeholder - replace with actual image when available

export default function About() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <img 
            src="/blockcast-logo.png" 
            alt="Blockcast Logo" 
            className="w-16 h-16 rounded-2xl object-contain"
          />
          <div>
            <h1 className="text-4xl font-bold text-primary">Blockcast</h1>
            <p className="text-lg text-muted-foreground">Africa's Truth Verification Platform</p>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Combating Misinformation Through Collective Intelligence
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Blockcast is Africa's first AI-powered truth verification platform that combines community wisdom with 
            advanced artificial intelligence to combat misinformation across the continent. We're building a future 
            where authentic news and credible information drive informed decision-making throughout Africa.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20 text-center">
          <div className="text-3xl font-bold text-primary mb-2">15+</div>
          <div className="text-sm text-muted-foreground">African Countries</div>
        </div>
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-6 rounded-lg border border-secondary/20 text-center">
          <div className="text-3xl font-bold text-secondary mb-2">94.2%</div>
          <div className="text-sm text-muted-foreground">Truth Accuracy</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-lg border border-green-500/20 text-center">
          <div className="text-3xl font-bold text-green-500 mb-2">50K+</div>
          <div className="text-sm text-muted-foreground">Community Verifiers</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-6 rounded-lg border border-yellow-500/20 text-center">
          <div className="text-3xl font-bold text-yellow-500 mb-2">$2.4M</div>
          <div className="text-sm text-muted-foreground">Truth Volume</div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              To democratize truth verification across Africa by combining AI technology with community intelligence, 
              creating a trustworthy information ecosystem that empowers citizens to make informed decisions and 
              combat misinformation at its source.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Fight misinformation through collective intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Empower African communities with truth verification tools</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Build transparent, blockchain-secured credibility systems</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6 text-secondary" />
              Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              To create an Africa where authentic information flows freely, where every citizen has access to 
              verified truth, and where misinformation cannot thrive. We envision a continent where decisions 
              are made based on facts, not fiction.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-secondary" />
                <span className="text-sm">Become Africa's leading truth verification platform</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-secondary" />
                <span className="text-sm">Establish credible information standards across the continent</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-secondary" />
                <span className="text-sm">Foster data-driven decision making in African societies</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            How Blockcast Works
          </CardTitle>
          <CardDescription>
            Our platform combines AI technology with community wisdom to verify truth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">AI Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI scans thousands of sources across Africa and internationally to verify claims and detect misinformation patterns.
                </p>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Community Voting</h3>
                <p className="text-sm text-muted-foreground">
                  African communities vote on truth claims, providing local context and cultural nuances that improve AI accuracy.
                </p>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Self-Learning</h3>
                <p className="text-sm text-muted-foreground">
                  The AI learns from community feedback, continuously improving its understanding of African contexts and reducing bias.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Truth Markets</h4>
                  <p className="text-sm text-muted-foreground">
                    Participate in prediction markets for African events, casting truth positions on real-world outcomes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">AI Fact-Checking</h4>
                  <p className="text-sm text-muted-foreground">
                    Submit claims for instant AI verification with sources from across Africa and internationally.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Community Networks</h4>
                  <p className="text-sm text-muted-foreground">
                    Join country-specific truth networks and collaborate with local fact-checkers and journalists.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Credibility Scoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Build your reputation as a trusted truth verifier and earn rewards for accurate assessments.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Blockchain Security</h4>
                  <p className="text-sm text-muted-foreground">
                    All verifications are secured on blockchain, ensuring transparency and immutable truth records.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Governance</h4>
                  <p className="text-sm text-muted-foreground">
                    Participate in platform governance and help shape the future of truth verification in Africa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            African Coverage
          </CardTitle>
          <CardDescription>
            Operating across 15+ African countries with local language support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { name: 'Nigeria', flag: '🇳🇬', active: true },
              { name: 'Kenya', flag: '🇰🇪', active: true },
              { name: 'South Africa', flag: '🇿🇦', active: true },
              { name: 'Ghana', flag: '🇬🇭', active: true },
              { name: 'Ethiopia', flag: '🇪🇹', active: true },
              { name: 'Senegal', flag: '🇸🇳', active: true },
              { name: 'Côte d\'Ivoire', flag: '🇨🇮', active: true },
              { name: 'Morocco', flag: '🇲🇦', active: true },
              { name: 'Egypt', flag: '🇪🇬', active: true },
              { name: 'Tunisia', flag: '🇹🇳', active: false },
              { name: 'Rwanda', flag: '🇷🇼', active: false },
              { name: 'Tanzania', flag: '🇹🇿', active: false },
              { name: 'Uganda', flag: '🇺🇬', active: false },
              { name: 'Zambia', flag: '🇿🇲', active: false },
              { name: 'Zimbabwe', flag: '🇿🇼', active: false },
            ].map((country) => (
              <div 
                key={country.name}
                className={`p-3 rounded-lg border text-center ${
                  country.active 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted/20 border-border/50'
                }`}
              >
                <div className="text-2xl mb-1">{country.flag}</div>
                <div className={`text-sm font-medium ${
                  country.active ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {country.name}
                </div>
                {country.active && (
                  <Badge className="mt-1 bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                    Active
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-6 p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-lg border border-primary/20">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Join the Truth Revolution</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Be part of Africa's fight against misinformation. Start verifying truth, earn rewards, and help build 
            a more informed continent.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Shield className="h-4 w-4" />
            Start Verifying Truth
          </Button>
          <Button variant="outline" className="gap-2">
            <Heart className="h-4 w-4" />
            Join Community
          </Button>
        </div>
      </div>
    </div>
  );
}