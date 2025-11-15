async function main() {
  console.log("🚀 Deploying FIXED PredictionMarketFactory...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "BNB\n");

  const adminManager = process.env.VITE_ADMIN_MANAGER_ADDRESS;
  const treasury = process.env.VITE_TREASURY_ADDRESS;
  const castToken = process.env.VITE_CAST_TOKEN_ADDRESS;
  const betNFT = process.env.VITE_BET_NFT_ADDRESS;

  if (!adminManager || !treasury || !castToken || !betNFT) {
    throw new Error("❌ Missing contract addresses in .env");
  }

  console.log("📋 Using contracts:");
  console.log("  AdminManager:", adminManager);
  console.log("  Treasury:", treasury);
  console.log("  CastToken:", castToken);
  console.log("  BetNFT:", betNFT);
  console.log();

  console.log("📦 Deploying PredictionMarketFactory with VIRTUAL LIQUIDITY FIX...");
  const Factory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy(adminManager, treasury, castToken, castToken, betNFT);
  await factory.waitForDeployment();
  
  const address = await factory.getAddress();
  console.log("\n✅ DEPLOYED TO:", address);
  console.log("\n🎯 UPDATE .env FILE:");
  console.log("VITE_FACTORY_ADDRESS=" + address);
  console.log("\n✅ Deployment complete! The virtual liquidity bug is now FIXED.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
