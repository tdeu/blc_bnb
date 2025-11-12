import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Shield, Eye, Lock, Users, Globe, Database, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
        <p className="text-lg text-muted-foreground">
          How Blockcast protects your privacy while fighting misinformation across Africa
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Last Updated: January 20, 2025
          </Badge>
        </div>
      </div>

      {/* Privacy Principles */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Our Privacy Principles
          </CardTitle>
          <CardDescription>
            Blockcast is committed to protecting your privacy while enabling truth verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Data Minimization</h4>
                  <p className="text-sm text-muted-foreground">
                    We collect only the data necessary for truth verification and platform functionality.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Transparency</h4>
                  <p className="text-sm text-muted-foreground">
                    You always know what data we collect, how it's used, and can access or delete it anytime.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">User Control</h4>
                  <p className="text-sm text-muted-foreground">
                    You control your privacy settings and can opt out of data collection at any time.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Secure Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    All data is encrypted and stored securely with blockchain verification for integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Collection */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6 text-secondary" />
            What Data We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Account Information</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Username and email address (required for account creation)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Country/region (for localized truth verification)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Profile information you choose to share
              </li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Verification Activity</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Claims you submit for verification
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Your truth votes and market positions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Community interactions and discussions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Credibility scores and verification history
              </li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Technical Data</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                IP address and device information (for security)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Usage patterns and feature interactions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Browser type and operating system
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How We Use Data */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-green-500" />
            How We Use Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Platform Operation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Verify your identity and prevent fraud</li>
                <li>• Enable truth verification and voting</li>
                <li>• Calculate credibility scores</li>
                <li>• Provide customer support</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">AI Improvement</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Train AI models on verification patterns</li>
                <li>• Improve fact-checking accuracy</li>
                <li>• Reduce bias in African contexts</li>
                <li>• Enhance truth detection algorithms</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h5 className="font-semibold text-primary mb-2">Data for Good</h5>
                <p className="text-sm text-muted-foreground">
                  Aggregated, anonymized data may be used for research to combat misinformation across Africa. 
                  Individual users cannot be identified from this research data.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-yellow-500" />
            Data Sharing & Third Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">We Do NOT Share</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-red-500" />
                Personal information with advertisers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-red-500" />
                Individual verification history with third parties
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-red-500" />
                Private messages or communications
              </li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Limited Sharing (With Your Consent)</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Academic researchers studying misinformation (anonymized data only)</li>
              <li>• Fact-checking organizations for collaborative verification</li>
              <li>• Government agencies for national security (only with legal warrant)</li>
              <li>• Service providers for platform operation (under strict data agreements)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Access & Download</h4>
                <p className="text-sm text-muted-foreground">
                  Request a copy of all data we have about you in a downloadable format.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Correction</h4>
                <p className="text-sm text-muted-foreground">
                  Update or correct any inaccurate personal information in your account.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Deletion</h4>
                <p className="text-sm text-muted-foreground">
                  Request deletion of your account and associated data (subject to legal requirements).
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Portability</h4>
                <p className="text-sm text-muted-foreground">
                  Export your verification history and credibility data to other platforms.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Restriction</h4>
                <p className="text-sm text-muted-foreground">
                  Limit how we process your data for specific purposes.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Objection</h4>
                <p className="text-sm text-muted-foreground">
                  Object to data processing based on legitimate interests or for marketing.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-green-500" />
            Data Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">End-to-end encryption for sensitive data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Blockchain verification for data integrity</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Regular security audits and penetration testing</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Multi-factor authentication available</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">GDPR and African data protection compliance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Incident response and breach notification</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Privacy Questions?</CardTitle>
          <CardDescription>
            Contact our Data Protection Officer for any privacy-related questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>Email:</strong> privacy@blockcast.africa
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Response Time:</strong> 48 hours for privacy requests
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Mailing Address:</strong> Blockcast Privacy Office, Lagos, Nigeria
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Updates */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Policy Updates</h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            We'll notify you of any material changes to this privacy policy via email and 
            platform notifications. Continued use after changes indicates acceptance.
          </p>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Version 2.1 - Enhanced African Data Protection
          </Badge>
        </div>
      </div>
    </div>
  );
}