# ⚡ BlockCast - Quick Reference

## 🎯 Most Common Commands

### Start Everything (Recommended)
```bash
start-all.bat
```

### Just Frontend
```bash
npm run dev
```

### Kill All Ports
```bash
npx kill-port 3000 3001 3002
```

---

## 📍 Service URLs

- **Frontend**: http://localhost:3000
- **AI Proxy**: http://localhost:3001
- **Market Monitor**: http://localhost:3002

---

## 🔑 Current Setup

✅ API Keys configured:
- Anthropic Claude API
- Perplexity API

✅ Contracts deployed on BSC Testnet

✅ All services ready to run

---

## 🚀 Typical Workflow

1. Kill existing processes:
   ```bash
   npx kill-port 3000 3001 3002
   ```

2. Start all services:
   ```bash
   start-all.bat
   ```

3. Open: http://localhost:3000

**That's it!**

---

For more details, see `STARTUP_GUIDE.md`
