// Check if admin has the role to resolve the market
import { config } from 'dotenv';
import { ethers } from 'ethers';

config();

const contractAddress = '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1';
const adminPrivateKey = process.env.VITE_ADMIN_PRIVATE_KEY;

const MARKET_ABI = [
  "function adminManager() external view returns (address)"
];

const ADMIN_MANAGER_ABI = [
  "function isAdmin(address) external view returns (bool)",
  "function superAdmin() external view returns (address)"
];

async function checkAdmin() {
  try {
    console.log('🔍 Checking admin permissions...\n');

    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);

    console.log(`👤 Your admin address: ${adminWallet.address}\n`);

    // Get AdminManager contract address
    const market = new ethers.Contract(contractAddress, MARKET_ABI, provider);
    const adminManagerAddress = await market.adminManager();
    console.log(`📋 AdminManager contract: ${adminManagerAddress}\n`);

    // Check if admin
    const adminManager = new ethers.Contract(adminManagerAddress, ADMIN_MANAGER_ABI, provider);
    const isAdmin = await adminManager.isAdmin(adminWallet.address);
    const superAdmin = await adminManager.superAdmin();

    console.log(`✅ Is Admin: ${isAdmin}`);
    console.log(`👑 Super Admin: ${superAdmin}`);
    console.log(`🎯 Match Super Admin: ${superAdmin.toLowerCase() === adminWallet.address.toLowerCase()}\n`);

    if (!isAdmin) {
      console.log('❌ Your wallet is NOT an admin!');
      console.log('   This is why the transaction is failing.');
      console.log(`   You need to add ${adminWallet.address} as admin.`);
    } else {
      console.log('✅ Your wallet HAS admin permissions!');
      console.log('   The error must be from another require() condition.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdmin();
