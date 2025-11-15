import solc from 'solc';
import fs from 'fs';
import path from 'path';

console.log('🔧 Compiling contracts with auto-payout feature...\n');

// Read source files
const predictionMarketSource = fs.readFileSync('contracts/PredictionMarket.sol', 'utf8');
const factorySource = fs.readFileSync('contracts/PredictionMarketFactory.sol', 'utf8');
const adminManagerSource = fs.readFileSync('contracts/AdminManager.sol', 'utf8');
const treasurySource = fs.readFileSync('contracts/Treasury.sol', 'utf8');
const betNFTSource = fs.readFileSync('contracts/BetNFT.sol', 'utf8');
const castTokenSource = fs.readFileSync('contracts/CastToken.sol', 'utf8');

// Import resolver for OpenZeppelin contracts
function findImports(importPath) {
  try {
    const fullPath = path.join('node_modules', importPath);
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch (e) {
    return { error: 'File not found: ' + importPath };
  }
}

const input = {
  language: 'Solidity',
  sources: {
    'PredictionMarket.sol': { content: predictionMarketSource },
    'PredictionMarketFactory.sol': { content: factorySource },
    'AdminManager.sol': { content: adminManagerSource },
    'Treasury.sol': { content: treasurySource },
    'BetNFT.sol': { content: betNFTSource },
    'CastToken.sol': { content: castTokenSource },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    }
  }
};

console.log('📦 Compiling Solidity contracts...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  let hasErrors = false;
  output.errors.forEach(err => {
    if (err.severity === 'error') {
      console.error('❌', err.formattedMessage);
      hasErrors = true;
    } else if (err.severity === 'warning') {
      console.warn('⚠️ ', err.message);
    }
  });

  if (hasErrors) {
    console.log('\n❌ Compilation failed with errors!');
    process.exit(1);
  }
}

console.log('✅ Compilation successful!\n');

// Save artifacts
console.log('💾 Saving artifacts...');
fs.mkdirSync('artifacts/contracts/PredictionMarket.sol', { recursive: true });
fs.mkdirSync('artifacts/contracts/PredictionMarketFactory.sol', { recursive: true });

const marketContract = output.contracts['PredictionMarket.sol']['PredictionMarket'];
const factoryContract = output.contracts['PredictionMarketFactory.sol']['PredictionMarketFactory'];

fs.writeFileSync(
  'artifacts/contracts/PredictionMarket.sol/PredictionMarket.json',
  JSON.stringify({
    _format: 'hh-sol-artifact-1',
    contractName: 'PredictionMarket',
    sourceName: 'contracts/PredictionMarket.sol',
    abi: marketContract.abi,
    bytecode: '0x' + marketContract.evm.bytecode.object,
    deployedBytecode: '0x' + marketContract.evm.deployedBytecode.object,
    linkReferences: {},
    deployedLinkReferences: {}
  }, null, 2)
);

fs.writeFileSync(
  'artifacts/contracts/PredictionMarketFactory.sol/PredictionMarketFactory.json',
  JSON.stringify({
    _format: 'hh-sol-artifact-1',
    contractName: 'PredictionMarketFactory',
    sourceName: 'contracts/PredictionMarketFactory.sol',
    abi: factoryContract.abi,
    bytecode: '0x' + factoryContract.evm.bytecode.object,
    deployedBytecode: '0x' + factoryContract.evm.deployedBytecode.object,
    linkReferences: {},
    deployedLinkReferences: {}
  }, null, 2)
);

console.log('✅ Artifacts saved to artifacts/contracts/');
console.log('\n📊 Contract Sizes:');
console.log('  PredictionMarket bytecode:', (marketContract.evm.bytecode.object.length / 2).toLocaleString(), 'bytes');
console.log('  Factory bytecode:', (factoryContract.evm.bytecode.object.length / 2).toLocaleString(), 'bytes');
console.log('\n🎉 Ready to deploy! Run: node deploy-autopayout.mjs');
