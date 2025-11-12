// IPFS Integration for Evidence Storage
// Supports multiple IPFS providers for redundancy

export interface EvidenceData {
  id: string;
  marketId: string;
  submitter: string;
  title: string;
  description: string;
  evidenceType: 'text' | 'image' | 'document' | 'url' | 'video';
  content: string | File;
  metadata: {
    timestamp: number;
    source?: string;
    tags?: string[];
  };
}

export interface IPFSUploadResult {
  hash: string;
  url: string;
  provider: string;
  size: number;
}

export interface IPFSProvider {
  name: string;
  uploadUrl: string;
  gatewayUrl: string;
  apiKey?: string;
}

// Popular IPFS providers
const IPFS_PROVIDERS: IPFSProvider[] = [
  {
    name: 'Pinata',
    uploadUrl: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    gatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
    apiKey: process.env.PINATA_API_KEY
  },
  {
    name: 'Infura',
    uploadUrl: 'https://ipfs.infura.io:5001/api/v0/add',
    gatewayUrl: 'https://ipfs.infura.io/ipfs/',
    apiKey: process.env.INFURA_IPFS_API_KEY
  },
  {
    name: 'Web3.Storage',
    uploadUrl: 'https://api.web3.storage/upload',
    gatewayUrl: 'https://w3s.link/ipfs/',
    apiKey: process.env.WEB3_STORAGE_API_KEY
  },
  {
    name: 'Local IPFS Node',
    uploadUrl: 'http://localhost:5001/api/v0/add',
    gatewayUrl: 'http://localhost:8080/ipfs/'
  }
];

export class IPFSService {
  private providers: IPFSProvider[];
  
  constructor(providers?: IPFSProvider[]) {
    this.providers = providers || IPFS_PROVIDERS.filter(p => p.apiKey || p.name === 'Local IPFS Node');
  }

  // Upload evidence to IPFS with fallback providers
  async uploadEvidence(evidence: EvidenceData): Promise<IPFSUploadResult> {
    const evidencePackage = {
      ...evidence,
      uploadedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], {
      type: 'application/json'
    });

    for (const provider of this.providers) {
      try {
        const result = await this.uploadToProvider(blob, provider, `evidence_${evidence.id}.json`);
        console.log(`Evidence uploaded to ${provider.name}:`, result.hash);
        return result;
      } catch (error) {
        console.warn(`Failed to upload to ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('Failed to upload evidence to any IPFS provider');
  }

  // Upload file to specific provider
  private async uploadToProvider(
    file: Blob, 
    provider: IPFSProvider, 
    filename: string
  ): Promise<IPFSUploadResult> {
    const formData = new FormData();

    if (provider.name === 'Pinata') {
      formData.append('file', file, filename);
      formData.append('pinataMetadata', JSON.stringify({
        name: filename,
        keyvalues: {
          project: 'blockcast',
          type: 'evidence'
        }
      }));

      const response = await fetch(provider.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        hash: data.IpfsHash,
        url: provider.gatewayUrl + data.IpfsHash,
        provider: provider.name,
        size: data.PinSize
      };
    }

    if (provider.name === 'Web3.Storage') {
      const response = await fetch(provider.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'X-NAME': filename
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        hash: data.cid,
        url: provider.gatewayUrl + data.cid,
        provider: provider.name,
        size: file.size
      };
    }

    if (provider.name === 'Local IPFS Node' || provider.name === 'Infura') {
      formData.append('file', file, filename);

      const headers: Record<string, string> = {};
      if (provider.apiKey) {
        headers['Authorization'] = `Basic ${btoa(':' + provider.apiKey)}`;
      }

      const response = await fetch(provider.uploadUrl, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`${provider.name} upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        hash: data.Hash,
        url: provider.gatewayUrl + data.Hash,
        provider: provider.name,
        size: data.Size
      };
    }

    throw new Error(`Unsupported provider: ${provider.name}`);
  }

  // Retrieve evidence from IPFS
  async getEvidence(hash: string): Promise<EvidenceData> {
    for (const provider of this.providers) {
      try {
        const response = await fetch(provider.gatewayUrl + hash);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error(`Failed to retrieve evidence ${hash} from any gateway`);
  }

  // Upload file (images, documents, etc.)
  async uploadFile(file: File): Promise<IPFSUploadResult> {
    for (const provider of this.providers) {
      try {
        const result = await this.uploadToProvider(file, provider, file.name);
        return result;
      } catch (error) {
        console.warn(`Failed to upload file to ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('Failed to upload file to any IPFS provider');
  }

  // Validate IPFS hash format
  static isValidIPFSHash(hash: string): boolean {
    // Basic IPFS hash validation
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/.test(hash);
  }

  // Create evidence data structure
  static createEvidenceData(
    marketId: string,
    submitter: string,
    title: string,
    description: string,
    evidenceType: EvidenceData['evidenceType'],
    content: string | File,
    tags?: string[]
  ): EvidenceData {
    return {
      id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      marketId,
      submitter,
      title,
      description,
      evidenceType,
      content,
      metadata: {
        timestamp: Date.now(),
        tags
      }
    };
  }

  // Get available providers
  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  // Test provider connectivity
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    
    for (const provider of this.providers) {
      try {
        await this.uploadToProvider(testBlob, provider, 'test.txt');
        results[provider.name] = true;
      } catch (error) {
        results[provider.name] = false;
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();