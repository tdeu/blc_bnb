import '@nomicfoundation/hardhat-ethers';
import dotenv from 'dotenv';

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // BSC Testnet (for BNB hackathon)
    bscTestnet: {
      type: 'http',
      url: process.env.DEPLOYER_PRIVATE_KEY ? "https://data-seed-prebsc-1-s1.binance.org:8545/" : "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 10000000000,
      gas: 10000000
    },
    // Hedera networks (preserved for other hackathon)
    hederaTestnet: {
      type: 'http',
      url: "https://testnet.hashio.io/api",
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      chainId: 296,
      gasPrice: 20000000000,
      gas: 10000000
    },
    hederaMainnet: {
      type: 'http',
      url: "https://mainnet.hashio.io/api",
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      chainId: 295,
      gasPrice: 20000000000,
      gas: 10000000
    },
    hederaPreviewnet: {
      type: 'http',
      url: "https://previewnet.hashio.io/api", 
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      chainId: 297,
      gasPrice: 20000000000,
      gas: 10000000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
