import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Shield, Scale, Users, Globe, AlertTriangle, CheckCircle, FileText, Gavel } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary">Terms of Service</h1>
        <p className="text-lg text-muted-foreground">
          Legal terms governing your use of Blockcast's truth verification platform
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Effective: January 20, 2025
          </Badge>
        </div>
      </div>

      {/* Agreement */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Agreement to Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using Blockcast ("Platform"), you agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, please do not use our Platform.
          </p>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h5 className="font-semibold text-primary mb-2">Important Notice</h5>
                <p className="text-sm text-muted-foreground">
                  Blockcast is a truth verification platform designed to combat misinformation. We are not liable 
                  for third-party content, and users participate at their own risk in truth markets.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Description */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-secondary" />
            Platform Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">What Blockcast Provides</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                AI-powered fact-checking and truth verification services
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Community-driven truth assessment and voting mechanisms
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Truth prediction markets for African events and claims
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Blockchain-secured credibility and reputation systems
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Educational resources about misinformation and fact-checking
              </li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Platform Limitations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Blockcast provides tools for truth assessment but does not guarantee absolute accuracy</li>
              <li>• AI verifications should be considered alongside human judgment and additional sources</li>
              <li>• Truth markets are for informational and educational purposes</li>
              <li>• Platform availability may vary by region and is subject to local regulations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* User Responsibilities */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500" />
            User Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Account Requirements</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Provide accurate and complete registration information</li>
              <li>• Maintain the security of your account credentials</li>
              <li>• Be at least 18 years old or have legal guardian consent</li>
              <li>• Use the platform in compliance with applicable laws</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Acceptable Use</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-green-500 mb-2">✓ Encouraged Behavior</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Honest truth verification and voting</li>
                  <li>• Constructive community participation</li>
                  <li>• Accurate claim submissions</li>
                  <li>• Respectful discourse and debate</li>
                  <li>• Educational content sharing</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-red-500 mb-2">✗ Prohibited Behavior</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Spreading known misinformation</li>
                  <li>• Manipulating verification systems</li>
                  <li>• Harassment or hate speech</li>
                  <li>• Creating fake accounts</li>
                  <li>• Attempting to exploit the platform</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Truth Markets */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-500" />
            Truth Markets & Financial Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h5 className="font-semibold text-yellow-500 mb-2">Financial Risk Disclosure</h5>
                <p className="text-sm text-muted-foreground">
                  Truth markets involve financial risk. You may lose the funds you stake. Only participate 
                  with amounts you can afford to lose. Blockcast is not a financial advisor.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Market Participation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Truth markets are for educational and informational purposes</li>
              <li>• Staking requirements ensure quality participation and reduce spam</li>
              <li>• Market resolutions are based on verifiable facts and community consensus</li>
              <li>• Disputes are resolved through governance mechanisms</li>
              <li>• Payouts are automated through smart contracts</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Wallet & Payments</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• You are responsible for wallet security and private key management</li>
              <li>• Transactions on blockchain networks are irreversible</li>
              <li>• Gas fees and network costs are your responsibility</li>
              <li>• Local currency conversion rates may vary</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Intellectual Property */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-500" />
            Intellectual Property
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Blockcast Ownership</h4>
            <p className="text-sm text-muted-foreground">
              All platform technology, AI models, algorithms, design, and branding are owned by Blockcast. 
              Users are granted a limited license to use the platform for its intended purposes.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">User Content</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• You retain ownership of content you submit (claims, comments, posts)</li>
              <li>• You grant Blockcast license to use your content for platform operation</li>
              <li>• Content may be used to train AI models (anonymized where possible)</li>
              <li>• Public contributions may be shared with research partners</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Third-Party Content</h4>
            <p className="text-sm text-muted-foreground">
              News articles, sources, and external content are owned by their respective creators. 
              Blockcast analyzes this content for verification purposes under fair use provisions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Liability & Disclaimers */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-red-500" />
            Liability & Disclaimers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h5 className="font-semibold text-red-500 mb-2">Service Disclaimer</h5>
                <p className="text-sm text-muted-foreground">
                  Blockcast is provided "as is" without warranties. We do not guarantee platform availability, 
                  AI accuracy, or financial returns. Use at your own risk.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Limitation of Liability</h4>
            <p className="text-sm text-muted-foreground">
              Blockcast's liability is limited to the amount you paid to use the platform. We are not liable for:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• Financial losses in truth markets</li>
              <li>• Decisions made based on platform content</li>
              <li>• Third-party content or external links</li>
              <li>• Platform downtime or technical issues</li>
              <li>• Regulatory changes affecting service</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Indemnification</h4>
            <p className="text-sm text-muted-foreground">
              You agree to indemnify Blockcast against claims arising from your use of the platform, 
              violation of these terms, or infringement of third-party rights.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Termination */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            Account Termination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Termination by You</h4>
            <p className="text-sm text-muted-foreground">
              You may terminate your account at any time through account settings. Termination does not affect 
              completed transactions or blockchain records.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Termination by Blockcast</h4>
            <p className="text-sm text-muted-foreground">
              We may suspend or terminate accounts for:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• Violation of these Terms of Service</li>
              <li>• Fraudulent or malicious activity</li>
              <li>• Compromise of platform security</li>
              <li>• Legal or regulatory requirements</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Governing Law */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Governing Law & Disputes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Governing Law</h4>
              <p className="text-sm text-muted-foreground">
                These Terms are governed by Nigerian law and applicable African Union regulations 
                where Blockcast operates.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Dispute Resolution</h4>
              <p className="text-sm text-muted-foreground">
                Disputes are resolved through binding arbitration in Lagos, Nigeria, with appeals 
                to appropriate African courts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Legal Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> legal@blockcast.africa</p>
              <p><strong>Address:</strong> Blockcast Legal, Lagos, Nigeria</p>
              <p><strong>Response:</strong> 5-7 business days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Terms Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We may update these Terms with 30 days notice. Continued use indicates acceptance. 
              Material changes require explicit consent.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Version Info */}
      <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-2">Terms Version</h3>
        <div className="flex items-center justify-center gap-4">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Version 2.1
          </Badge>
          <Badge className="bg-secondary/20 text-secondary border-secondary/30">
            African Compliance Ready
          </Badge>
        </div>
      </div>
    </div>
  );
}