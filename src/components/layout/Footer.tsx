import { Globe, Twitter, MessageCircle, Mail, Shield, FileText, Users, Zap, Search, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
// Logo placeholder - replace with actual image when available

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const handleLinkClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="container mx-auto px-4 py-12 max-w-7xl lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src="/blockcast-logo.png" 
                alt="Blockcast Logo" 
                className="w-8 h-8 rounded-lg object-contain"
              />
              <div>
                <h3 className="text-lg font-bold text-primary">Blockcast</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Africa's first AI-powered truth verification platform. Combating misinformation through collective intelligence and blockchain-secured credibility across the continent.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="p-2">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Truth Platform - Combined Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Truth Platform</h4>
            <div className="space-y-2">
              {[
                { label: 'Truth Markets', icon: Globe, page: 'markets' },
                { label: 'Fact Verification', icon: Shield, page: 'verify' },
                { label: 'Community Truth', icon: Users, page: 'community' }
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  onClick={() => handleLinkClick(item.page)}
                  className="w-full justify-start gap-2 h-auto p-2 text-muted-foreground hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Support & Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Support & Legal</h4>
            <div className="space-y-2">
              {[
                { label: 'About Blockcast', page: 'about' },
                { label: 'Contact Us', page: 'contact' },
                { label: 'Privacy Policy', page: 'privacy' },
                { label: 'Terms of Service', page: 'terms' },
                { label: 'Help Center', page: 'contact' }
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  onClick={() => handleLinkClick(item.page)}
                  className="w-full justify-start h-auto p-2 text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col lg:flex-row items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 Blockcast. Fighting misinformation through truth.</p>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => handleLinkClick('privacy')}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                Privacy Policy
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => handleLinkClick('terms')}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                Terms of Service
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => handleLinkClick('contact')}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                Contact
              </Button>
            </div>
          </div>

          {/* Truth Status Indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Truth Engine: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">AI Verification: Live</span>
            </div>
          </div>
        </div>

        {/* Truth Mission Notice */}
        <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="h-3 w-3 text-primary-foreground" />
            </div>
            <div>
              <h5 className="font-semibold text-primary mb-1">Truth Verification Mission</h5>
              <p className="text-sm text-muted-foreground">
                Blockcast is dedicated to combating misinformation across Africa through collective truth verification. Join the movement for authentic news and credible information. 
                <Button 
                  variant="ghost" 
                  onClick={() => handleLinkClick('verify')}
                  className="h-auto p-0 ml-1 text-primary hover:text-primary/80"
                >
                  Verify truth today →
                </Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}