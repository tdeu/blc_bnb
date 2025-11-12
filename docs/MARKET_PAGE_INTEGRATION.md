# MarketPage Integration Guide - File Upload + IPFS

This guide shows how to integrate the new FileUploadZone component and IPFS evidence service into MarketPage.tsx

## Changes Required

### 1. Add New Imports (at top of file)

```typescript
// Add these imports after existing imports
import { FileUploadZone } from '../evidence/FileUploadZone';
import { evidenceService } from '../../services/evidenceService';
```

### 2. Add File State (around line 66, after evidenceLinks state)

```typescript
// Evidence submission state
const [evidenceText, setEvidenceText] = useState('');
const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']); // KEEP THIS
const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]); // ADD THIS
const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
```

### 3. Replace handleEvidenceSubmit Function (around line 447)

**REPLACE** the entire `handleEvidenceSubmit` function with this new version:

```typescript
const handleEvidenceSubmit = async () => {
  // Validation
  if (!evidenceText.trim() && evidenceFiles.length === 0) {
    toast.error('Please provide evidence text or upload files');
    return;
  }

  if (evidenceText.trim().length < 20 && evidenceFiles.length === 0) {
    toast.error('Evidence must be at least 20 characters or include files');
    return;
  }

  if (!isWalletConnected) {
    toast.error('Please connect your MetaMask wallet first');
    return;
  }

  const connection = walletService.getConnection();
  if (!connection) {
    toast.error('Wallet connection not found. Please reconnect your wallet.');
    return;
  }

  setIsSubmittingEvidence(true);
  setSubmissionStep('validating');

  try {
    // Step 1: Validate
    setTimeout(() => setSubmissionStep('payment'), 500);

    // Step 2: Upload files to IPFS + Save to database
    setTimeout(() => setSubmissionStep('storing'), 1000);

    const result = await evidenceService.submitEvidence({
      marketId: market.id,
      evidenceText: evidenceText,
      files: evidenceFiles
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit evidence');
    }

    // Step 3: Complete
    setSubmissionStep('complete');

    toast.success(
      <div className="space-y-2">
        <p className="font-semibold">✅ Evidence submitted successfully!</p>
        {result.ipfsHashes && result.ipfsHashes.length > 0 && (
          <p className="text-sm">{result.ipfsHashes.length} file(s) uploaded to IPFS</p>
        )}
        <p className="text-xs text-muted-foreground">
          Evidence ID: {result.evidenceId}
        </p>
      </div>,
      { duration: 5000 }
    );

    // Reset form
    setEvidenceText('');
    setEvidenceFiles([]);
    setEvidenceLinks(['']);

    // Reload evidence list
    setTimeout(() => {
      setSubmissionStep('idle');
      // TODO: Refresh evidence list from database
    }, 2000);

  } catch (error: any) {
    console.error('Evidence submission error:', error);
    toast.error(error.message || 'Failed to submit evidence');
    setSubmissionStep('idle');
  } finally {
    setIsSubmittingEvidence(false);
  }
};
```

### 4. Update Evidence Form UI (around line 1038-1086)

**REPLACE** the evidence links section with FileUploadZone:

```typescript
{/* Evidence Text Input */}
<div className="space-y-2">
  <Label htmlFor="evidence-text" className="text-sm font-medium">
    Describe your evidence (minimum 20 characters)
  </Label>
  <Textarea
    id="evidence-text"
    placeholder="Explain your evidence. Be specific and cite your sources..."
    value={evidenceText}
    onChange={(e) => setEvidenceText(e.target.value)}
    className="min-h-24 resize-none"
  />
  <div className="text-xs text-muted-foreground">
    {evidenceText.length}/20 characters minimum
  </div>
</div>

{/* File Upload Zone - NEW! */}
<div className="space-y-2">
  <Label className="text-sm font-medium">
    Upload Evidence Files (Optional)
  </Label>
  <FileUploadZone
    onFilesSelected={setEvidenceFiles}
    maxFiles={5}
    maxFileSize={50}
    disabled={isSubmittingEvidence}
  />
  <p className="text-xs text-muted-foreground">
    Upload images, documents, or videos to support your claim.
    Files are stored on IPFS for permanent, decentralized access.
  </p>
</div>

{/* Submit Evidence Button */}
<div className="flex justify-end pt-2">
  <Button
    onClick={handleEvidenceSubmit}
    disabled={
      isSubmittingEvidence ||
      !isWalletConnected ||
      (evidenceText.trim().length < 20 && evidenceFiles.length === 0)
    }
    className="gap-2"
  >
    {isSubmittingEvidence ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : submissionStep === 'complete' ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : (
      <Send className="h-4 w-4" />
    )}
    {(() => {
      if (submissionStep === 'validating') return 'Validating Evidence...';
      if (submissionStep === 'payment') return 'Uploading to IPFS...';
      if (submissionStep === 'storing') return 'Saving Evidence...';
      if (submissionStep === 'complete') return 'Evidence Submitted! ✅';
      if (!isWalletConnected) return 'Connect Wallet First';
      return 'Submit Evidence';
    })()}
  </Button>
</div>
```

## That's It!

After these changes:
1. Users can drag & drop files
2. Files upload to IPFS automatically
3. Evidence is saved in Supabase with IPFS hashes
4. Beautiful UI with progress indicators

## Testing

1. **Start dev server**: `npm run dev`
2. **Navigate to a market**: http://localhost:3000/market/[id]
3. **Scroll to evidence section**
4. **Try uploading a file**:
   - Drag & drop an image
   - Or click to browse
   - See preview
   - Submit

## Expected Behavior

**WITHOUT IPFS keys**:
- ⚠️ Warning: "IPFS not configured"
- Evidence still saved to database
- Files not uploaded (graceful fallback)

**WITH IPFS keys** (Pinata/Infura):
- ✅ Files upload to IPFS
- ✅ IPFS hashes stored in database
- ✅ "X file(s) uploaded to IPFS" message
- ✅ Evidence accessible via IPFS gateways

## Next Steps

1. Get IPFS API keys (see IPFS_SETUP.md)
2. Add keys to `.env`
3. Restart dev server
4. Test file upload end-to-end
5. Verify files appear on IPFS: https://ipfs.io/ipfs/{hash}

