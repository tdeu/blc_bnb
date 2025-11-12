import { useState } from 'react';
import { FileUploadZone } from '../components/evidence/FileUploadZone';
import { ipfsService } from '../services/ipfsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink } from 'lucide-react';

/**
 * Test page for IPFS file upload functionality
 * No wallet connection required - for testing purposes only
 */
export function TestIPFS() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    fileName: string;
    ipfsHash: string;
    ipfsUrl: string;
  }>>([]);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);
    const results: typeof uploadResults = [];

    try {
      for (const file of files) {
        toast.info(`Uploading ${file.name} to IPFS...`);

        const metadata = {
          marketId: 'test-market',
          submitter: 'test-user',
          timestamp: Date.now(),
          type: file.type.startsWith('image/') ? 'image' as const : 'document' as const
        };

        const result = await ipfsService.uploadEvidence(file, metadata);

        if (result.success && result.ipfsHash) {
          results.push({
            fileName: file.name,
            ipfsHash: result.ipfsHash,
            ipfsUrl: result.ipfsUrl || `https://ipfs.io/ipfs/${result.ipfsHash}`
          });
          toast.success(`✅ ${file.name} uploaded!`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
        }
      }

      setUploadResults(results);
      setFiles([]);

      toast.success(`Successfully uploaded ${results.length} file(s) to IPFS!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 IPFS Upload Test</CardTitle>
          <CardDescription>
            Test file upload to IPFS without wallet connection.
            This page is for testing purposes only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Zone */}
          <div>
            <h3 className="text-sm font-medium mb-3">Upload Files</h3>
            <FileUploadZone
              onFilesSelected={setFiles}
              maxFiles={5}
              maxFileSize={50}
              disabled={uploading}
            />
          </div>

          {/* Upload Button */}
          {files.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? 'Uploading to IPFS...' : `Upload ${files.length} file(s) to IPFS`}
            </Button>
          )}

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-semibold">Upload Successful!</h3>
              </div>

              <div className="space-y-2">
                {uploadResults.map((result, index) => (
                  <Card key={index} className="border-green-200">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.fileName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {result.ipfsHash}
                          </p>
                        </div>
                        <a
                          href={result.ipfsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline whitespace-nowrap"
                        >
                          View on IPFS
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Alternative Gateways */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Alternative gateways:</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://ipfs.io/ipfs/${result.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            ipfs.io
                          </a>
                          <span>•</span>
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            pinata.cloud
                          </a>
                          <span>•</span>
                          <a
                            href={`https://cloudflare-ipfs.com/ipfs/${result.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            cloudflare
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="font-medium">IPFS Provider: Pinata</p>
                  <p className="text-xs text-muted-foreground">
                    API Key: {import.meta.env.VITE_PINATA_API_KEY ? '✅ Configured' : '❌ Missing'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>To configure IPFS:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                  <li>Get API keys from https://pinata.cloud</li>
                  <li>Add to .env file: PINATA_API_KEY and PINATA_SECRET_KEY</li>
                  <li>Restart dev server</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
