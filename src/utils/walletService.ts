import { ethers } from 'ethers';
import { toast } from 'sonner';
import { TOKEN_ADDRESSES } from '../config/constants';

export interface WalletConnection {
  address: string;
  balance: string;
  isConnected: boolean;
  chainId: number;
  provider?: ethers.BrowserProvider;
  signer?: ethers.JsonRpcSigner;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class WalletService {
  private static instance: WalletService;
  private connection: WalletConnection | null = null;

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async connectMetaMask(): Promise<WalletConnection> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask to continue.');
    }

    try {
      console.log('🔄 Connecting to MetaMask...');

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      console.log('✅ Account access granted:', accounts[0]);

      // Check and configure Hedera testnet
      console.log('🔄 Configuring BSC Testnet...');
      await this.ensureBSCTestnet();
      console.log('✅ Network configured successfully');

      // Create provider and signer AFTER network configuration
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get balance with retry logic for circuit breaker
      const balance = await this.getBalanceWithRetry(provider, accounts[0]);
      const chainId = await provider.getNetwork();

      this.connection = {
        address: accounts[0],
        balance: ethers.formatEther(balance),
        isConnected: true,
        chainId: Number(chainId.chainId),
        provider,
        signer
      };

      // Listen for account changes
      this.setupEventListeners();

      console.log('✅ Wallet connected successfully:', {
        address: this.connection.address,
        balance: this.connection.balance,
        chainId: this.connection.chainId,
        network: chainId.name
      });

      // Verify we're on the correct network
      if (this.connection.chainId !== 97) {
        console.warn('⚠️ Not on BSC Testnet (97), current:', this.connection.chainId);
        throw new Error('Please manually switch to BSC Testnet in MetaMask and try again.');
      }

      return this.connection;
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);

      // Handle circuit breaker errors specifically
      if (this.isCircuitBreakerError(error)) {
        throw new Error('MetaMask is temporarily unavailable due to network issues. Please wait a moment and try again.');
      }

      // Handle network-specific errors
      if (error.message?.includes('switch to BSC Testnet') ||
          error.message?.includes('Network switch verification failed')) {
        throw new Error('Please manually add and switch to BSC Testnet in MetaMask:\n\n📋 Network Details:\n• Network Name: BSC Testnet\n• RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/\n• Chain ID: 97\n• Currency Symbol: BNB');
      }

      // Provide more specific error messages
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      } else if (error.code === -32002) {
        throw new Error('Connection request already pending');
      } else if (error.code === -32603) {
        throw new Error('MetaMask internal error. Please refresh the page and try again.');
      } else {
        throw new Error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
    }
  }

  private isCircuitBreakerError(error: any): boolean {
    return error?.data?.cause?.isBrokenCircuitError === true ||
           error?.message?.includes('circuit breaker is open') ||
           error?.data?.cause?.message?.includes('circuit breaker is open');
  }

  private async getBalanceWithRetry(provider: ethers.BrowserProvider, address: string, maxRetries = 3, delay = 2000): Promise<bigint> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting to get balance (attempt ${attempt}/${maxRetries})...`);
        const balance = await provider.getBalance(address);
        console.log('✅ Balance retrieved successfully');
        return balance;
      } catch (error: any) {
        console.warn(`⚠️ Balance attempt ${attempt} failed:`, error.message);

        if (this.isCircuitBreakerError(error) && attempt < maxRetries) {
          console.log(`⏳ Circuit breaker detected, waiting ${delay}ms before retry...`);
          await this.sleep(delay);
          delay *= 1.5; // Exponential backoff
          continue;
        }

        if (attempt === maxRetries) {
          // On final attempt, return 0 balance instead of failing
          console.warn('⚠️ Using fallback balance of 0 due to repeated failures');
          return BigInt(0);
        }
      }
    }
    return BigInt(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates the current MetaMask network configuration against expected BSC Testnet parameters
   */
  async validateNetworkConfiguration(): Promise<{ isValid: boolean; issues: string[] }> {
    if (!window.ethereum) {
      return { isValid: false, issues: ['MetaMask not found'] };
    }

    const issues: string[] = [];

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🔍 Validating network configuration...');
      console.log('Current chainId:', chainId);

      if (chainId !== '0x61') {
        issues.push(`Wrong chain ID: ${chainId} (expected 0x61)`);
      }

      // Try to get network version for additional validation
      try {
        const networkVersion = await window.ethereum.request({ method: 'net_version' });
        console.log('Network version:', networkVersion);

        if (networkVersion !== '97') {
          issues.push(`Network version mismatch: ${networkVersion} (expected 97)`);
        }
      } catch (e) {
        console.warn('Could not validate network version:', e);
      }

      // Log MetaMask provider info for diagnostics
      if (window.ethereum.networkVersion) {
        console.log('MetaMask networkVersion property:', window.ethereum.networkVersion);
      }
      if (window.ethereum.chainId) {
        console.log('MetaMask chainId property:', window.ethereum.chainId);
      }

      console.log(`Validation result: ${issues.length === 0 ? '✅ Valid' : '❌ Invalid'}`);
      if (issues.length > 0) {
        console.log('Issues found:', issues);
      }

      return { isValid: issues.length === 0, issues };
    } catch (error: any) {
      console.error('❌ Network validation error:', error);
      issues.push(`Validation failed: ${error.message}`);
      return { isValid: false, issues };
    }
  }

  /**
   * Forces a fresh network configuration by removing and re-adding BSC Testnet
   */
  async forceReconfigureNetwork(): Promise<void> {
    if (!window.ethereum) return;

    console.log('🔄 Forcing network reconfiguration...');

    const bscTestnetChainId = '0x61'; // 97 in hex
    const networkConfig = {
      chainId: bscTestnetChainId,
      chainName: 'BSC Testnet',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      rpcUrls: [
        'https://data-seed-prebsc-1-s1.binance.org:8545/'
      ],
      blockExplorerUrls: ['https://testnet.bscscan.com/'],
      iconUrls: ['https://s2.coinmarketcap.com/static/img/coins/64x64/4642.png']
    };

    try {
      // First, try to switch to another network (to reset state)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1' }], // Switch to Ethereum Mainnet temporarily
        });
        console.log('Switched to temporary network');
        await this.sleep(500); // Give MetaMask time to process
      } catch (e) {
        // Ignore errors, network might not be available
        console.log('Could not switch to temporary network, continuing...');
      }

      // Now add BSC Testnet with correct configuration
      console.log('Adding BSC Testnet with correct configuration...');
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig]
      });

      console.log('✅ BSC Testnet reconfigured successfully');

      // Small delay to ensure MetaMask processes the add
      await this.sleep(500);

      // Switch back to BSC Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: bscTestnetChainId }],
      });

      console.log('✅ Switched to BSC Testnet');
    } catch (error: any) {
      console.error('❌ Force reconfiguration failed:', error);
      throw error;
    }
  }

  async ensureBSCTestnet(): Promise<void> {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const bscTestnetChainId = '0x61'; // 97 in hex

      console.log(`Current chain ID: ${chainId}, Target: ${bscTestnetChainId}`);

      // First, validate the network configuration
      const validation = await this.validateNetworkConfiguration();
      if (!validation.isValid && chainId === bscTestnetChainId) {
        console.warn('⚠️ Network configuration issues detected:', validation.issues);
        console.log('🔄 Attempting to reconfigure network...');

        try {
          await this.forceReconfigureNetwork();
          console.log('✅ Network reconfiguration successful');
          return;
        } catch (reconfigError: any) {
          console.error('❌ Reconfiguration failed, falling back to standard flow:', reconfigError);
          // Fall through to standard network switching logic
        }
      }

      if (chainId !== bscTestnetChainId) {
        console.log('🔄 Switching to BSC Testnet...');

        try {
          // Try to switch to BSC Testnet first
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: bscTestnetChainId }],
          });
          console.log('✅ Switched to BSC Testnet successfully');
        } catch (switchError: any) {
          // If the chain is not added, add it
          if (switchError.code === 4902 || switchError.code === -32602) {
            console.log('🔄 Adding BSC Testnet to MetaMask...');

            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: bscTestnetChainId,
                chainName: 'BSC Testnet',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18
                },
                rpcUrls: [
                  'https://data-seed-prebsc-1-s1.binance.org:8545/'
                ],
                blockExplorerUrls: ['https://testnet.bscscan.com/'],
                iconUrls: ['https://s2.coinmarketcap.com/static/img/coins/64x64/4642.png']
              }]
            });

            console.log('✅ BSC Testnet added successfully');

            // Try to switch again after adding
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: bscTestnetChainId }],
            });

            console.log('✅ Switched to newly added BSC Testnet');
          } else {
            console.error('❌ Failed to switch to BSC Testnet:', switchError);
            throw new Error(`Failed to switch to BSC Testnet: ${switchError.message}`);
          }
        }
      } else {
        console.log('✅ Already on BSC Testnet');
      }

      // Verify the switch was successful
      const finalChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (finalChainId !== bscTestnetChainId) {
        throw new Error('Network switch verification failed. Please manually switch to BSC Testnet in MetaMask.');
      }

    } catch (error: any) {
      console.error('❌ Network setup error:', error);
      throw new Error(`Failed to configure BSC Testnet: ${error.message}`);
    }
  }

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.refreshConnection();
      }
    });

    window.ethereum.on('chainChanged', () => {
      this.refreshConnection();
    });
  }

  private async refreshConnection(): Promise<void> {
    if (this.connection) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const balance = await this.getBalanceWithRetry(provider, accounts[0].address, 2, 1000); // Shorter retry for refresh
          const chainId = await provider.getNetwork();

          this.connection = {
            ...this.connection,
            address: accounts[0].address,
            balance: ethers.formatEther(balance),
            chainId: Number(chainId.chainId),
            provider,
            signer: await provider.getSigner()
          };
        }
      } catch (error: any) {
        console.error('Failed to refresh connection:', error);

        if (this.isCircuitBreakerError(error)) {
          console.warn('⚠️ Circuit breaker error during refresh, keeping existing connection');
          // Don't disconnect, just log the error and keep the existing connection
        }
      }
    }
  }

  disconnect(): void {
    this.connection = null;
    console.log('🔌 Wallet disconnected');
  }

  getConnection(): WalletConnection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.isConnected;
  }

  isOnBSCTestnet(): boolean {
    return this.connection?.chainId === 97;
  }

  getCurrentNetwork(): string {
    if (!this.connection) return 'Not connected';

    switch (this.connection.chainId) {
      case 97: return 'BSC Testnet';
      case 56: return 'BSC Mainnet';
      case 1: return 'Ethereum Mainnet';
      case 5: return 'Goerli Testnet';
      case 11155111: return 'Sepolia Testnet';
      default: return `Unknown Network (${this.connection.chainId})`;
    }
  }

  async getBalance(): Promise<string> {
    if (!this.connection || !this.connection.provider) {
      return '0';
    }

    try {
      const balance = await this.getBalanceWithRetry(this.connection.provider, this.connection.address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Failed to get balance:', error);

      if (this.isCircuitBreakerError(error)) {
        console.warn('⚠️ Circuit breaker error when getting balance, returning cached value');
        return this.connection.balance || '0';
      }

      return '0';
    }
  }

  async getCastTokenBalance(): Promise<string> {
    if (!this.connection || !this.connection.provider) {
      return '0';
    }

    try {
      const castTokenAddress = TOKEN_ADDRESSES.CAST_TOKEN;
      const erc20ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
      ];

      const castToken = new ethers.Contract(castTokenAddress, erc20ABI, this.connection.provider);
      const balance = await castToken.balanceOf(this.connection.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get CastToken balance:', error);
      return '0';
    }
  }

  async checkMetaMaskInstalled(): Promise<boolean> {
    return typeof window.ethereum !== 'undefined';
  }

  async autoConnect(): Promise<WalletConnection | null> {
    if (!window.ethereum) return null;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        return await this.connectMetaMask();
      }
    } catch (error) {
      console.log('No existing connection found');
    }
    
    return null;
  }
}

export const walletService = WalletService.getInstance();