/**
 * IPFS Service for BlockCast Evidence Storage
 *
 * Handles uploading evidence (images, documents) to IPFS for decentralized storage.
 * Uses Pinata or Infura IPFS gateways.
 */

interface IPFSUploadResponse {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

interface EvidenceMetadata {
  marketId: string;
  submitter: string;
  timestamp: number;
  type: 'image' | 'document' | 'video' | 'text';
  description?: string;
}

class IPFSService {
  private pinataApiKey: string | null = null;
  private pinataSecretKey: string | null = null;
  private infuraProjectId: string | null = null;
  private infuraProjectSecret: string | null = null;

  constructor() {
    // Load from environment - support both Vite (frontend) and Node.js (backend)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Vite frontend environment
      this.pinataApiKey = import.meta.env.VITE_PINATA_API_KEY || null;
      this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY || null;
      this.infuraProjectId = import.meta.env.VITE_IPFS_PROJECT_ID || null;
      this.infuraProjectSecret = import.meta.env.VITE_IPFS_PROJECT_SECRET || null;
    } else if (typeof process !== 'undefined' && process.env) {
      // Node.js backend environment
      this.pinataApiKey = process.env.PINATA_API_KEY || null;
      this.pinataSecretKey = process.env.PINATA_SECRET_KEY || null;
      this.infuraProjectId = process.env.IPFS_PROJECT_ID || null;
      this.infuraProjectSecret = process.env.IPFS_PROJECT_SECRET || null;
    }
  }

  /**
   * Upload file to IPFS using Pinata
   */
  async uploadToPinata(file: File, metadata: EvidenceMetadata): Promise<IPFSUploadResponse> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      return {
        success: false,
        error: 'Pinata API keys not configured'
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: `Evidence_${metadata.marketId}_${Date.now()}`,
        keyvalues: {
          marketId: metadata.marketId,
          submitter: metadata.submitter,
          type: metadata.type,
          timestamp: metadata.timestamp.toString()
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        ipfsHash: data.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
      };
    } catch (error) {
      console.error('Pinata upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload file to IPFS using Infura
   */
  async uploadToInfura(file: File, metadata: EvidenceMetadata): Promise<IPFSUploadResponse> {
    if (!this.infuraProjectId || !this.infuraProjectSecret) {
      return {
        success: false,
        error: 'Infura IPFS credentials not configured'
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const auth = btoa(`${this.infuraProjectId}:${this.infuraProjectSecret}`);

      const response = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Infura upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Upload metadata separately
      await this.uploadMetadataToInfura(data.Hash, metadata);

      return {
        success: true,
        ipfsHash: data.Hash,
        ipfsUrl: `https://ipfs.infura.io/ipfs/${data.Hash}`
      };
    } catch (error) {
      console.error('Infura upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  private async uploadMetadataToInfura(fileHash: string, metadata: EvidenceMetadata): Promise<void> {
    if (!this.infuraProjectId || !this.infuraProjectSecret) return;

    try {
      const metadataJson = JSON.stringify({
        fileHash,
        ...metadata
      });

      const blob = new Blob([metadataJson], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'metadata.json');

      const auth = btoa(`${this.infuraProjectId}:${this.infuraProjectSecret}`);

      await fetch('https://ipfs.infura.io:5001/api/v0/add', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`
        },
        body: formData
      });
    } catch (error) {
      console.error('Metadata upload error:', error);
    }
  }

  /**
   * Main upload method - tries Pinata first, falls back to Infura
   */
  async uploadEvidence(file: File, metadata: EvidenceMetadata): Promise<IPFSUploadResponse> {
    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large (max 50MB)'
      };
    }

    // Try Pinata first (preferred)
    if (this.pinataApiKey && this.pinataSecretKey) {
      const result = await this.uploadToPinata(file, metadata);
      if (result.success) return result;

      console.warn('Pinata upload failed, trying Infura...');
    }

    // Fallback to Infura
    if (this.infuraProjectId && this.infuraProjectSecret) {
      return await this.uploadToInfura(file, metadata);
    }

    return {
      success: false,
      error: 'No IPFS provider configured. Please set up Pinata or Infura credentials.'
    };
  }

  /**
   * Upload text evidence directly
   */
  async uploadTextEvidence(text: string, metadata: EvidenceMetadata): Promise<IPFSUploadResponse> {
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'evidence.txt', { type: 'text/plain' });
    return this.uploadEvidence(file, metadata);
  }

  /**
   * Upload JSON data
   */
  async uploadJsonEvidence(data: any, metadata: EvidenceMetadata): Promise<IPFSUploadResponse> {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const file = new File([blob], 'evidence.json', { type: 'application/json' });
    return this.uploadEvidence(file, metadata);
  }

  /**
   * Retrieve evidence from IPFS
   */
  async getEvidence(ipfsHash: string): Promise<Blob | null> {
    const gateways = [
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://ipfs.infura.io/ipfs/${ipfsHash}`
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, { method: 'GET' });
        if (response.ok) {
          return await response.blob();
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Get IPFS gateway URL for display
   */
  getGatewayUrl(ipfsHash: string): string {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(
      (this.pinataApiKey && this.pinataSecretKey) ||
      (this.infuraProjectId && this.infuraProjectSecret)
    );
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();

// Export types
export type { IPFSUploadResponse, EvidenceMetadata };
