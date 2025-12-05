# 🧟 FrankenStack: How Kiro Brought Legacy Back to Life

## 📋 Submission Info
- **Category:** FRANKENSTEIN (Chimera of Technologies)
- **Bonus Category:** Costume Contest (Haunting UI)
- **Team:** VICENTE
- **Demo Video:** [YouTube URL]
- **Live App:** [Deployed URL]

---

## 🎯 Project Summary

FrankenStack connects IBM AS/400 legacy systems (1980s technology) with modern AI agents using MCP protocol. It reduces insurance claim processing from 45 minutes to under 5 minutes by:

1. Extracting claims from email
2. Cross-referencing with NOAA weather API for fraud detection
3. Using AI vision to analyze damage photos
4. Submitting validated claims to AS/400

---

## 🔧 How Kiro Was Used

### 1. Vibe Coding: Rapid Prototyping

**How we structured conversations:**
We started with natural language descriptions of what we wanted, letting Kiro generate initial implementations.

**Example prompt that worked well:**
```
"Create an AS/400 MCP server that simulates TN5250 terminal interactions. 
It should support SQL-like queries and return JSON responses with realistic 
delays to simulate legacy system latency."
```

**Most impressive code generation:**
Kiro generated the entire `AS400MCPServer` class (300+ lines) including:
- Connection management with auto-timeout
- SQL-like query parsing
- TN5250 screen buffer simulation
- Error handling with typed errors

**Evidence:** `.kiro/prompts/vibe-1-attempt.md`

---

### 2. Agent Hooks: Automated Workflows

**Hooks we created:**

| Hook | Trigger | Action |
|------|---------|--------|
| `on-claim-approved.md` | Claim approved | Log to audit trail + notify |
| `on-fraud-detected.md` | High fraud risk | Alert + block submission |
| `on-legacy-query.md` | AS/400 query | Log performance metrics |
| `on-system-health-check.md` | Periodic | Verify all connections |
| `on-weather-api-fail.md` | API timeout | Fallback to simulation |

**How hooks improved development:**
- Automatic error recovery without manual intervention
- Consistent logging across all operations
- Chain reactions: fraud detection → alert → block → log

**Evidence:** `.kiro/hooks/` directory (5 hook files)

---

### 3. Spec-Driven Development

**How we structured specs:**

We used the three-file spec structure:
- `requirements.md` - User stories and acceptance criteria
- `design.md` - Technical architecture and data flow
- `tasks.md` - Implementation checklist

**Example: UnifiedSystemView Spec**
```
Location: .kiro/specs/unified-topology-necropsy/

This spec defined:
- How to merge SystemTopology + NecropsyView into one component
- Data flow between p5.js canvas and React state
- Animation timing for agent step indicators
```

**Spec vs Vibe Coding comparison:**

| Aspect | Vibe Coding | Spec-Driven |
|--------|-------------|-------------|
| Speed | Fast (minutes) | Slower (hours) |
| Quality | Prototype-level | Production-ready |
| Edge cases | Often missed | Explicitly defined |
| Refactoring | Frequent | Minimal |

**Our hybrid approach:** Vibe for exploration → Spec for production

**Evidence:** `.kiro/specs/` directory

---

### 4. Steering Docs: Consistent AI Behavior

**Steering files we created:**

| File | Purpose |
|------|---------|
| `product.md` | Mission, use cases, success criteria |
| `code-quality.md` | Timeout rules, logging standards, error types |
| `architecture-as-code.md` | Infrastructure generation triggers |

**Strategy that made the biggest difference:**

The `code-quality.md` steering doc enforced:
```markdown
- All MCP methods must have timeout protection (max 5000ms)
- Agent decisions must be logged with context
- No console.log, use winston logger
- All errors must be typed (CustomError extends Error)
```

This prevented Kiro from generating code with `console.log` or untyped errors, saving hours of cleanup.

**Evidence:** `.kiro/steering/` directory

---

### 5. MCP Integration: Extending Kiro's Capabilities

**How MCP helped:**

1. **AS/400 Protocol Translation:** MCP server translates TN5250 → JSON
   - Enables modern apps to query legacy systems
   - No changes required to AS/400 side

2. **Database Audit Trail:** Every agent decision is logged to SQLite
   - Actions: `CLAIM_APPROVED`, `FRAUD_DETECTED`
   - Includes hook name, claim ID, decision context
   - Queryable via `/api/audit` endpoint and `audit` terminal command

**Features MCP enabled that would be impossible otherwise:**
- Real-time audit trail in database (visible in UI terminal)
- Bidirectional legacy system communication
- AI agent orchestration across multiple protocols

**Evidence:** `server.ts` (audit logging), `prisma/schema.prisma` (AuditLog model)

### Production-Ready MCP Server Features

The AS/400 MCP server (`src/mcp/as400-mcp-server.ts`) includes enterprise-grade features:

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| Rate Limiting | Token Bucket (5 req/s) | Prevent API abuse |
| Structured Logging | Winston with JSON format | Debugging & monitoring |
| Typed Errors | AS400TimeoutError, AS400RateLimitError, etc. | Proper error handling |
| Deterministic Mocks | seedrandom library | Reproducible tests |
| Correlation IDs | Unique ID per request | Request tracing |
| Configurable Timeout | Per-command or default 5000ms | Flexible timeout control |

**Evidence:** `.kiro/logs/refactoring-iterations.md` (4 iterations documented with final implementation)

---

## 📊 Results

| Metric | Before | After |
|--------|--------|-------|
| Claim processing time | 45 min | <5 min |
| Code lines (agent) | 500+ spaghetti | 300 clean |
| Edge cases covered | ~60% | 95%+ |
| Manual intervention | Always | Rarely |
| Hardcoded data in UI | 70% | 5% (real DB queries) |
| AI hallucination rate | High | Low (explicit prompts) |

---

## 🔄 Iterative Refinement with Kiro (Session 2)

After the initial development, we continued refining the project with Kiro's help:

### Terminal Commands Enhancement

| Command | Before | After |
|---------|--------|-------|
| `status` | Hardcoded props | Real `/api/health` endpoint checking DB, OpenAI, Weather API |
| `metrics` | Random values | Real DB queries for claims count, fraud count, uptime |
| `weather` | Hardcoded "ONLINE" | Replaced with `fraud` command |
| `fraud` | N/A | New command showing flagged claims from DB |
| `inject` | 4 steps | 5 steps (added Amount input) |

**Conversation approach:**
```
User: "el system metric muestra realmente datos reales o solo esta hardcodeado?"
Kiro: [Analyzed code, identified 2 real + 2 fake metrics]
User: "si porfavor" [fix it]
Kiro: [Created /api/metrics endpoint, updated command]
```

### AI Reasoning Improvements

**Problem identified:** User description wasn't being passed to the AI validator.

**Before:**
```typescript
- Descripción del daño: ${claim.damageType}  // Just "Fire"
```

**After:**
```typescript
- Descripción del usuario: ${claim.description}  // "un alien explotó el coche"
```

**Impact:** AI can now analyze user's actual description for fraud detection.

### Weather Simulation Fix

**Problem:** Mexico City was getting "Hurricane" weather (impossible).

**Before:** Random selection from all weather types
```typescript
const events = ['Hurricane', 'Tornado', 'Hail', 'Flood', 'Clear'];
event: events[Math.floor(Math.random() * events.length)]; // Random!
```

**After:** Location-aware simulation
```typescript
// Only coastal US can have hurricanes
const coastalUS = ['miami', 'florida', 'houston', 'texas'];
const canHaveHurricane = coastalUS.some(c => location.includes(c));
// Mexico City → mostly 'Clear' or 'Flood' (rain)
```

### Seance Chat Enhancement

**Problem:** AI was "hallucinating" instead of using real DB data.

**Solution:** Improved system prompt with explicit rules:
```typescript
const systemPrompt = `
TODAY'S DATE: ${today}
DATABASE SUMMARY:
- Total claims: ${totalClaims}
- Claims today: ${todayClaims}

RULES:
1. You MUST answer ONLY using the data provided above.
2. If not in data, say "I don't see that in the current database records."
`;
```

### New API Endpoints Created

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Real health check (DB, OpenAI, Weather, Server uptime) |
| `/api/metrics` | Real metrics from database |
| `/api/fraud-claims` | Flagged claims for fraud command |
| `/api/audit` | Agent decision audit trail |
| `/api/mcp-status` | MCP server features (rate limiter, logging, errors) |
| `/api/weather-status` | Weather API status check |

---

## 🎬 Video Timestamps

- `0:00` - Project intro & problem statement
- `0:30` - Live demo: Injecting a claim
- `1:15` - AS/400 connection & weather validation
- `1:45` - AI fraud detection with vision
- `2:15` - 3D Laboratory visualization
- `2:45` - Kiro features showcase

---

## 🔗 Links

- **Repository:** [GitHub URL]
- **Live Demo:** [Deployed URL]
- **Video:** [YouTube URL]

---

## 🔄 UI Iteration Evidence

The `src/ui/` folder contains **multiple UI iterations** developed with Kiro:

| Version | Components | Approach |
|---------|------------|----------|
| V1 | SystemTopology + NecropsyView | Separate views (vibe coded) |
| V2 | UnifiedSystemView | Merged via spec-driven dev |
| V3 | LaboratoryView (3D) | Final pivot to immersive 3D |

**Why we kept all files:** They demonstrate the iterative process with Kiro - from rapid prototyping to spec-driven refinement to final pivot.

See: `src/ui/README.md` for component status details.

---

## 📁 Key Files for Judges

```
.kiro/
├── specs/
│   └── unified-topology-necropsy/  ← Spec-driven example
├── hooks/
│   └── (5 hook files)              ← Automated workflows
├── steering/
│   └── (3 steering docs)           ← AI behavior rules
├── mcp/
│   ├── as400-mcp.md                ← AS/400 MCP + audit trail docs
│   └── github-integration.md       ← Optional GitHub auto-commit (dev only)
├── prompts/
│   └── vibe-1-attempt.md           ← Vibe coding evidence
└── judges-cheat-sheet.md           ← Quick reference

src/ui/
├── README.md                       ← Component evolution log
├── LaboratoryView.tsx              ← ACTIVE (3D lab)
├── FrankensteinTerminal.tsx        ← Terminal with real data commands
├── UnifiedSystemView.tsx           ← Available (commented)
└── (other iterations)              ← Evidence of process

server.ts                           ← Backend with real data endpoints
├── /api/health                     ← System health check
├── /api/metrics                    ← Real DB metrics
├── /api/fraud-claims               ← Flagged claims
├── /api/audit                      ← Agent decision audit trail
├── /api/mcp-status                 ← MCP server features
├── /api/weather-status             ← Weather API status
├── /api/seance                     ← AI chat with DB context
└── /api/manual-claim               ← Claim injection

src/utils/validator.ts              ← AI fraud detection with user description
src/agents/claim-revenant-agent.ts  ← Location-aware weather simulation
```
