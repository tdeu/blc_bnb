# Vercel Deployment Setup Guide

## Issue Fixed
Your production environment was missing the backend API proxy, causing the AI to return placeholder/mock responses instead of real Perplexity API results.

## What We Fixed
1. ✅ Created Vercel serverless function at `/api/anthropic-proxy.ts`
2. ✅ Added `vercel.json` configuration
3. ✅ anthropicClient.ts already correctly routes to `/api/anthropic-proxy` in production

## Environment Variables Required in Vercel

Go to your Vercel dashboard → Your Project → Settings → Environment Variables and add:

### Required Variables

```bash
# Anthropic API Key (for AI reasoning)
ANTHROPIC_API_KEY=sk-ant-api03-...YOUR_KEY_HERE

# Perplexity API Key (for real-time search)
VITE_PERPLEXITY_API_KEY=pplx-...YOUR_KEY_HERE

# Supabase (already configured in .env)
VITE_SUPABASE_URL=https://fiopwubhukuxmjgujtxk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Hedera Configuration
VITE_HEDERA_TESTNET_ACCOUNT_ID=0.0.6643581
VITE_HEDERA_TESTNET_PRIVATE_KEY=302e020100300506032b65700422042072dfade85e414e3fcf2b6d6c190298de88f2f1014800ad7f31978082c1c85e0f
VITE_HEDERA_PRIVATE_KEY_EVM=0xf8ba79af7c966d32d2f19e8d0a33dea8bb46347089c5cf9dc3ba6f84a30812b9

HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.6421186
HEDERA_PRIVATE_KEY=0xf8ba79af7c966d32d2f19e8d0a33dea8bb46347089c5cf9dc3ba6f84a30812b9

# Contract Addresses
CONTRACT_ADMIN_MANAGER=0x7d86D05feeCBB3Efed3da57e7F82A4f626B485eA
CONTRACT_CAST_TOKEN=0x3eAe2F34F7E775D98c6C65e0999c61B3b625a1F6
CONTRACT_TREASURY=0x1E0a23f9d5a0079AcC21b623250207492809f298
CONTRACT_BET_NFT=0x5A07EB58D55046ff35fCe1099f445d91E7042a9a
CONTRACT_PREDICTION_MARKET_FACTORY=0x16782B27c6abc3628F1BCb9FaAbF0dDa1aD1Ed98
CONTRACT_DISPUTE_MANAGER=0xCB8B4E630b3443a34ceDB9B8C58B8cF5675d362b

# HCS Topic IDs
HCS_EVIDENCE_TOPIC=0.0.6701034
HCS_AI_ATTESTATIONS_TOPIC=0.0.6701057
HCS_CHALLENGES_TOPIC=0.0.6701064
HCS_USER_PROFILES_TOPIC=0.0.6701065

# Evidence System
VITE_TREASURY_ADDRESS=0x358Ed5B43eBe9e55D37AF5466a9f0472D76E4635
VITE_EVIDENCE_FEE_HBAR=0.1
VITE_BASE_REWARD_HBAR=0.5

# Admin Key
VITE_ADMIN_PRIVATE_KEY=98570d874eda35327ae5253c87aa74a5b0e9e33e2189b022a0f8877ed812ee0a

# News API (optional)
NEWS_API_KEY=c04c325436d04142852f30ffd00d95bb
VITE_NEWS_API_KEY=c04c325436d04142852f30ffd00d95bb

# Environment
NODE_ENV=production
```

## Important Notes

### ⚠️ CRITICAL: ANTHROPIC_API_KEY
- **Must NOT have `VITE_` prefix** in Vercel (it's server-side only)
- The serverless function at `/api/anthropic-proxy.ts` uses `process.env.ANTHROPIC_API_KEY`
- Never expose this in client code

### ✅ VITE_PERPLEXITY_API_KEY
- **Must have `VITE_` prefix** because it's used in client-side code (`perplexityService.ts`)
- This gets called directly from the browser

## Deployment Steps

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Add Vercel serverless API proxy for Anthropic"
   git push
   ```

2. **Configure Vercel Environment Variables:**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add all the variables listed above
   - Make sure to apply them to "Production", "Preview", and "Development" environments

3. **Redeploy:**
   - Vercel will auto-deploy on push, OR
   - Go to Deployments → click "Redeploy" on the latest deployment

4. **Verify:**
   - After deployment, test the AI resolution in the admin panel
   - You should now get detailed Perplexity responses like your local environment

## How It Works Now

### Local Development
```
Frontend (localhost:3000)
  → Vite proxy → localhost:3001
  → Express server (src/api/anthropic-proxy.ts)
  → Anthropic API
```

### Production (Vercel)
```
Frontend (vercel.app)
  → /api/anthropic-proxy
  → Vercel Serverless Function (/api/anthropic-proxy.ts)
  → Anthropic API
```

Both environments now work the same way!

## Testing

After deploying, test the AI resolution feature:
1. Go to Admin Panel
2. Select a market
3. Click "Run AI Analysis"
4. You should see detailed reasoning with sources, similar to your local environment

## Troubleshooting

If you still get placeholder responses:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Click "Functions" tab
   - Check logs for `/api/anthropic-proxy`

2. **Verify Environment Variables:**
   ```bash
   # In Vercel Dashboard, verify:
   - ANTHROPIC_API_KEY is set (without VITE_ prefix)
   - VITE_PERPLEXITY_API_KEY is set (with VITE_ prefix)
   ```

3. **Check Browser Console:**
   - Open browser DevTools
   - Check Network tab for failed API calls to `/api/anthropic-proxy`

## Package Dependencies

Make sure these are in `package.json` (already included):
```json
{
  "devDependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

If missing, run:
```bash
npm install -D @vercel/node
```

Then commit and push again.
