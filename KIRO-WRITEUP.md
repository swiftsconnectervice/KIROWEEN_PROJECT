# 🧟 FrankenStack: How Kiro Brought Legacy Back to Life

## 📋 Submission Info
- **Category:** FRANKENSTEIN (Chimera of Technologies)
- **Bonus Category:** Costume Contest (Haunting UI)
- **Team:** [Your Team Name]
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

1. **GitHub Auto-Commit:** Every claim decision is automatically committed to git
   - File: `src/agents/claim-revenant-agent.ts` → `commitDecisionToGitHub()`
   - Documentation: `.kiro/mcp/github-integration.md`

2. **AS/400 Protocol Translation:** MCP server translates TN5250 → JSON
   - Enables modern apps to query legacy systems
   - No changes required to AS/400 side

**Features MCP enabled that would be impossible otherwise:**
- Real-time audit trail in git history
- Bidirectional legacy system communication
- AI agent orchestration across multiple protocols

**Evidence:** `.kiro/mcp/github-integration.md`

---

## 📊 Results

| Metric | Before | After |
|--------|--------|-------|
| Claim processing time | 45 min | <5 min |
| Code lines (agent) | 500+ spaghetti | 300 clean |
| Edge cases covered | ~60% | 95%+ |
| Manual intervention | Always | Rarely |

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
│   └── github-integration.md       ← MCP documentation
├── prompts/
│   └── vibe-1-attempt.md           ← Vibe coding evidence
└── judges-cheat-sheet.md           ← Quick reference

src/ui/
├── README.md                       ← Component evolution log
├── LaboratoryView.tsx              ← ACTIVE (3D lab)
├── UnifiedSystemView.tsx           ← Available (commented)
└── (other iterations)              ← Evidence of process
```
