# Judges' Cheat Sheet: FrankenStack

## Kiro Feature Showcase (Where to find each feature)

* **Spec-Driven Generation (AI as Architect):**
    * `.kiro/steering/product.md` (The mission statement)
    * `.kiro/specs/as400-mcp-spec.md` (AI-generated technical blueprint)

* **Iterative Refactoring (V1 -> V2 Evidence):**
    * `.kiro/prompts/spec-forensics.md` (Analysis of "bad code")
    * `.kiro/logs/refactoring-iterations.md` (Log of 4 iterations to fix MCP server)
    * `.kiro/logs/agent-refactoring-fixes.md` (Bug fixes in ClaimRevenant agent)

* **Hooks (Nervous System / Orchestration):**
    * `.kiro/hooks/` (The 5 system "reflexes")
    * `.kiro/logs/hooks-chain.md` (Hook chain execution proof)

* **Infrastructure-as-Spec (AI as DevOps):**
    * `.kiro/steering/architecture-as-code.md` (The infra "generator")
    * `/infrastructure/template.yaml` (AWS SAM template)
    * `Dockerfile.bak` (Docker config - currently deployed on Render.com)

* **Real MCP Integration (Real World Connection):**
    * `.kiro/mcp/as400-mcp.md` (AS/400 TN5250 protocol translation)
    * `server.ts` (Database audit trail - see `/api/audit` endpoint)
    * `prisma/schema.prisma` (AuditLog model for decision tracking)
    * `src/mcp/as400-mcp-server.ts` (Full implementation with rate limiting, typed errors, winston logging)

* **Test Generation (Assault Test Suite):**
    * `src/agents/claim-revenant-agent.test.ts` (Edge case tests)

* **Why Kiro Was Essential:**
    * `.kiro/WHY-KIRO-WAS-NECESSARY.md` (Detailed breakdown of failed attempts vs Kiro success)

## Quick Demo Commands

| Command | What it shows |
|---------|---------------|
| `claims` | Process claims from AS/400 with AI validation |
| `inject` | Submit a new claim with 5-step wizard |
| `fraud` | Show flagged/suspicious claims |
| `audit` | Show agent decision audit trail from database |
| `mcp` | Show MCP server features (rate limiter, logging, typed errors) |
| `seance <question>` | Chat with AI about your data |
| `status` | Real health check of all services |
| `metrics` | Real database statistics |