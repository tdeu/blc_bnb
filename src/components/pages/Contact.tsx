import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Mail, MessageCircle, MapPin, Phone, Clock, Send, Twitter, Globe, Shield, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setFormData({ name: '', email: '', subject: '', message: '', type: 'general' });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary">Contact Blockcast</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get in touch with our team for support, partnerships, or questions about truth verification across Africa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-6 w-6 text-primary" />
                Send us a Message
              </CardTitle>
              <CardDescription>
                We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Inquiry Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="media">Media & Press</option>
                    <option value="verification">Truth Verification</option>
                    <option value="community">Community Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Brief description of your inquiry"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">hello@blockcast.africa</p>
                  <p className="text-sm text-muted-foreground">support@blockcast.africa</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-secondary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Community</p>
                  <p className="text-sm text-muted-foreground">Discord: blockcast-africa</p>
                  <p className="text-sm text-muted-foreground">Telegram: @blockcast_truth</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Response Time</p>
                  <p className="text-sm text-muted-foreground">24 hours average</p>
                  <p className="text-sm text-muted-foreground">Mon-Fri: 9AM-6PM WAT</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Headquarters</p>
                  <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
                  <p className="text-sm text-muted-foreground">Serving all of Africa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Globe className="h-4 w-4" />
                Visit Truth Markets
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Join Community
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="h-4 w-4" />
                Start Verifying
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <MessageCircle className="h-4 w-4" />
                Read Documentation
              </Button>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Follow Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Common questions about Blockcast and truth verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">How does truth verification work?</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes claims against multiple sources while the community votes on truthfulness, 
                  creating a comprehensive verification system.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Is Blockcast free to use?</h4>
                <p className="text-sm text-muted-foreground">
                  Basic truth verification is free. Truth markets and advanced features require small stakes 
                  to ensure quality participation.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">How do I become a trusted verifier?</h4>
                <p className="text-sm text-muted-foreground">
                  Consistently provide accurate truth assessments, participate in community discussions, 
                  and maintain high credibility scores.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Which countries does Blockcast cover?</h4>
                <p className="text-sm text-muted-foreground">
                  We currently operate in 15+ African countries with plans to expand across the entire continent.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">How do I report misinformation?</h4>
                <p className="text-sm text-muted-foreground">
                  Use our verification tool to submit suspicious claims. Our AI and community will assess 
                  and provide truth ratings.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Can I integrate Blockcast API?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes! We offer API access for media organizations, fact-checkers, and developers. 
                  Contact us for partnership details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Emergency Contact */}
      <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Urgent Misinformation Alert?</h3>
          <p className="text-muted-foreground">
            If you've identified dangerous misinformation that requires immediate attention, 
            contact our emergency response team.
          </p>
          <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Shield className="h-4 w-4" />
            Report Emergency
          </Button>
        </div>
      </div>
    </div>
  );
}