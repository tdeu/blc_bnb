import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, CreditCard } from 'lucide-react';

interface BuyCastButtonProps {
  onBalanceUpdate?: () => void;
  className?: string;
  hederaService: any; // HederaEVMService instance
  isConnected: boolean;
  walletAddress?: string;
}

export const BuyCastButton: React.FC<BuyCastButtonProps> = ({
  onBalanceUpdate,
  className = '',
  hederaService,
  isConnected,
  walletAddress
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hbarAmount, setHbarAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyCast = async () => {
    if (!hederaService || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(hbarAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.1) {
      toast.error('Minimum purchase amount is 0.1 HBAR');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🏭 Buying ${amount} HBAR worth of CAST tokens...`);

      // Use mock implementation for now (will automatically fallback to real when contract is deployed)
      const txHash = await hederaService.buyCastWithHbar(amount);

      toast.success(
        `Successfully bought ${amount} CAST tokens! Transaction: ${txHash.slice(0, 8)}...`,
        {
          duration: 5000,
          description: 'Your CAST balance will update shortly'
        }
      );

      // Reset form and close dialog
      setHbarAmount('');
      setIsOpen(false);

      // Trigger balance refresh with delay to allow blockchain update
      if (onBalanceUpdate) {
        // Immediate refresh
        setTimeout(onBalanceUpdate, 1000);
        // Second refresh after longer delay
        setTimeout(onBalanceUpdate, 5000);
      }

    } catch (error: any) {
      console.error('Failed to buy CAST:', error);

      // Show more specific error messages
      if (error.message.includes('Insufficient HBAR')) {
        toast.error(`Insufficient HBAR balance. ${error.message}`);
      } else if (error.message.includes('not authorized') || error.message.includes('contact an administrator')) {
        toast.error(
          'Wallet not authorized for test minting',
          {
            duration: 10000,
            description: 'Your wallet needs to be authorized by an admin to mint test CAST tokens. This is normal - in production, you would buy CAST with HBAR through the BuyCAST contract.',
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged')
            }
          }
        );
      } else {
        toast.error(`Failed to buy CAST tokens: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setHbarAmount(value);
    }
  };

  if (!isConnected) {
    return null; // Don't show button if wallet not connected
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
            Buy CAST Tokens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hbar-amount" className="text-sm font-medium">
              HBAR Amount
            </Label>
            <Input
              id="hbar-amount"
              type="text"
              value={hbarAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter HBAR amount (e.g. 10)"
              className="w-full"
              min="0.1"
              step="0.1"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: 0.1 HBAR
            </p>
          </div>

          {/* Exchange Rate Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Exchange Rate</span>
              <span className="text-sm font-bold text-blue-600">1 HBAR = 1 CAST</span>
            </div>
            {hbarAmount && parseFloat(hbarAmount) > 0 && (
              <div className="text-sm text-blue-700">
                You will receive: <strong>{parseFloat(hbarAmount).toFixed(2)} CAST tokens</strong>
              </div>
            )}
          </div>

          {/* Production Notice */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <div className="text-green-600 mt-0.5">✅</div>
              <div>
                <p className="text-sm font-medium text-green-800">Production Contract</p>
                <p className="text-xs text-green-700 mt-1">
                  Using the deployed BuyCAST contract. This is a real transaction that spends HBAR and mints CAST tokens.
                  No authorization required - any user with HBAR can purchase CAST tokens.
                </p>
                <p className="text-xs text-green-600 mt-2 font-medium">
                  Contract: 0x39C7E682f...620f55
                </p>
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
              disabled={isLoading || !hbarAmount || parseFloat(hbarAmount) <= 0 || parseFloat(hbarAmount) < 0.1}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Buy ${parseFloat(hbarAmount) || 0} CAST`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCastButton;