import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Copy, Check, Share2, MessageCircle, Twitter, Facebook, QrCode, Zap } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: {
    id: string;
    claim: string;
    category: string;
    yesOdds: number;
    noOdds: number;
    totalPool: number;
    imageUrl?: string;
  } | null;
}

export default function ShareModal({ isOpen, onClose, market }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  
  // Don't render if market is null
  if (!market) {
    return null;
  }
  
  const shareUrl = `https://blockcast.app/market/${market.id}?ref=user123`;
  const shareText = `🎯 Check out this prediction market on Blockcast!\n\n"${market.claim}"\n\nYES: ${market.yesOdds}x | NO: ${market.noOdds}x\nTotal Pool: $${(market.totalPool / 1000).toFixed(0)}K\n\nJoin me and let's see who predicts better! 🚀`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = (platform: string) => {
    setSelectedPlatform(platform);
    
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    
    let shareLink = '';
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      default:
        return;
    }
    
    window.open(shareLink, '_blank', 'width=600,height=400');
    setTimeout(() => setSelectedPlatform(null), 1000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blockcast Prediction Market',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Market
          </DialogTitle>
          <DialogDescription>
            Invite friends to bet on this market and earn rewards together
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Market Preview */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">
              {market.category}
            </Badge>
            <h3 className="font-semibold mb-3 line-clamp-2 text-sm">
              {market.claim}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-primary/10 rounded">
                <div className="text-sm font-semibold text-primary">YES</div>
                <div className="text-xs text-muted-foreground">{market.yesOdds}x</div>
              </div>
              <div className="text-center p-2 bg-secondary/10 rounded">
                <div className="text-sm font-semibold text-secondary">NO</div>
                <div className="text-xs text-muted-foreground">{market.noOdds}x</div>
              </div>
            </div>
          </div>

          {/* Reward Banner */}
          <div className="p-3 bg-gradient-to-r from-green-400/10 to-primary/10 rounded-lg border border-green-400/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Referral Bonus</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Earn 2 HBAR when your friend places their first bet!
            </p>
          </div>

          {/* Share Link */}
          <div>
            <label className="text-sm font-medium mb-2 block">Share Link</label>
            <div className="flex gap-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="bg-muted text-muted-foreground text-xs" 
              />
              <Button 
                onClick={handleCopyLink} 
                variant="outline" 
                size="sm"
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Social Platforms */}
          <div>
            <label className="text-sm font-medium mb-3 block">Share on Social Media</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleShare('twitter')}
                className="gap-2 relative"
                disabled={selectedPlatform === 'twitter'}
              >
                <Twitter className="h-4 w-4" />
                Twitter
                {selectedPlatform === 'twitter' && (
                  <div className="absolute inset-0 bg-primary/20 rounded animate-pulse" />
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleShare('facebook')}
                className="gap-2 relative"
                disabled={selectedPlatform === 'facebook'}
              >
                <Facebook className="h-4 w-4" />
                Facebook
                {selectedPlatform === 'facebook' && (
                  <div className="absolute inset-0 bg-primary/20 rounded animate-pulse" />
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleShare('whatsapp')}
                className="gap-2 relative"
                disabled={selectedPlatform === 'whatsapp'}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
                {selectedPlatform === 'whatsapp' && (
                  <div className="absolute inset-0 bg-primary/20 rounded animate-pulse" />
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleShare('telegram')}
                className="gap-2 relative"
                disabled={selectedPlatform === 'telegram'}
              >
                <QrCode className="h-4 w-4" />
                Telegram
                {selectedPlatform === 'telegram' && (
                  <div className="absolute inset-0 bg-primary/20 rounded animate-pulse" />
                )}
              </Button>
            </div>
          </div>

          {/* Native Share / Quick Actions */}
          <div className="flex gap-3">
            <Button onClick={handleNativeShare} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}