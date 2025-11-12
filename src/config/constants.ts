// Blockcast Platform Constants

// Market Creation Settings
export const MARKET_CREATION = {
  DEFAULT_COLLATERAL_AMOUNT: '1', // 1 BNB default
  MIN_COLLATERAL_BNB: '1',
  MIN_COLLATERAL_CAST: '100',
  SUPPORTED_COLLATERAL_TOKENS: ['BNB', 'CAST'] as const,
  MIN_CLAIM_LENGTH: 10,
  MAX_CLAIM_LENGTH: 200,
  MIN_DESCRIPTION_LENGTH: 20,
  MAX_DESCRIPTION_LENGTH: 1000
} as const;

// Dispute System Settings
export const DISPUTE_PERIOD = {
  HOURS: 168, // 7 days dispute period (168 hours)
  MILLISECONDS: 168 * 60 * 60 * 1000,
  BOND_AMOUNT_BNB: '1', // 1 BNB dispute bond
  BOND_AMOUNT_CAST: '100' // 100 CAST dispute bond
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  // Primary betting token (what users see in UI)
  PRIMARY_BETTING_TOKEN: 'BNB' as CollateralToken,

  // Contract collateral token (what smart contracts use)
  CONTRACT_COLLATERAL_TOKEN: 'CAST' as CollateralToken,

  // Display preferences
  SHOW_BOTH_TOKENS: true, // Show both BNB equivalent and actual CAST amounts

  // Exchange rates (for display purposes only)
  EXCHANGE_RATES: {
    BNB_TO_CAST: 50, // 1 BNB = 50 CAST (example rate)
    CAST_TO_BNB: 0.02 // 1 CAST = 0.02 BNB
  }
} as const;

// Token Addresses (BSC Testnet) - DEPLOYED 2025-11-09
export const TOKEN_ADDRESSES = {
  CAST_TOKEN: '0x8B84B21AC2EB9C37EfaD196d99088Df823567e81', // Deployed 2025-11-09
  USDC_TOKEN: '0x0000000000000000000000000000000000000000', // Placeholder (not used on BSC)
  FACTORY_CONTRACT: '0x224168a50c6B918230a855075f90ED230371F965', // Deployed 2025-11-09
  TREASURY_CONTRACT: '0xf72789416187386Af70c063ff54a1E107Bdbd573', // Deployed 2025-11-09
  ADMIN_MANAGER_CONTRACT: '0xF02840CdB0f08E6A88E1ACbd14120b1754ebd9fe', // Deployed 2025-11-09
  BET_NFT_CONTRACT: '0x10389fbC289D124549433C41b54eF25BD423B162', // Deployed 2025-11-09
  DISPUTE_MANAGER_CONTRACT: '0xbcF01D2911C2fE5f938345225613aA0371b5eC8e', // Deployed 2025-11-09

  // BuyCAST contract - not needed on BSC (using DEX instead)
  BUYCAST_CONTRACT: '0x0000000000000000000000000000000000000000', // Not deployed
} as const;

// Market Status Types
export const MARKET_STATUS = {
  SUBMITTED: 'submitted',
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  DISPUTABLE: 'disputable',
  PENDING_RESOLUTION: 'pending_resolution',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
  OFFLINE: 'offline'
} as const;

// AI Resolution Settings
export const AI_RESOLUTION = {
  HIGH_CONFIDENCE_THRESHOLD: 0.9,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.7,
  AUTO_EXECUTE_THRESHOLD: 0.95
} as const;

// Network Settings (BSC Testnet)
export const BSC_CONFIG = {
  TESTNET_RPC: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  TESTNET_CHAIN_ID: 97,
  TESTNET_EXPLORER: 'https://testnet.bscscan.com'
} as const;

// User Interface Settings
export const UI_CONFIG = {
  MARKETS_PER_PAGE: 12,
  MAX_IMAGE_SIZE_MB: 5,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  NOTIFICATION_DURATION: 5000
} as const;

export type CollateralToken = typeof MARKET_CREATION.SUPPORTED_COLLATERAL_TOKENS[number];
export type MarketStatus = typeof MARKET_STATUS[keyof typeof MARKET_STATUS];