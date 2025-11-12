import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Calendar, 
  Tag, 
  AlertCircle,
  Eye,
  TrendingUp
} from 'lucide-react';
import { adminService, PendingMarket } from '../../utils/adminService';
import { toast } from 'sonner';

interface MarketApprovalProps {
  userProfile?: {
    walletAddress: string;
    displayName?: string;
  };
}

const MarketApproval: React.FC<MarketApprovalProps> = ({ userProfile }) => {
  const [pendingMarkets, setPendingMarkets] = useState<PendingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<PendingMarket | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingMarketId, setProcessingMarketId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingMarkets();
  }, []);

  const loadPendingMarkets = async () => {
    try {
      setLoading(true);
      const markets = await adminService.getPendingMarkets();
      setPendingMarkets(markets);
    } catch (error) {
      console.error('Error loading pending markets:', error);
      toast.error('Failed to load pending markets');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMarket = async (market: PendingMarket) => {
    if (!userProfile?.walletAddress) {
      toast.error('Admin wallet not connected');
      return;
    }

    try {
      setProcessingMarketId(market.id);
      
      const success = await adminService.approveMarket(
        market.id,
        userProfile.walletAddress,
        'Market approved by admin review'
      );

      if (success) {
        toast.success(`Market "${market.question}" has been approved!`);
        
        // Remove from pending list
        setPendingMarkets(prev => prev.filter(m => m.id !== market.id));
      } else {
        toast.error('Failed to approve market');
      }
    } catch (error) {
      console.error('Error approving market:', error);
      toast.error('Error approving market');
    } finally {
      setProcessingMarketId(null);
    }
  };

  const handleRejectMarket = async () => {
    if (!selectedMarket || !userProfile?.walletAddress || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingMarketId(selectedMarket.id);
      
      const success = await adminService.rejectMarket(
        selectedMarket.id,
        userProfile.walletAddress,
        rejectReason
      );

      if (success) {
        toast.success(`Market "${selectedMarket.question}" has been rejected`);
        
        // Remove from pending list
        setPendingMarkets(prev => prev.filter(m => m.id !== selectedMarket.id));
        
        // Close dialog
        setShowRejectDialog(false);
        setSelectedMarket(null);
        setRejectReason('');
      } else {
        toast.error('Failed to reject market');
      }
    } catch (error) {
      console.error('Error rejecting market:', error);
      toast.error('Error rejecting market');
    } finally {
      setProcessingMarketId(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const MarketCard = ({ market }: { market: PendingMarket }) => {
    const isProcessing = processingMarketId === market.id;

    console.log('🏛️ Admin dashboard rendering market:', {
      id: market.id,
      question: market.question,
      hasImageUrl: !!market.imageUrl,
      imageUrl: market.imageUrl,
      imageUrlType: typeof market.imageUrl,
      imageUrlLength: market.imageUrl?.length
    });

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg leading-tight pr-4">
              {market.question}
            </CardTitle>
            <Badge variant="secondary" className="flex-shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Market Image */}
          {market.imageUrl && (
            <div className="relative">
              <img
                src={market.imageUrl}
                alt="Market image"
                className="w-full h-48 object-cover rounded-lg border"
                onError={(e) => {
                  // Log the failed URL and show error message
                  console.error('🖼️ Failed to load market image:', market.imageUrl);
                  const img = e.target as HTMLImageElement;
                  const container = img.parentElement;
                  if (container) {
                    container.innerHTML = `
                      <div class="w-full h-48 bg-gray-100 border border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                        <div class="text-4xl mb-2">🖼️</div>
                        <div class="text-sm">Image failed to load</div>
                        <div class="text-xs mt-1 px-2 text-center break-all">${market.imageUrl}</div>
                      </div>
                    `;
                  }
                }}
                onLoad={() => {
                  console.log('✅ Successfully loaded market image:', market.imageUrl);
                }}
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  📷 Image Attached
                </Badge>
              </div>
            </div>
          )}

          {/* Market Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Creator:</span>
              <span className="font-mono">{market.creator.slice(0, 6)}...{market.creator.slice(-4)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span>{formatDate(market.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Category:</span>
              <Badge variant="outline" className="text-xs">{market.category}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Ends:</span>
              <span>{formatDate(market.endTime)}</span>
            </div>
          </div>

          {/* Description */}
          {market.description && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description:</p>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                {market.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {market.tags.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tags:</p>
              <div className="flex flex-wrap gap-1">
                {market.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleApproveMarket(market)}
              disabled={isProcessing}
              className="flex-1"
              size="sm"
            >
              <Check className="h-4 w-4 mr-2" />
              {isProcessing ? 'Approving...' : 'Approve'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMarket(market);
                setShowRejectDialog(true);
              }}
              disabled={isProcessing}
              className="flex-1"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement market preview/details modal
                toast.info('Market preview coming soon');
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Market Approval</h2>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Market Approval</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve markets submitted by users
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {pendingMarkets.length} Pending
        </Badge>
      </div>

      {/* Markets List */}
      {pendingMarkets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no markets pending approval at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Reject Market
            </DialogTitle>
          </DialogHeader>
          
          {selectedMarket && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="font-medium text-sm">Market Question:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMarket.question}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Reason for Rejection *</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain why this market is being rejected..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedMarket(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectMarket}
              disabled={!rejectReason.trim() || processingMarketId !== null}
            >
              {processingMarketId ? 'Rejecting...' : 'Reject Market'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketApproval;