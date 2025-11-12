# 🚀 BlockCast - Quick Startup Guide

## Prerequisites
- Node.js installed
- API keys configured in `.env` (✅ Done)
- BSC Testnet wallet with tBNB

---

## 🎯 Running the Application

### **Option 1: Full Stack (Recommended)**
```bash
start-all.bat
```
**Starts:**
- ✅ Frontend (React/Vite) → `http://localhost:3000`
- ✅ AI Proxy Server → `http://localhost:3001`
- ✅ Market Monitor → `http://localhost:3002`

**Use this for:** Full development with AI features and automated market monitoring

---

### **Option 2: Frontend + AI Only**
```bash
start.bat
```
**Starts:**
- ✅ Frontend → `http://localhost:3000`
- ✅ AI Proxy Server → `http://localhost:3001`

**Use this for:** Development when you don't need automated monitoring

---

### **Option 3: Frontend Only**
```bash
npm run dev
```
**Starts:**
- ✅ Frontend → `http://localhost:3000`

**Use this for:** UI development without AI features

---

## 📦 Individual Services (Manual Control)

### Frontend
```bash
npm run dev
```
Runs on: `http://localhost:3000`

### AI Proxy (Anthropic + Perplexity)
```bash
npm run server
```
Runs on: `http://localhost:3001`
- Handles AI evidence analysis via Anthropic Claude
- Handles external verification via Perplexity
- Provides web scraping capabilities
- Handles image uploads for markets

### Market Monitor (Automated Resolution)
```bash
npm run monitor
```
Runs on: `http://localhost:3002`
- Monitors expired markets
- Triggers AI resolution automatically
- Handles dispute period management
- Executes final resolutions

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start frontend only
npm run build            # Build for production
```

### Server Management
```bash
npm run server           # AI Proxy server
npm run monitor          # Market monitor
npx kill-port 3000       # Kill process on port 3000
npx kill-port 3000 3001 3002  # Kill multiple ports
```

### Monitoring
```bash
npm run monitor:tick        # Manual monitor tick (trigger resolution check)
```

**Note:** Deployment and testing scripts have been archived to `/archive` folder. The app is pre-deployed and ready to use!

---

## 🔧 Configuration

### API Keys (in `.env`)
- ✅ `ANTHROPIC_API_KEY` - Claude API for AI analysis
- ✅ `PERPLEXITY_API_KEY` - Perplexity API for external verification
- ⚠️ `NEWS_API_KEY` - NewsAPI (optional)
- ⚠️ `BSCSCAN_API_KEY` - For contract verification

### Contract Addresses (BSC Testnet)
All deployed and configured in `.env`:
- Factory: `0x224168a50c6B918230a855075f90ED230371F965`
- CAST Token: `0x8B84B21AC2EB9C37EfaD196d99088Df823567e81`
- BetNFT: `0x10389fbC289D124549433C41b54eF25BD423B162`
- Admin Manager: `0xF02840CdB0f08E6A88E1ACbd14120b1754ebd9fe`
- Treasury: `0xf72789416187386Af70c063ff54a1E107Bdbd573`
- Dispute Manager: `0xbcF01D2911C2fE5f938345225613aA0371b5eC8e`

---

## 🔥 Quick Start Flow

**For typical development session:**

1. **Kill any running processes:**
   ```bash
   npx kill-port 3000 3001 3002
   ```

2. **Start all services:**
   ```bash
   start-all.bat
   ```

3. **Open browser:**
   - Frontend: http://localhost:3000
   - AI Proxy status: http://localhost:3001/health
   - Monitor status: http://localhost:3002/status

4. **Done!** All services running with AI features enabled.

---

## 📂 Project Structure

```
blockcast_new/
├── src/
│   ├── components/        # React components
│   ├── services/          # Business logic & AI services
│   ├── utils/             # Helper functions
│   └── api/               # Backend servers
├── contracts/             # Smart contracts
├── scripts/               # Deployment & test scripts
├── docs/                  # Documentation (NEW)
├── archive/               # Old/unused files (NEW)
├── start-all.bat          # Full stack launcher
├── start.bat              # Frontend + AI launcher
└── start-simple.bat       # Frontend only launcher
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
npx kill-port 3000 3001 3002
```

### API Keys Not Working
Check `.env` file - make sure keys are properly set (without quotes)

### Services Won't Start
1. Check Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check `.env` file exists and has correct keys

### Frontend Can't Connect to AI
- Make sure AI Proxy is running on port 3001
- Check: http://localhost:3001/health

---

## 📚 Additional Resources

- Full documentation: `/docs` folder
- Contract ABIs: `/artifacts/contracts`
- Deployment logs: Check terminal output from `start-all.bat`

---

**Need help?** Check the docs folder for detailed guides on specific features.
