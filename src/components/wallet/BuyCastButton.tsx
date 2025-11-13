import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { buyCastService } from '../../services/buyCastService';

interface BuyCastButtonProps {
  onBalanceUpdate?: () => void;
  className?: string;
  isConnected: boolean;
  walletAddress?: string;
}

export const BuyCastButton: React.FC<BuyCastButtonProps> = ({
  onBalanceUpdate,
  className = '',
  isConnected,
  walletAddress
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bnbAmount, setBnbAmount] = useState('');
  const [castAmount, setCastAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [minPurchase, setMinPurchase] = useState('0.001');
  const [maxPurchase, setMaxPurchase] = useState('100');

  // Initialize service when dialog opens
  useEffect(() => {
    if (isOpen && isConnected && !isInitialized) {
      initializeService();
    }
  }, [isOpen, isConnected, isInitialized]);

  // Calculate CAST amount when BNB amount changes
  useEffect(() => {
    if (bnbAmount && parseFloat(bnbAmount) > 0 && isInitialized) {
      calculateCastAmount();
    } else {
      setCastAmount('0');
    }
  }, [bnbAmount, isInitialized]);

  const initializeService = async () => {
    console.log('🔧 Initializing BuyCAST service...');
    try {
      await buyCastService.initialize();
      console.log('✅ Service initialized successfully');

      // Get contract info
      const info = await buyCastService.getContractInfo();
      console.log('📋 Raw contract info:', {
        isPaused: info.isPaused,
        minPurchase: info.minPurchase.toString(),
        maxPurchase: info.maxPurchase.toString(),
        exchangeRate: info.exchangeRate.toString()
      });

      setIsPaused(info.isPaused);

      // Convert from wei to ether for display and comparison
      const { ethers } = await import('ethers');
      const minBnb = ethers.formatEther(info.minPurchase);
      const maxBnb = ethers.formatEther(info.maxPurchase);

      console.log('🔄 Converted values:', {
        minBnb,
        maxBnb,
        minBnbFloat: parseFloat(minBnb),
        maxBnbFloat: parseFloat(maxBnb)
      });

      setMinPurchase(minBnb);
      setMaxPurchase(maxBnb);

      console.log('✅ BuyCAST initialized successfully:', {
        isPaused: info.isPaused,
        minPurchase: minBnb,
        maxPurchase: maxBnb,
        exchangeRate: info.exchangeRate.toString()
      });

      setIsInitialized(true);
    } catch (error: any) {
      console.error('❌ Failed to initialize BuyCast service:', error);
      toast.error('Failed to connect to BuyCAST contract');
    }
  };

  const calculateCastAmount = async () => {
    try {
      console.log(`💰 Calculating CAST amount for ${bnbAmount} BNB...`);
      const amount = await buyCastService.calculateCastAmount(bnbAmount);
      const castFormatted = parseFloat(amount).toFixed(2);
      console.log(`✅ Calculated: ${castFormatted} CAST`);
      setCastAmount(castFormatted);
    } catch (error) {
      console.error('❌ Failed to calculate CAST amount:', error);
      setCastAmount('0');
    }
  };

  const handleBuyCast = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(bnbAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const minBnb = parseFloat(minPurchase);
    if (amount < minBnb) {
      toast.error(`Minimum purchase amount is ${minBnb} BNB`);
      return;
    }

    const maxBnb = parseFloat(maxPurchase);
    if (amount > maxBnb) {
      toast.error(`Maximum purchase amount is ${maxBnb} BNB`);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🏭 Buying ${amount} BNB worth of CAST tokens...`);

      const result = await buyCastService.purchaseCast(bnbAmount);

      if (result.success && result.txHash) {
        const bscscanLink = buyCastService.getTxBSCScanLink(result.txHash);

        toast.success(
          `Successfully purchased ${result.castAmount} CAST tokens!`,
          {
            duration: 8000,
            description: 'Your CAST balance will update shortly',
            action: {
              label: 'View on BSCScan',
              onClick: () => window.open(bscscanLink, '_blank')
            }
          }
        );

        // Reset form and close dialog
        setBnbAmount('');
        setCastAmount('0');
        setIsOpen(false);

        // Trigger balance refresh with delay to allow blockchain update
        if (onBalanceUpdate) {
          setTimeout(onBalanceUpdate, 2000);
          setTimeout(onBalanceUpdate, 5000);
        }
      } else {
        toast.error(result.error || 'Failed to purchase CAST tokens');
      }

    } catch (error: any) {
      console.error('Failed to buy CAST:', error);
      toast.error(`Failed to buy CAST tokens: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBnbAmount(value);
    }
  };

  if (!isConnected) {
    return null; // Don't show button if wallet not connected
  }

  // Debug: Calculate button disabled state with detailed logging
  const bnbFloat = parseFloat(bnbAmount);
  const minFloat = parseFloat(minPurchase);
  const maxFloat = parseFloat(maxPurchase);

  const disabledReasons = {
    isLoading,
    isPaused,
    noBnbAmount: !bnbAmount,
    bnbAmountZero: bnbFloat <= 0,
    belowMin: bnbFloat < minFloat,
    aboveMax: bnbFloat > maxFloat,
    notInitialized: !isInitialized
  };

  const buttonDisabled = isLoading ||
    isPaused ||
    !bnbAmount ||
    bnbFloat <= 0 ||
    bnbFloat < minFloat ||
    bnbFloat > maxFloat;

  // Log whenever dialog is open
  if (isOpen) {
    console.log('🔍 Button state check:', {
      isInitialized,
      bnbAmount,
      castAmount,
      minPurchase,
      maxPurchase,
      bnbFloat,
      minFloat,
      maxFloat,
      disabledReasons,
      buttonDisabled
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1 px-2 py-1 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 ${className}`}
          disabled={isLoading}
        >
          <CreditCard className="h-3 w-3" />
          Buy CAST
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Buy CAST Tokens with BNB
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Paused Warning */}
          {isPaused && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">
                ⚠️ Purchase temporarily unavailable
              </p>
              <p className="text-xs text-red-700 mt-1">
                The BuyCAST contract is currently paused. Please try again later.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bnb-amount" className="text-sm font-medium">
              BNB Amount
            </Label>
            <Input
              id="bnb-amount"
              type="text"
              value={bnbAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter BNB amount (e.g. 0.1)"
              className="w-full"
              disabled={isLoading || isPaused}
            />
            <p className="text-xs text-muted-foreground">
              Min: {minPurchase} BNB • Max: {maxPurchase} BNB
            </p>
          </div>

          {/* Exchange Rate Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Exchange Rate</span>
              <span className="text-sm font-bold text-blue-600">1 BNB = 1000 CAST</span>
            </div>
            {bnbAmount && parseFloat(bnbAmount) > 0 && (
              <div className="text-sm text-blue-700">
                You will receive: <strong>{castAmount} CAST tokens</strong>
              </div>
            )}
          </div>

          {/* Contract Info */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <div className="text-green-600 mt-0.5">✅</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Live on BSC Testnet</p>
                <p className="text-xs text-green-700 mt-1">
                  Using deployed BuyCAST contract. BNB automatically forwarded to Treasury.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-green-600 font-mono">
                    {buyCastService.getContractAddress().slice(0, 10)}...
                  </p>
                  <button
                    onClick={() => window.open(buyCastService.getBSCScanLink(), '_blank')}
                    className="text-green-600 hover:text-green-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuyCast}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={buttonDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Buy ${castAmount} CAST`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCastButton;
