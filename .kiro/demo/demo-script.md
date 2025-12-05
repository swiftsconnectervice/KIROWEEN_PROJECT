# 🎬 FrankenStack Demo Script (3 Minutes)

> **Purpose:** Guide for recording the hackathon demo video.
> **Live App:** [Your Render URL]

---

## [0:00 - 0:15] Introduction

**Show:** FrankenStack logo / 3D Laboratory view

**Say:**
> "FrankenStack connects 1980s IBM AS/400 systems with modern AI agents. 
> We reduce insurance claim processing from 45 minutes to under 5 minutes."

---

## [0:15 - 0:45] The Problem

**Show:** Terminal with `status` command

**Say:**
> "Insurance companies still run on legacy mainframes. 
> Processing a single claim requires manual data entry, weather verification, and fraud checks."

**Type:** `status`

> "Our system connects to AS/400, OpenAI for fraud detection, and weather APIs - all orchestrated by AI agents."

---

## [0:45 - 1:30] Live Demo: Inject a Claim

**Show:** Terminal

**Type:** `inject`

**Say:**
> "Let's submit a claim. The wizard guides us through the process."

**Fill in:**
- Subject: `Insurance Claim - Hurricane Damage`
- Location: `Miami, FL`
- Description: `Roof destroyed by strong winds during hurricane`
- Amount: `25000`
- Image: Skip or upload a damage photo

**Say:**
> "Watch the AI agent process this in real-time..."

**Wait for result, then say:**
> "The agent checked weather data, analyzed the claim, and made a decision - all in seconds, not hours."

---

## [1:30 - 2:00] Fraud Detection

**Type:** `inject` (new claim)

**Fill in:**
- Subject: `Insurance Claim - Hurricane Damage`
- Location: `Mexico City, Mexico`
- Description: `Hurricane destroyed my house`
- Amount: `50000`

**Say:**
> "Now let's try a suspicious claim. Hurricane damage in Mexico City..."

**Wait for INVESTIGATE result:**
> "The agent detected fraud! Mexico City doesn't get hurricanes. 
> The claim was blocked and logged for investigation."

**Type:** `fraud`

> "We can see all flagged claims here."

---

## [2:00 - 2:30] Audit Trail & MCP Features

**Type:** `audit`

**Say:**
> "Every decision is logged to the database with full context - 
> which hook triggered, what the AI reasoned, and the final decision."

**Type:** `mcp`

**Say:**
> "Under the hood, our MCP server has enterprise features:
> rate limiting, structured logging, typed errors, and deterministic mocks for testing."

---

## [2:30 - 2:50] Kiro Features Showcase

**Show:** File explorer with `.kiro/` folder open

**Say:**
> "This was built with Kiro's spec-driven development.
> We have specs for architecture, hooks for automated workflows, 
> and steering docs that enforce code quality."

**Highlight:**
- `.kiro/specs/` - "Structured requirements"
- `.kiro/hooks/` - "5 automated workflows"
- `.kiro/steering/` - "AI behavior rules"

---

## [2:50 - 3:00] Closing

**Show:** 3D Laboratory with Tesla coils

**Say:**
> "FrankenStack: Resurrecting legacy systems with AI intelligence.
> It's alive!"

---

## Quick Commands Reference

| Command | What to show |
|---------|--------------|
| `status` | System health (DB, OpenAI, Weather) |
| `inject` | Submit a new claim |
| `claims` | Process batch claims |
| `fraud` | Show flagged claims |
| `audit` | Decision audit trail |
| `mcp` | MCP server features |
| `seance how many claims today?` | AI chat |
| `metrics` | Database statistics |

---

## Tips for Recording

1. **Clear the terminal first:** `clear`
2. **Have claims in DB:** Run `claims` before recording to populate data
3. **Prepare two claims:** One valid (Miami hurricane), one fraud (Mexico City hurricane)
4. **Show the 3D lab:** The Tesla coils are visually impressive
5. **Keep energy up:** This is a hackathon demo, be enthusiastic!
