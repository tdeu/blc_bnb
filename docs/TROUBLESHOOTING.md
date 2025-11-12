# Troubleshooting Guide

## Common Issues

### "MetaMask not connected" or "Wrong network"

**Solution**:
1. Ensure MetaMask is installed
2. Switch to Hedera Testnet (Chain ID: 296)
3. Refresh page and reconnect wallet

### "Insufficient CAST balance"

**Solution**:
```bash
# Buy CAST tokens through the UI
1. Click "Buy CAST" button
2. Enter HBAR amount
3. Approve transaction
4. CAST tokens will be minted to your wallet
```

### AI Proxy Server not responding (Port 3001)

**Symptoms**: Evidence analysis fails, Claude AI unavailable

**Solution**:
```bash
# Check if server is running
curl http://localhost:3001/health

# Restart server
npm run server

# Verify API key in .env
echo $ANTHROPIC_API_KEY
```

### Market Monitor not detecting expired markets

**Symptoms**: Markets stay "Open" past end date

**Solution**:
```bash
# Manually trigger monitor cycle
npm run monitor:tick

# Check monitor logs
npm run monitor
# Look for "Checking for expired markets..." messages
```

### Database connection errors

**Symptoms**: "Failed to fetch markets", Supabase errors

**Solution**:
1. Verify `.env` has correct Supabase credentials
2. Check Supabase project status at https://supabase.com
3. Restart frontend: `npm run dev`

### Transaction fails with "execution reverted"

**Common Causes**:
1. **Insufficient balance**: Need CAST tokens for betting
2. **Market closed**: Can't bet after end_date
3. **Not approved**: Need to approve CAST before betting
4. **Wrong status**: Market not in correct state

**Solution**:
```bash
# Check market status on blockchain
# Use admin dashboard or scripts/check-market-status.ts
```

### NFT minting fails

**Symptoms**: "Failed to mint NFT" error

**Solution**:
1. Ensure you have an active bet position
2. Check BetNFT contract authorization
3. Verify sufficient HBAR for gas fees

### Build errors

**TypeScript errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Type check
npx tsc --noEmit
```

**Vite build fails**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Service Port Conflicts

If ports 3000, 3001, or 3002 are already in use:

**Windows**:
```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <process_id> /F
```

**Linux/Mac**:
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
```

## Smart Contract Issues

### DisputeManager approval fails

**Solution**:
```bash
# Verify CAST token address matches DisputeManager bond token
node scripts/check-market-factory.ts
```

### Market not transitioning to "Open" status

**Solution**:
```bash
# Manually approve market (requires admin key)
node scripts/approve-this-market.ts
```

## Getting Help

1. Check existing [GitHub Issues](https://github.com/your-repo/issues)
2. Review contract addresses in `docs/ARCHITECTURE.md`
3. Verify transaction on [HashScan](https://hashscan.io/testnet)
4. Check service logs for detailed error messages
