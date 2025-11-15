import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying FIXED PredictionMarketFactory (virtual liquidity bug corrected)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB\n");

  const adminManagerAddress = process.env.VITE_ADMIN_MANAGER_ADDRESS;
  const treasuryAddress = process.env.VITE_TREASURY_ADDRESS;
  const castTokenAddress = process.env.VITE_CAST_TOKEN_ADDRESS;
  const betNFTAddress = process.env.VITE_BET_NFT_ADDRESS;

  if (!adminManagerAddress || !treasuryAddress || !castTokenAddress || !betNFTAddress) {
    throw new Error("❌ Missing required contract addresses");
  }

  console.log("📋 Using existing contracts:");
  console.log("  AdminManager:", adminManagerAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("  CastToken:", castTokenAddress);
  console.log("  BetNFT:", betNFTAddress);
  console.log();

  const collateralAddress = castTokenAddress;

  console.log("📦 Deploying PredictionMarketFactory with FIX...");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy(
    adminManagerAddress,
    treasuryAddress,
    collateralAddress,
    castTokenAddress,
    betNFTAddress
  );

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ Factory deployed:", factoryAddress);
  console.log();
  console.log("🎯 Update .env:");
  console.log("VITE_FACTORY_ADDRESS=" + factoryAddress);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
