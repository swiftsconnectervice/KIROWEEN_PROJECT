# 🧟⚡ FrankenStack: Legacy-to-AI Connector

> **Kiroween Hackathon 2025 Submission**  
> *Resurrecting AS/400 for Modern AI Agents*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎃 Submission Info

| Field | Value |
|-------|-------|
| **Category** | 🧪 FRANKENSTEIN (Chimera of Technologies) |
| **Bonus** | 🎨 Costume Contest (Haunting UI) |
| **Demo Video** | [YouTube Link - 3 min](YOUR_YOUTUBE_URL) |
| **Live App** | [Deployed URL](YOUR_DEPLOYED_URL) |
| **Kiro Write-up** | [KIRO-WRITEUP.md](./KIRO-WRITEUP.md) |

---

## 🎯 What is FrankenStack?

FrankenStack connects **IBM AS/400 legacy systems** (1980s technology) with **modern AI agents** using MCP protocol. 

**The Problem:** Insurance claim processing takes 45+ minutes of manual terminal work.

**Our Solution:** AI agents that:
1. 📧 Extract claims from email
2. 🌦️ Cross-reference with NOAA weather API (fraud detection)
3. 🤖 Use AI vision to analyze damage photos
4. 💾 Submit validated claims to AS/400 in seconds

**Result:** Processing time reduced from **45 minutes → under 5 minutes**

---

## 🔧 Kiro Features Used

| Feature | Location | Description |
|---------|----------|-------------|
| **Specs** | `.kiro/specs/` | 3 spec documents for structured development |
| **Hooks** | `.kiro/hooks/` | 5 agent hooks for automated workflows |
| **Steering** | `.kiro/steering/` | 3 docs for consistent AI behavior |
| **MCP** | `.kiro/mcp/` | GitHub auto-commit integration |
| **Vibe Coding** | `.kiro/prompts/` | Rapid prototyping evidence |

📖 **Full write-up:** [KIRO-WRITEUP.md](./KIRO-WRITEUP.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API Key
- OpenWeather API Key (optional)

### Installation
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/frankenstack.git
cd frankenstack

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start everything
npm run dev:full
```

### Access
- **Frontend:** http://localhost:5173
- **API Backend:** http://localhost:4000

---

## 📁 Project Structure

```
frankenstack/
├── .kiro/                    # 🎯 KIRO FEATURES (DO NOT IGNORE)
│   ├── specs/                # Spec-driven development
│   ├── hooks/                # Agent hooks (5 workflows)
│   ├── steering/             # AI behavior rules
│   ├── mcp/                  # MCP integrations
│   └── prompts/              # Vibe coding evidence
├── src/
│   ├── agents/               # ClaimRevenant AI Agent
│   ├── mcp/                  # AS/400 MCP Server
│   ├── ui/                   # React + Three.js UI
│   └── utils/                # Parsers & validators
├── infrastructure/           # Docker + AWS SAM
├── public/model3d/           # 3D Tesla coil models
└── server.ts                 # Express backend
```

---

## 🎬 Demo Walkthrough

1. **Claim Injector** - Submit a claim with damage photo
2. **AS/400 Connection** - Watch legacy system come alive
3. **Weather Validation** - NOAA cross-reference for fraud
4. **AI Decision** - Approve/Investigate/Reject
5. **3D Laboratory** - Tesla coils activate on processing

---

## 🖥️ UI Components

### Main Dashboard
`FrankenStackDashboard.tsx` - Command center with:
- Real-time system topology
- ECG-style connection monitor
- Claim injector modal
- Séance chat (talk to your data)

### 3D Laboratory
`LaboratoryView.tsx` - Three.js scene with:
- Vintage computer 3D model
- Tesla coils with electric effects
- DNA helix animations
- Interactive terminal zoom

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
OPENAI_API_KEY=sk-...          # Required
OPENWEATHER_API_KEY=...        # Optional (falls back to simulation)
GITHUB_PERSONAL_ACCESS_TOKEN=  # Optional (for auto-commit)
PORT=4000                      # Optional
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- claim-revenant-agent
```

---

## 📜 License

MIT License - See [LICENSE](./LICENSE)

---

## 👻 Happy Kiroween!

*"It's alive... IT'S ALIVE!"* - Dr. Frankenstein, probably talking about his AS/400
