import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Clock,
  Upload,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { evidenceService } from '../../services/evidenceService';
import { MarketEvidence } from '../../utils/supabase';
import { walletService } from '../../utils/walletService';

interface EvidenceSubmissionProps {
  marketId: string;
  marketClaim: string;
  evidencePeriodEnd?: string;
  onEvidenceSubmitted?: () => void;
}

export default function EvidenceSubmission({
  marketId,
  marketClaim,
  evidencePeriodEnd,
  onEvidenceSubmitted
}: EvidenceSubmissionProps) {
  const [address, setAddress] = useState<string | null>(null);

  // Get wallet address from walletService
  useEffect(() => {
    const connection = walletService.getConnection();
    if (connection?.address) {
      setAddress(connection.address);
    }
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEvidences, setExistingEvidences] = useState<MarketEvidence[]>([]);
  const [isLoadingEvidences, setIsLoadingEvidences] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [periodEnded, setPeriodEnded] = useState(false);

  // Form state
  const [evidenceType, setEvidenceType] = useState<MarketEvidence['evidence_type']>('article');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');

  // Load existing evidences
  useEffect(() => {
    const loadEvidences = async () => {
      setIsLoadingEvidences(true);
      const result = await evidenceService.getMarketEvidences(marketId);
      if (result.success && result.evidences) {
        setExistingEvidences(result.evidences);
      }
      setIsLoadingEvidences(false);
    };

    loadEvidences();
  }, [marketId]);

  // Countdown timer
  useEffect(() => {
    if (!evidencePeriodEnd) return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(evidencePeriodEnd);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Period ended');
        setPeriodEnded(true);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        setPeriodEnded(false);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [evidencePeriodEnd]);

  const getEvidencePeriodProgress = () => {
    if (!evidencePeriodEnd) return 0;

    // Assume 48h period
    const endTime = new Date(evidencePeriodEnd);
    const startTime = new Date(endTime.getTime() - 48 * 60 * 60 * 1000);
    const now = new Date();

    const total = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();

    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 50MB.');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error('Please connect your wallet to submit evidence');
      return;
    }

    if (!title.trim()) {
      toast.error('Please provide a title for your evidence');
      return;
    }

    if (!file && !textContent.trim()) {
      toast.error('Please provide either a file or text content');
      return;
    }

    if (periodEnded) {
      toast.error('Evidence collection period has ended');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await evidenceService.submitEvidence({
        marketId,
        userAddress: address,
        evidenceType,
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        file: file || undefined,
        textContent: textContent.trim() || undefined
      });

      if (result.success && result.evidence) {
        toast.success('Evidence submitted successfully and stored on IPFS!');

        // Reset form
        setTitle('');
        setDescription('');
        setSourceUrl('');
        setFile(null);
        setTextContent('');

        // Add to list
        setExistingEvidences(prev => [result.evidence!, ...prev]);

        // Notify parent
        onEvidenceSubmitted?.();
      } else {
        toast.error(result.error || 'Failed to submit evidence');
      }
    } catch (error) {
      console.error('Evidence submission error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
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

  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <ImageIcon className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'official_document':
        return <FileText className="h-4 w-4" />;
      case 'social_media':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    switch (type) {
      case 'screenshot':
        return 'Screenshot';
      case 'article':
        return 'News Article';
      case 'official_document':
        return 'Official Document';
      case 'social_media':
        return 'Social Media';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Evidence Collection Period
          </CardTitle>
          <Badge className="bg-yellow-500 text-white">
            48h Review Period
          </Badge>
        </div>
        <CardDescription>
          AI resolution requires additional verification. Submit evidence to help resolve this market.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Countdown Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Remaining
            </span>
            <span className={`text-sm font-mono ${periodEnded ? 'text-red-500' : 'text-orange-500'}`}>
              {timeRemaining}
            </span>
          </div>
          <Progress value={getEvidencePeriodProgress()} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Evidence submission will close when the period ends. Admin will then review and re-run AI analysis.
          </p>
        </div>

        <Separator />

        {/* Submit Evidence Form */}
        {!periodEnded && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold">Submit New Evidence</h3>

            <div className="space-y-2">
              <Label htmlFor="evidence-type">Evidence Type</Label>
              <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as MarketEvidence['evidence_type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screenshot">Screenshot</SelectItem>
                  <SelectItem value="article">News Article</SelectItem>
                  <SelectItem value="official_document">Official Document</SelectItem>
                  <SelectItem value="social_media">Social Media Post</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your evidence"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain how this evidence relates to the market outcome..."
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">Source URL (optional)</Label>
              <Input
                id="source-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Upload File (max 50MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="flex-1"
                />
                {file && (
                  <Badge variant="outline" className="text-xs">
                    {file.name.slice(0, 20)}...
                  </Badge>
                )}
              </div>
            </div>

            {!file && (
              <div className="space-y-2">
                <Label htmlFor="text-content">Or provide text content</Label>
                <Textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste text evidence here if not uploading a file..."
                  rows={4}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !address || periodEnded}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Evidence to IPFS
                </>
              )}
            </Button>

            {!address && (
              <p className="text-xs text-red-500 text-center">
                Connect your wallet to submit evidence
              </p>
            )}
          </form>
        )}

        {periodEnded && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Evidence Collection Period Ended</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admin will now review submitted evidences and re-run AI analysis.
            </p>
          </div>
        )}

        <Separator />

        {/* Existing Evidences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Submitted Evidences ({existingEvidences.length})
            </h3>
            {isLoadingEvidences && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {existingEvidences.length === 0 && !isLoadingEvidences && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No evidences submitted yet. Be the first to contribute!
            </p>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {existingEvidences.map((evidence) => (
              <div
                key={evidence.id}
                className="border rounded-lg p-3 space-y-2 bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getEvidenceTypeIcon(evidence.evidence_type)}
                    <span className="text-sm font-medium">{evidence.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getEvidenceTypeLabel(evidence.evidence_type)}
                  </Badge>
                </div>

                {evidence.description && (
                  <p className="text-xs text-muted-foreground">
                    {evidence.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    By: {evidence.user_address.slice(0, 6)}...{evidence.user_address.slice(-4)}
                  </span>
                  <span>{formatDate(evidence.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => window.open(evidenceService.getEvidenceUrl(evidence.ipfs_hash), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on IPFS
                  </Button>
                  {evidence.source_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(evidence.source_url!, '_blank')}
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Source
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
