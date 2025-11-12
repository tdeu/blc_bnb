# IPFS Setup Guide for BlockCast

Evidence files are uploaded to IPFS for decentralized storage. You have two options:

## Option 1: Pinata (Recommended) ⭐

**Why Pinata?**
- Free tier: 1GB storage, 100GB bandwidth/month
- Easy setup (2 minutes)
- Reliable and fast
- Great for hackathons/demos

### Steps:

1. **Create Account**
   - Go to: https://app.pinata.cloud/register
   - Sign up with email (free)

2. **Generate API Key**
   - Go to: https://app.pinata.cloud/keys
   - Click "New Key"
   - **Permissions**: Check "pinFileToIPFS" (minimum)
   - **Name**: "BlockCast Evidence"
   - Click "Create Key"

3. **Copy Keys**
   - Copy both `API Key` and `API Secret`
   - ⚠️ **Important**: Save the Secret immediately - you can't see it again!

4. **Add to `.env`**
   ```env
   PINATA_API_KEY=your_actual_api_key_here
   PINATA_SECRET_KEY=your_actual_secret_key_here
   ```

5. **Restart Dev Server**
   ```bash
   npm run dev
   ```

---

## Option 2: Infura IPFS (Alternative)

**Why Infura?**
- Free tier: 5GB storage
- Part of popular Web3 infrastructure
- Multiple services (Ethereum, IPFS, etc.)

### Steps:

1. **Create Account**
   - Go to: https://infura.io/register
   - Sign up (free)

2. **Create IPFS Project**
   - Dashboard: https://infura.io/dashboard
   - Click "Create New Key"
   - Select "IPFS"
   - Name: "BlockCast"

3. **Get Credentials**
   - Click on your project
   - Copy `Project ID` and `Project Secret`

4. **Add to `.env`**
   ```env
   IPFS_PROJECT_ID=your_project_id
   IPFS_PROJECT_SECRET=your_project_secret
   ```

5. **Restart Dev Server**
   ```bash
   npm run dev
   ```

---

## Testing IPFS Upload

After configuration, test by:

1. Go to your local app: http://localhost:3000
2. Navigate to any market
3. Click "Submit Evidence"
4. Upload an image (< 50MB)
5. Submit

You should see:
- ✅ "Uploading {filename} to IPFS..."
- ✅ "{filename} uploaded to IPFS"
- ✅ "Evidence submitted successfully!"

---

## Troubleshooting

### "IPFS not configured" warning
- Check that `.env` has your API keys
- Restart dev server after adding keys
- Make sure no typos in keys

### "Failed to upload to IPFS"
- Check API key permissions (needs "pinFileToIPFS")
- Check file size (max 50MB)
- Try the other provider (Pinata ↔ Infura)

### Files not appearing
- IPFS can take 10-30 seconds to propagate
- Try different gateways:
  - https://ipfs.io/ipfs/{hash}
  - https://gateway.pinata.cloud/ipfs/{hash}
  - https://cloudflare-ipfs.com/ipfs/{hash}

---

## Free Tier Limits

| Provider | Storage | Bandwidth | Files |
|----------|---------|-----------|-------|
| Pinata | 1GB | 100GB/month | Unlimited |
| Infura | 5GB | Unlimited | Unlimited |

For the hackathon demo, either is more than enough!

---

## How It Works

```
User uploads file
    ↓
File sent to IPFS provider (Pinata/Infura)
    ↓
IPFS returns hash (e.g., "QmX...")
    ↓
Hash stored in Supabase database
    ↓
File accessible via multiple gateways:
- https://ipfs.io/ipfs/QmX...
- https://gateway.pinata.cloud/ipfs/QmX...
- etc.
```

**Benefits:**
- ✅ Decentralized (no single point of failure)
- ✅ Permanent (content-addressed storage)
- ✅ Verifiable (hash proves integrity)
- ✅ Web3 native (professional for hackathon)

---

## Quick Setup (Recommended for Hackathon)

**Just use Pinata** - it's the fastest:

1. https://app.pinata.cloud/register → Sign up
2. https://app.pinata.cloud/keys → Create key
3. Copy both keys to `.env`
4. Done! 🎉

Takes < 3 minutes!
