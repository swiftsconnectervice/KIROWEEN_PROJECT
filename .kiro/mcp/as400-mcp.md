# AS/400 MCP Server Documentation

## Overview

FrankenStack uses a custom MCP (Model Context Protocol) server to translate between modern JSON APIs and IBM AS/400 TN5250 terminal protocol.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React UI  │────▶│  MCP Server │────▶│   AS/400    │
│  (Terminal) │◀────│  (Node.js)  │◀────│  (TN5250)   │
└─────────────┘     └─────────────┘     └─────────────┘
      JSON              Translate           Screen
                                           Scraping
```

## Key Components

### 1. AS400MCPServer (`src/mcp/as400-server.ts`)

The MCP server that simulates TN5250 terminal interactions:

```typescript
class AS400MCPServer {
  // Connection management with auto-timeout (5000ms max)
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  
  // SQL-like query parsing
  async query(sql: string): Promise<QueryResult>
  
  // TN5250 screen buffer simulation
  private parseScreen(buffer: string): ScreenData
}
```

### 2. Protocol Translation

The MCP server translates:
- **Input:** SQL-like queries from the agent
- **Output:** JSON responses with realistic delays

Example:
```typescript
// Agent sends
await as400.query("SELECT * FROM CLAIMS WHERE STATUS = 'PENDING'");

// MCP translates to TN5250 commands
// F6 → New Query
// Type: SELECT * FROM CLAIMS...
// Enter → Execute

// Returns JSON
{
  rows: [...],
  screenBuffer: "...",
  responseTime: 1250 // Simulated legacy latency
}
```

## Audit Trail

All agent decisions are logged to the database for compliance:

### Database Schema (SQLite)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  action      String   // CLAIM_APPROVED, FRAUD_DETECTED
  claimId     String?
  decision    String?
  hookName    String?  // on-fraud-detected, on-claim-approved
  details     String?  // JSON with context
  source      String   @default("agent")
}
```

### API Endpoint

```
GET /api/audit
```

Returns the 20 most recent audit logs:

```json
{
  "logs": [
    {
      "id": "clx123...",
      "timestamp": "2025-12-05T12:00:00Z",
      "action": "CLAIM_APPROVED",
      "claimId": "CLM-2025-847",
      "decision": "APPROVE",
      "hookName": "on-claim-approved",
      "details": "{\"fraudRisk\":\"low\",\"savedToDb\":true}"
    }
  ],
  "total": 15
}
```

### Terminal Command

Use the `audit` command in the terminal to view recent decisions:

```
> audit
╔═══════════════════════════════════════════════════════════════╗
║            📝 AGENT DECISION AUDIT TRAIL                      ║
╠═══════════════════════════════════════════════════════════════╣
║  [12:00:00] CLAIM_APPROVED      CLM-2025-847                  ║
║    Hook: on-claim-approved                                    ║
║  [11:45:00] FRAUD_DETECTED      CLM-2025-846                  ║
║    Hook: on-fraud-detected                                    ║
╚═══════════════════════════════════════════════════════════════╝
```

## Hooks Integration

The MCP server triggers hooks based on agent decisions:

| Hook | Trigger | Action |
|------|---------|--------|
| `on-claim-approved` | Decision = APPROVE | Log to AuditLog + save claim |
| `on-fraud-detected` | Decision = INVESTIGATE | Log to AuditLog + block save |
| `on-legacy-query` | Any AS/400 query | Log performance metrics |

## Production Deployment

In production (Render.com), the MCP server:
1. Uses SQLite for persistent audit trail
2. Simulates AS/400 responses (no real mainframe connection)
3. All decisions are logged to `AuditLog` table

## Local Development

For local development with optional GitHub integration:

```bash
# Optional: Enable git auto-commit of decisions
export GITHUB_PERSONAL_ACCESS_TOKEN="your-token"
```

When set, decisions are also committed to `.kiro/logs/agent-decisions.log`.

---

**Last Updated:** 2025-12-05
**Version:** 2.0.0
