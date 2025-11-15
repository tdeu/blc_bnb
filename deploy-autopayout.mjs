import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🚀 Deploying Factory with AUTO-PAYOUT feature...\n");

  // Connect to BSC Testnet
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "BNB\n");

  // STEP 1: Check if contracts are already compiled
  const factoryPath = 'artifacts/contracts/PredictionMarketFactory.sol/PredictionMarketFactory.json';
  const marketPath = 'artifacts/contracts/PredictionMarket.sol/PredictionMarket.json';

  if (!fs.existsSync(factoryPath) || !fs.existsSync(marketPath)) {
    console.log("❌ Contracts not compiled!");
    console.log("Please run: npx hardhat compile");
    console.log("\nIf hardhat fails, try:");
    console.log("1. Delete node_modules and package-lock.json");
    console.log("2. npm install");
    console.log("3. npx hardhat compile");
    process.exit(1);
  }

  const factoryArtifact = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));

  const adminManager = process.env.VITE_ADMIN_MANAGER_ADDRESS;
  const treasury = process.env.VITE_TREASURY_ADDRESS;
  const castToken = process.env.VITE_CAST_TOKEN_ADDRESS;
  const betNFT = process.env.VITE_BET_NFT_ADDRESS;

  console.log("📋 Using contracts:");
  console.log("  AdminManager:", adminManager);
  console.log("  Treasury:", treasury);
  console.log("  CastToken:", castToken);
  console.log("  BetNFT:", betNFT);
  console.log();

  console.log("📦 Deploying PredictionMarketFactory with AUTO-PAYOUT...");

  const Factory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet);
  const factory = await Factory.deploy(adminManager, treasury, castToken, castToken, betNFT);

  console.log("⏳ Waiting for deployment...");
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("\n✅ DEPLOYED TO:", address);
  console.log("\n🎯 UPDATE .env FILE:");
  console.log("VITE_FACTORY_ADDRESS=" + address);
  console.log("\n✅ Deployment complete!");
  console.log("\n🎉 AUTO-PAYOUT FEATURE:");
  console.log("- Winners receive CAST automatically when market resolves");
  console.log("- No 'Claim' button needed");
  console.log("- Platform pays gas fees (~$0.50-$5 per market)");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
