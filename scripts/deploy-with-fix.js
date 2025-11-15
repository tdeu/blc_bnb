import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying FIXED PredictionMarketFactory...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(bal), "BNB\n");

  const adminManager = process.env.VITE_ADMIN_MANAGER_ADDRESS;
  const treasury = process.env.VITE_TREASURY_ADDRESS;
  const castToken = process.env.VITE_CAST_TOKEN_ADDRESS;
  const betNFT = process.env.VITE_BET_NFT_ADDRESS;

  console.log("AdminManager:", adminManager);
  console.log("Treasury:", treasury);
  console.log("CastToken:", castToken);
  console.log("BetNFT:", betNFT);
  console.log();

  console.log("📦 Deploying with VIRTUAL LIQUIDITY FIX...");
  const Factory = await hre.ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy(adminManager, treasury, castToken, castToken, betNFT);
  await factory.waitForDeployment();
  
  const address = await factory.getAddress();
  console.log("✅ DEPLOYED TO:", address);
  console.log("\n🎯 UPDATE .env:");
  console.log("VITE_FACTORY_ADDRESS=" + address);
}

main().catch((error) => {
  console.error("❌", error);
  process.exitCode = 1;
});
