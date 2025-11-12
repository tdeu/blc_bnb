import { ethers } from 'ethers';

// Contract ABIs (simplified - you'd import full ABIs after compilation)
const PREDICTION_MARKET_FACTORY_ABI = [
  "function createMarket(string memory question, uint256 endTime) external returns (bytes32)",
  "function getAllMarkets() external view returns (address[] memory)",
  "function markets(bytes32) external view returns (address)",
  "event MarketCreated(bytes32 indexed id, address market, string question)"
];

const PREDICTION_MARKET_ABI = [
  "function getMarketInfo() external view returns (tuple(bytes32 id, string question, address creator, uint256 endTime, uint8 status))",
  "function getPriceYes(uint256 sharesToBuy) public view returns (uint256)",
  "function getPriceNo(uint256 sharesToBuy) public view returns (uint256)",
  "function buyYes(uint256 shares) external",
  "function buyNo(uint256 shares) external",
  "function resolveMarket(uint8 outcome) external",
  "function preliminaryResolve(uint8 outcome) external",
  "function finalResolve(uint8 outcome, uint256 confidenceScore) external",
  "function redeem() external",
  "function yesBalance(address) external view returns (uint256)",
  "function noBalance(address) external view returns (uint256)",
  "function isPendingResolution() external view returns (bool)",
  "function getPreliminaryOutcome() external view returns (uint8)",
  "function getConfidenceScore() external view returns (uint256)",
  "function getCurrentPrice() external view returns (uint256 priceYes, uint256 priceNo)",
  "function getProbabilities() external view returns (uint256 probYes, uint256 probNo)"
];

const CAST_TOKEN_ABI = [
  "function balanceOf(address) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function totalSupply() external view returns (uint256)"
];

export interface MarketInfo {
  id: string;
  question: string;
  creator: string;
  endTime: number;
  status: number; // 0=Submitted, 1=Open, 2=Resolved, 3=Canceled
  contractAddress: string;
}

export interface MarketPrices {
  yesPrice: string;
  noPrice: string;
  yesShares: string;
  noShares: string;
}

export interface UserPosition {
  yesShares: string;
  noShares: string;
  totalValue: string;
}

export class ContractService {
  private config: any;
  private provider: ethers.JsonRpcProvider;
  private factoryContract?: ethers.Contract;

  constructor(config: any) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.jsonRpcUrl);
    
    if (config.contracts.predictionMarketFactory) {
      this.factoryContract = new ethers.Contract(
        config.contracts.predictionMarketFactory,
        PREDICTION_MARKET_FACTORY_ABI,
        this.provider
      );
    }
  }

  // Market Creation
  async createMarket(question: string, endTimestamp: number, signer: ethers.Signer): Promise<string> {
    if (!this.factoryContract) {
      throw new Error('Factory contract not configured');
    }

    const factoryWithSigner = this.factoryContract.connect(signer);
    const tx = await factoryWithSigner.createMarket(question, endTimestamp);
    const receipt = await tx.wait();
    
    // Extract market ID from events
    const event = receipt.logs.find((log: any) => 
      log.topics[0] === ethers.id("MarketCreated(bytes32,address,string)")
    );
    
    if (event) {
      return event.topics[1]; // Market ID
    }
    
    throw new Error('Market creation event not found');
  }

  // Get all markets
  async getAllMarkets(): Promise<string[]> {
    if (!this.factoryContract) {
      throw new Error('Factory contract not configured');
    }

    return await this.factoryContract.getAllMarkets();
  }

  // Get market info
  async getMarketInfo(marketAddress: string): Promise<MarketInfo> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    const info = await marketContract.getMarketInfo();
    
    return {
      id: info.id,
      question: info.question,
      creator: info.creator,
      endTime: Number(info.endTime),
      status: info.status,
      contractAddress: marketAddress
    };
  }

  // Get market prices
  async getMarketPrices(marketAddress: string, shares: string = '1000000000000000000'): Promise<MarketPrices> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    const [yesPrice, noPrice] = await Promise.all([
      marketContract.getPriceYes(shares),
      marketContract.getPriceNo(shares)
    ]);

    return {
      yesPrice: ethers.formatEther(yesPrice),
      noPrice: ethers.formatEther(noPrice),
      yesShares: shares,
      noShares: shares
    };
  }

  // Buy YES shares
  async buyYes(marketAddress: string, shares: string, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.buyYes(shares);
    return tx.hash;
  }

  // Buy NO shares
  async buyNo(marketAddress: string, shares: string, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.buyNo(shares);
    return tx.hash;
  }

  // Get user position
  async getUserPosition(marketAddress: string, userAddress: string): Promise<UserPosition> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    const [yesShares, noShares] = await Promise.all([
      marketContract.yesBalance(userAddress),
      marketContract.noBalance(userAddress)
    ]);

    // Calculate approximate value (would need prices)
    const totalValue = ethers.formatEther(yesShares + noShares);

    return {
      yesShares: ethers.formatEther(yesShares),
      noShares: ethers.formatEther(noShares),
      totalValue
    };
  }

  // Resolve market (admin only) - DEPRECATED, use two-stage resolution
  async resolveMarket(marketAddress: string, outcome: number, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.resolveMarket(outcome);
    return tx.hash;
  }

  // Two-stage resolution: Preliminary resolve (admin only)
  async preliminaryResolve(marketAddress: string, outcome: number, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.preliminaryResolve(outcome);
    return tx.hash;
  }

  // Two-stage resolution: Final resolve with confidence score (admin only)
  async finalResolve(marketAddress: string, outcome: number, confidence: number, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.finalResolve(outcome, confidence);
    return tx.hash;
  }

  // Check if market is in pending resolution state
  async isPendingResolution(marketAddress: string): Promise<boolean> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    return await marketContract.isPendingResolution();
  }

  // Get preliminary outcome
  async getPreliminaryOutcome(marketAddress: string): Promise<number> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    return await marketContract.getPreliminaryOutcome();
  }

  // Get confidence score
  async getConfidenceScore(marketAddress: string): Promise<number> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    return await marketContract.getConfidenceScore();
  }

  // Get current market prices
  async getCurrentPrice(marketAddress: string): Promise<{ yesPrice: string; noPrice: string }> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    const [yesPrice, noPrice] = await marketContract.getCurrentPrice();

    return {
      yesPrice: ethers.formatEther(yesPrice),
      noPrice: ethers.formatEther(noPrice)
    };
  }

  // Get market probabilities as percentages
  async getProbabilities(marketAddress: string): Promise<{ yesProb: number; noProb: number }> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider
    );

    const [yesProb, noProb] = await marketContract.getProbabilities();

    return {
      yesProb: Number(yesProb),
      noProb: Number(noProb)
    };
  }

  // Redeem winnings
  async redeem(marketAddress: string, signer: ethers.Signer): Promise<string> {
    const marketContract = new ethers.Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      signer
    );

    const tx = await marketContract.redeem();
    return tx.hash;
  }

  // CAST Token operations
  async getCastBalance(userAddress: string): Promise<string> {
    if (!this.config.contracts.castToken) {
      return '0';
    }

    const castContract = new ethers.Contract(
      this.config.contracts.castToken,
      CAST_TOKEN_ABI,
      this.provider
    );

    const balance = await castContract.balanceOf(userAddress);
    return ethers.formatEther(balance);
  }

  // Get signer from private key (for backend operations)
  getSigner(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.provider);
  }

  // Utility: Convert Hedera address format to EVM format if needed
  hederaToEvmAddress(hederaAddress: string): string {
    // If already EVM format, return as is
    if (hederaAddress.startsWith('0x')) {
      return hederaAddress;
    }
    
    // Convert Hedera account ID to EVM address
    // This is a simplified conversion - in reality you'd use the mirror node API
    // to get the actual EVM address for a Hedera account
    const parts = hederaAddress.split('.');
    if (parts.length === 3) {
      const shard = parseInt(parts[0]);
      const realm = parseInt(parts[1]);
      const account = parseInt(parts[2]);
      
      // Create pseudo-EVM address (not real - for demonstration)
      const evmAddress = '0x' + 
        shard.toString(16).padStart(8, '0') +
        realm.toString(16).padStart(8, '0') +
        account.toString(16).padStart(8, '0');
      
      return evmAddress;
    }
    
    throw new Error(`Invalid Hedera address format: ${hederaAddress}`);
  }
}