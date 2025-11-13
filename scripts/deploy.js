import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying updated PredictionMarketFactory with BNB collateral...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB\n");

  // Get existing contract addresses from environment
  const adminManagerAddress = process.env.VITE_ADMIN_MANAGER_ADDRESS;
  const treasuryAddress = process.env.VITE_TREASURY_ADDRESS;
  const castTokenAddress = process.env.VITE_CAST_TOKEN_ADDRESS;
  const betNFTAddress = process.env.VITE_BET_NFT_ADDRESS;

  if (!adminManagerAddress || !treasuryAddress || !castTokenAddress || !betNFTAddress) {
    throw new Error("Missing required contract addresses in .env file");
  }

  console.log("📋 Using existing contract addresses:");
  console.log("  AdminManager:", adminManagerAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("  CastToken:", castTokenAddress);
  console.log("  BetNFT:", betNFTAddress);
  console.log();

  // For now, we'll use CastToken as collateral (later can be changed to USDT)
  const collateralAddress = castTokenAddress;

  // Deploy PredictionMarketFactory
  console.log("📦 Deploying PredictionMarketFactory...");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy(
    adminManagerAddress,
    treasuryAddress,
    collateralAddress,
    castTokenAddress,
    betNFTAddress
  );

  console.log("⏳ Waiting for deployment...");
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("\n✅ PredictionMarketFactory deployed to:", factoryAddress);
  const minCollateral = await factory.minCreationCollateral();
  console.log("   Minimum creation collateral:", ethers.formatEther(minCollateral), "BNB");
  console.log();

  // Verify on BSCScan
  console.log("📝 To verify on BSCScan, run:");
  console.log(`npx hardhat verify --network bscTestnet ${factoryAddress} ${adminManagerAddress} ${treasuryAddress} ${collateralAddress} ${castTokenAddress} ${betNFTAddress}`);
  console.log();

  console.log("🎯 Update your .env file with:");
  console.log(`VITE_FACTORY_ADDRESS=${factoryAddress}`);
  console.log();

  console.log("✅ Deployment complete!");
  console.log();
  console.log("🔧 Next steps:");
  console.log("1. Update VITE_FACTORY_ADDRESS in .env with the address above");
  console.log("2. Restart your development server");
  console.log("3. Test market creation with 0.001 BNB collateral");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
