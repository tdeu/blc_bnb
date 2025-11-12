/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_CONTRACT_ADMIN_MANAGER: string
  readonly VITE_CONTRACT_CAST_TOKEN: string
  readonly VITE_CONTRACT_TREASURY: string
  readonly VITE_CONTRACT_BET_NFT: string
  readonly VITE_CONTRACT_PREDICTION_MARKET_FACTORY: string
  readonly VITE_CONTRACT_DISPUTE_MANAGER: string
  readonly VITE_TREASURY_ADDRESS: string
  readonly VITE_EVIDENCE_FEE_HBAR: string
  readonly VITE_BASE_REWARD_HBAR: string
  readonly VITE_HCS_EVIDENCE_TOPIC: string
  readonly VITE_HCS_AI_ATTESTATIONS_TOPIC: string
  readonly VITE_HCS_CHALLENGES_TOPIC: string
  readonly VITE_AI_PROXY_URL: string
  readonly VITE_MONITOR_URL: string
  readonly VITE_EVIDENCE_REVIEW_URL: string
  readonly VITE_JSON_RPC_URL: string
  readonly VITE_DEBUG: string
  readonly VITE_ENABLE_MOCK_DATA: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}