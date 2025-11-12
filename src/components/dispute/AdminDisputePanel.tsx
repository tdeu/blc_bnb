import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  MessageSquare, 
  User,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  Gavel,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { MarketDispute } from '../../utils/supabase';
import { BettingMarket } from '../betting/BettingMarkets';
import { toast } from 'sonner@2.0.3';

interface AdminDisputePanelProps {
  disputes: MarketDispute[];
  onReviewDispute: (disputeId: string, decision: DisputeDecision) => Promise<void>;
  showHCSHistory?: boolean;
  showBondTransactions?: boolean;
  enableContractArbitration?: boolean;
  isLoading?: boolean;
}

export interface DisputeDecision {
  action: 'accept' | 'reject';
  adminResponse: string;
  adminAccount: string;
}

interface DisputeReviewModalProps {
  dispute: MarketDispute | null;
  market?: BettingMarket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (decision: DisputeDecision) => Promise<void>;
  showBondTransaction?: boolean;
  showHCSMessage?: boolean;
  isSubmitting?: boolean;
}

function DisputeReviewModal({
  dispute,
  market,
  isOpen,
  onClose,
  onSubmit,
  showBondTransaction = true,
  showHCSMessage = true,
  isSubmitting = false
}: DisputeReviewModalProps) {
  const [decision, setDecision] = useState<'accept' | 'reject' | null>(null);
  const [adminResponse, setAdminResponse] = useState('');

  const handleSubmit = async () => {
    if (!decision) {
      toast.error('Please select accept or reject');
      return;
    }

    if (!adminResponse.trim()) {
      toast.error('Please provide an admin response');
      return;
    }

    if (adminResponse.length < 10) {
      toast.error('Admin response must be at least 10 characters');
      return;
    }

    try {
      await onSubmit({
        action: decision,
        adminResponse,
        adminAccount: 'current-admin' // This would be the actual admin account
      });
      
      // Reset form
      setDecision(null);
      setAdminResponse('');
      onClose();
      toast.success(`Dispute ${decision}ed successfully`);
    } catch (error) {
      console.error('Error reviewing dispute:', error);
      toast.error('Failed to review dispute. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisputeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      evidence: 'Incorrect Evidence',
      interpretation: 'Wrong Interpretation',
      api_error: 'API/Technical Error'
    };
    return labels[type] || type;
  };

  if (!dispute) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-500" />
            Review Dispute
          </DialogTitle>
          <DialogDescription>
            Carefully review this dispute and make a decision
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dispute Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispute Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Dispute Type:</span>
                  <div className="font-medium">{getDisputeTypeLabel(dispute.dispute_reason.includes('evidence') ? 'evidence' : dispute.dispute_reason.includes('interpretation') ? 'interpretation' : 'api_error')}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Submitted:</span>
                  <div className="font-medium">{formatDate(dispute.created_at)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">User ID:</span>
                  <div className="font-mono text-sm">{dispute.user_id}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Bond Amount:</span>
                  <div className="font-medium">{dispute.bond_amount || 0} BCDB</div>
                </div>
              </div>

              {/* Market Information */}
              {market && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Market Claim:</span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{market.claim}</p>
                </div>
              )}

              {/* Dispute Reason */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Dispute Reason:</span>
                <p className="text-sm bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                  {dispute.dispute_reason}
                </p>
              </div>

              {/* Evidence */}
              {(dispute.evidence_url || dispute.evidence_description) && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Supporting Evidence:</span>
                  <div className="space-y-2">
                    {dispute.evidence_url && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs">URL:</span>
                        <a 
                          href={dispute.evidence_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          {dispute.evidence_url.slice(0, 50)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {dispute.evidence_description && (
                      <p className="text-sm bg-blue-50 p-3 rounded-lg">
                        {dispute.evidence_description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockchain Information */}
          {(showBondTransaction && dispute.bond_transaction_id) || (showHCSMessage && dispute.hcs_message_id) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Blockchain Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {showBondTransaction && dispute.bond_transaction_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bond Transaction:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {dispute.bond_transaction_id.slice(0, 8)}...{dispute.bond_transaction_id.slice(-8)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`https://hashscan.io/testnet/transaction/${dispute.bond_transaction_id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {showHCSMessage && dispute.hcs_message_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">HCS Message:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {dispute.hcs_message_id.slice(0, 8)}...{dispute.hcs_message_id.slice(-8)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`https://hashscan.io/testnet/transaction/${dispute.hcs_message_id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Decision Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Decision</CardTitle>
              <CardDescription>
                Choose whether to accept or reject this dispute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={decision === 'accept' ? 'default' : 'outline'}
                  onClick={() => setDecision('accept')}
                  className={decision === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Dispute
                </Button>
                <Button
                  variant={decision === 'reject' ? 'default' : 'outline'}
                  onClick={() => setDecision('reject')}
                  className={decision === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Dispute
                </Button>
              </div>

              <div>
                <label htmlFor="adminResponse" className="text-sm font-medium">
                  Admin Response *
                </label>
                <Textarea
                  id="adminResponse"
                  placeholder="Provide a detailed explanation of your decision. This will be visible to the user and recorded on the blockchain."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="min-h-[100px] mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {adminResponse.length}/10 minimum characters
                </div>
              </div>

              {decision && (
                <div className={`p-3 rounded-lg border-l-4 ${
                  decision === 'accept' 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-red-50 border-red-500'
                }`}>
                  <div className="text-sm font-medium mb-1">
                    {decision === 'accept' ? 'Accepting Dispute' : 'Rejecting Dispute'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {decision === 'accept' 
                      ? `• User will receive full bond refund (${dispute.bond_amount || 0} BCDB)\n• Market resolution will be flagged for review\n• User reputation score will increase`
                      : `• User will receive 50% bond refund (${Math.floor((dispute.bond_amount || 0) / 2)} BCDB)\n• 50% of bond will be slashed\n• User reputation score may decrease`
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!decision || !adminResponse.trim() || adminResponse.length < 10 || isSubmitting}
            className={decision === 'accept' ? 'bg-green-600 hover:bg-green-700' : decision === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4 mr-2" />
                {decision === 'accept' ? 'Accept Dispute' : decision === 'reject' ? 'Reject Dispute' : 'Make Decision'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDisputePanel({
  disputes,
  onReviewDispute,
  showHCSHistory = true,
  showBondTransactions = true,
  enableContractArbitration = false,
  isLoading = false
}: AdminDisputePanelProps) {
  const [selectedDispute, setSelectedDispute] = useState<MarketDispute | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingDispute, setReviewingDispute] = useState<string | null>(null);

  const handleReviewClick = (dispute: MarketDispute) => {
    setSelectedDispute(dispute);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (decision: DisputeDecision) => {
    if (!selectedDispute) return;
    
    setReviewingDispute(selectedDispute.id);
    try {
      await onReviewDispute(selectedDispute.id, decision);
    } finally {
      setReviewingDispute(null);
      setShowReviewModal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      contract_processing: 'bg-purple-100 text-purple-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const pendingDisputes = disputes.filter(d => d.status === 'pending');
  const reviewedDisputes = disputes.filter(d => d.status !== 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading disputes...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingDisputes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{disputes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{disputes.filter(d => d.status === 'accepted').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{disputes.filter(d => d.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Disputes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Pending Disputes ({pendingDisputes.length})
          </CardTitle>
          <CardDescription>
            Disputes awaiting admin review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDisputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No pending disputes
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDisputes.map((dispute) => (
                <Card key={dispute.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Market: {dispute.market_id.slice(0, 8)}...
                          </Badge>
                          {getStatusBadge(dispute.status)}
                          {dispute.bond_amount && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {dispute.bond_amount} BCDB
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {dispute.dispute_reason}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {dispute.user_id.slice(0, 6)}...{dispute.user_id.slice(-4)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(dispute.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReviewClick(dispute)}
                          disabled={reviewingDispute === dispute.id}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <DisputeReviewModal
        dispute={selectedDispute}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmit}
        showBondTransaction={showBondTransactions}
        showHCSMessage={showHCSHistory}
        isSubmitting={reviewingDispute === selectedDispute?.id}
      />

      {/* Reviewed Disputes - Collapsed by default */}
      {reviewedDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Reviewed Disputes ({reviewedDisputes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reviewedDisputes.slice(0, 10).map((dispute) => (
                <div key={dispute.id} className="flex items-center justify-between py-2 border-b border-muted">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {dispute.market_id.slice(0, 8)}...
                    </Badge>
                    {getStatusBadge(dispute.status)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(dispute.updated_at)}
                  </span>
                </div>
              ))}
              {reviewedDisputes.length > 10 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  ... and {reviewedDisputes.length - 10} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}