import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Tag, TrendingUp, TrendingDown, AlertCircle, Loader2, CheckCircle2, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';
import { betNFTService, NFTMetadata } from '../../utils/betNFTService';

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFTMetadata;
  marketClaim?: string;
  marketCategory?: string;
  currentMarketPrice?: number; // Current price to buy same position directly (in HBAR)
  onSuccess?: () => void;
}

export default function ListNFTModal({
  isOpen,
  onClose,
  nft,
  marketClaim,
  marketCategory,
  currentMarketPrice,
  onSuccess
}: ListNFTModalProps) {
  const [listingPrice, setListingPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingMarket, setIsCheckingMarket] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean | null>(null);

  // Check if market is open when modal opens
  useEffect(() => {
    if (isOpen && nft.market) {
      checkMarketStatus();
    }
  }, [isOpen, nft.market]);

  const checkMarketStatus = async () => {
    setIsCheckingMarket(true);
    try {
      const marketOpen = await betNFTService.isMarketOpen(nft.market);
      setIsMarketOpen(marketOpen);

      if (!marketOpen) {
        toast.error('This market is no longer open. You cannot list NFTs from closed markets.');
      }
    } catch (error) {
      console.error('Failed to check market status:', error);
      setIsMarketOpen(false);
    } finally {
      setIsCheckingMarket(false);
    }
  };

  const handleSubmit = async () => {
    const price = parseFloat(listingPrice);

    // Validation
    if (!listingPrice.trim() || isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price in HBAR');
      return;
    }

    if (price < 0.001) {
      toast.error('Minimum listing price is 0.001 HBAR');
      return;
    }

    if (!isMarketOpen) {
      toast.error('Cannot list NFT - market is no longer open');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await betNFTService.listNFTForSale(nft.tokenId, listingPrice);

      if (result.success) {
        toast.success(
          `✅ NFT #${nft.tokenId} listed successfully for ${listingPrice} HBAR!\n\n` +
          `Transaction: ${result.txHash?.slice(0, 10)}...${result.txHash?.slice(-8)}`
        );

        // Close modal and trigger refresh
        onClose();
        onSuccess?.();
      } else {
        toast.error(`Failed to list NFT: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error listing NFT:', error);
      toast.error(`Failed to list NFT: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPositionBadge = () => {
    return nft.isYes ?
      <Badge className="bg-primary/20 text-primary border-primary/30">YES (TRUE)</Badge> :
      <Badge className="bg-secondary/20 text-secondary border-secondary/30">NO (FALSE)</Badge>;
  };

  const getPriceComparison = () => {
    if (!currentMarketPrice || !listingPrice) return null;

    const price = parseFloat(listingPrice);
    const difference = price - currentMarketPrice;
    const percentDiff = (difference / currentMarketPrice) * 100;

    if (difference < 0) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">
            {Math.abs(percentDiff).toFixed(1)}% cheaper than direct buying ({Math.abs(difference).toFixed(3)} HBAR discount)
          </span>
        </div>
      );
    } else if (difference > 0) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">
            {percentDiff.toFixed(1)}% premium over direct buying (+{difference.toFixed(3)} HBAR)
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">
            Same price as direct buying
          </span>
        </div>
      );
    }
  };

  const getSuggestedPrice = () => {
    if (!currentMarketPrice) return null;

    // Suggest a slight discount to attract buyers
    return (currentMarketPrice * 0.95).toFixed(3);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            List NFT for Sale
          </DialogTitle>
          <DialogDescription>
            Set your listing price in HBAR. Your NFT will be visible to all marketplace users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Market Status Check */}
          {isCheckingMarket && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Checking if market is open...
              </AlertDescription>
            </Alert>
          )}

          {!isCheckingMarket && isMarketOpen === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This market is no longer open. You cannot list NFTs from closed markets.
              </AlertDescription>
            </Alert>
          )}

          {/* NFT Details */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">NFT Token ID</span>
              <Badge variant="outline" className="gap-1">
                <Tag className="h-3 w-3" />
                #{nft.tokenId}
              </Badge>
            </div>

            <div>
              <span className="text-sm font-medium text-muted-foreground">Market</span>
              <p className="text-sm font-semibold mt-1">{marketClaim || 'Unknown Market'}</p>
              {marketCategory && (
                <Badge variant="outline" className="text-xs mt-1">
                  {marketCategory}
                </Badge>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Position:</span>
                <div className="mt-1">{getPositionBadge()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Shares:</span>
                <div className="font-semibold mt-1">{parseFloat(nft.shares).toFixed(3)}</div>
              </div>
            </div>
          </div>

          {/* Listing Price Input */}
          <div className="space-y-2">
            <Label htmlFor="listingPrice" className="flex items-center justify-between">
              <span>Listing Price (HBAR)</span>
              {getSuggestedPrice() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setListingPrice(getSuggestedPrice() || '')}
                >
                  Use suggested: {getSuggestedPrice()} HBAR
                </Button>
              )}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="listingPrice"
                type="number"
                placeholder="0.000"
                step="0.001"
                min="0.001"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                className="pl-10"
                disabled={!isMarketOpen || isCheckingMarket}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: 0.001 HBAR | You will receive payment in HBAR when sold
            </p>
          </div>

          {/* Price Comparison */}
          {currentMarketPrice && listingPrice && (
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Direct Buy Price:</span>
                <span className="font-semibold">{currentMarketPrice.toFixed(3)} HBAR</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your List Price:</span>
                <span className="font-semibold">{parseFloat(listingPrice).toFixed(3)} HBAR</span>
              </div>
              <Separator />
              {getPriceComparison()}
            </div>
          )}

          {/* Listing Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Important:</strong> Once listed, your NFT can be purchased by anyone.
              You can cancel the listing anytime before it's sold. Transaction fees apply (~0.05 HBAR).
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isMarketOpen || isCheckingMarket || !listingPrice}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Listing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                List NFT for Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
