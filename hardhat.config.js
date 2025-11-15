import '@nomicfoundation/hardhat-toolbox';
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
    // BSC Testnet
    bscTestnet: {
      type: 'http',
      url: process.env.DEPLOYER_PRIVATE_KEY ? "https://data-seed-prebsc-1-s1.binance.org:8545/" : "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 10000000000,
      gas: 10000000
    },
    // BSC Mainnet (for future production deployment)
    bscMainnet: {
      type: 'http',
      url: "https://bsc-dataseed1.binance.org/",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 5000000000,
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
