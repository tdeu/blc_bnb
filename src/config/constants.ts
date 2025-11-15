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

// Dispute system removed - automated AI resolution only

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

// Token Addresses (BSC Testnet) - UPDATED 2025-11-14
export const TOKEN_ADDRESSES = {
  CAST_TOKEN: '0x8B84B21AC2EB9C37EfaD196d99088Df823567e81', // Deployed 2025-11-09
  USDC_TOKEN: '0x0000000000000000000000000000000000000000', // Placeholder (not used on BSC)
  FACTORY_CONTRACT: '0x0858D16D7c639Ff4807A77251bAA044756855d6F', // Fixed 2025-11-14 (removed pre-authorization)
  TREASURY: '0x54644FD3576720d16ff48Ea7E0545cb1D772D876', // Updated 2025-11-14 (with auto-burn feature)
  TREASURY_CONTRACT: '0x54644FD3576720d16ff48Ea7E0545cb1D772D876', // Alias for backward compatibility
  ADMIN_MANAGER_CONTRACT: '0xF02840CdB0f08E6A88E1ACbd14120b1754ebd9fe', // Deployed 2025-11-09
  BET_NFT_CONTRACT: '0x3deC8EA06Cbf76cc2378de3dc367eF29837bE43d', // Deployed 2025-11-09

  // BuyCAST contract - Updated 2025-11-13 with SimpleTreasury
  BUYCAST_CONTRACT: '0x45fEE9DAcF3Beb2C0C67dF057D068c0003C53B79', // Deployed 2025-11-13 (v3 - with SimpleTreasury)

  // DisputeManager contract removed - no longer using dispute system
} as const;

// Market Status Types (simplified - no more disputable status)
export const MARKET_STATUS = {
  SUBMITTED: 'submitted',
  PENDING_APPROVAL: 'pending_approval',
  OPEN: 'open', // Replaces ACTIVE
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
  TESTNET_RPC_FALLBACK: [
    'https://bsc-testnet.publicnode.com',
    'https://data-seed-prebsc-2-s1.binance.org:8545/',
    'https://data-seed-prebsc-1-s2.binance.org:8545/',
  ],
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