# Hook Chain Execution Log
## Complex Agent Workflow with Cascading Hooks

> **Implementation Note:** This document describes the designed hook chain workflow. 
> In the current implementation, hooks are triggered via `console.log` statements 
> and the audit trail is stored in the SQLite database (`AuditLog` table). 
> External integrations (Jira tickets, email notifications) are simulated for demo purposes.
> Use the `audit` command in the terminal to see real decision logs.

**Scenario:** Insurance claim processing with API failure, fraud detection, and approval workflow  
**Date:** 2025-11-13 14:32:15 UTC  
**Claim ID:** CLM-2025-847  
**Claimant:** Sarah Martinez  

---

## Event Timeline

### 🟢 Event 1: Agent Starts Claim Processing
**Timestamp:** 14:32:15.123  
**Component:** ClaimRevenantAgent  

```
[ClaimRevenant] Starting claim processing for email: email-2025-847
[ClaimRevenant] Parsed claim ID: CLM-2025-847
```

---

### 🔴 Event 2: Weather API Failure
**Timestamp:** 14:32:15.456  
**Component:** NOAA Weather API  
**Error:** Connection timeout after 5000ms

```
[WeatherAPI] ERROR: Request timeout - NOAA API not responding
```

**Trigger:** `on-weather-api-fail` hook activated

---

### 🔵 Hook A: on-weather-api-fail
**Timestamp:** 14:32:15.458  
**Trigger:** NOAA Weather API failure  
**Action:** Fallback to cached weather database

```typescript
onWeatherApiFail('Miami, FL')
  ↓
  getWeatherFromCache('Miami, FL')
  ↓
  return { location: 'Miami, FL', event: 'Clear', fromCache: true }
```

**Log Output:**
```
HOOK: Triggering weather API fallback.
HOOK: Weather API failed. Checking cache for Miami, FL...
CACHE_HIT: Found weather data from 2025-11-12 (1 day old)
```

**Result:** ✅ Cached data retrieved  
**Next Step:** Continue validation with cached data

---

### 🟡 Event 3: Fraud Detection Analysis
**Timestamp:** 14:32:16.892  
**Component:** ClaimRevenantAgent.validateClaimWithWeather()  

```
[ClaimRevenant] Validation result: INVALID
[ClaimRevenant] Fraud risk: HIGH

Validation Reasons:
  ❌ Damage type 'Hurricane' does not match weather event 'Clear'
  ❌ Claim amount $42,500 unusually high for clear weather
```

**Fraud Score:** 87/100 (HIGH RISK)  
**Trigger:** `on-fraud-detected` hook activated

---

### 🔵 Hook B: on-fraud-detected
**Timestamp:** 14:32:16.895  
**Trigger:** Fraud risk score > 80  
**Action:** Create Jira ticket for manual review

```typescript
onFraudDetected('CLM-2025-847', 'Weather mismatch: Hurricane claim during clear weather')
  ↓
  createJiraTicket('CLM-2025-847', 'Weather mismatch...')
  ↓
  return { success: true, ticketId: 'JIRA-CLM-2025-847' }
```

**Log Output:**
```
HOOK: Fraud detected on CLM-2025-847.
JIRA_API: Creating ticket for fraudulent claim CLM-2025-847
JIRA_API: Ticket created: JIRA-CLM-2025-847
```

**Result:** ✅ Jira ticket created  
**Next Step:** Conditional approval for manual review

---

### 🟢 Event 4: Conditional Approval Decision
**Timestamp:** 14:32:16.920  
**Component:** ClaimRevenantAgent  

```
[ClaimRevenant] Decision: APPROVE FOR MANUAL REVIEW
[ClaimRevenant] Rationale: API failure may have caused false positive
```

**Trigger:** `on-claim-approved` hook activated

---

### 🔵 Hook C: on-claim-approved
**Timestamp:** 14:32:16.922  
**Trigger:** Claim approved for manual review  
**Action:** Send email notification to adjuster

```typescript
onClaimApproved('CLM-2025-847')
  ↓
  sendApprovalEmail('CLM-2025-847')
  ↓
  return { success: true }
```

**Log Output:**
```
HOOK: Claim CLM-2025-847 approved. Triggering email.
EMAIL_API: Sending approval notification for CLM-2025-847
EMAIL_API: To: adjuster-team@insurance.com
EMAIL_API: Status: SENT ✓
```

**Result:** ✅ Email sent  
**Next Step:** AS/400 legacy query

---

### 🟣 Event 5: AS/400 Legacy Query
**Timestamp:** 14:32:17.105  
**Component:** AS400MCPServer  

```
[AS400] Executing command: INSERT INTO CLAIMS VALUES (...)
[AS400] Execution time: 3247ms
```

**Query Duration:** 3247ms (exceeds 3000ms threshold)  
**Trigger:** `on-legacy-query` hook activated

---

### 🔵 Hook D: on-legacy-query
**Timestamp:** 14:32:17.108  
**Trigger:** Query execution time > 3000ms  
**Action:** Log slow query to performance log

```typescript
onLegacyQuery('INSERT INTO CLAIMS VALUES (...)', 3247)
  ↓
  fs.appendFileSync('.kiro/logs/performance.md', logEntry)
```

**Log Output:**
```
HOOK: Slow query detected and logged.
PERFORMANCE_LOG: Query took 3247ms (threshold: 3000ms)
```

**Result:** ✅ Performance issue logged  
**Next Step:** System health check

---

### 🟢 Event 6: System Health Check
**Timestamp:** 14:32:17.500  
**Component:** System Monitor  

```
[SystemMonitor] Checking AS/400 connection: ✓ Connected
[SystemMonitor] Checking Weather API: ✗ Degraded (using cache)
```

**Trigger:** `on-system-health-check` hook activated

---

### 🔵 Hook E: on-system-health-check
**Timestamp:** 14:32:17.502  
**Trigger:** Scheduled health check  
**Action:** Update dashboard status

```typescript
onSystemHealthCheck(mcpServer)
  ↓
  updateDashboardStatus('DEGRADED')
```

**Log Output:**
```
HOOK: Running system health check...
HEALTH_CHECK: Weather API: DEGRADED (fallback to cache active)
UI_UPDATE: System health is DEGRADED
```

**Result:** ✅ Dashboard updated

---

## Hook Chain Summary

### Visual Flow

```
Weather API Fail
      ↓
🔵 Hook A (on-weather-api-fail)
      ↓
Cached Data → Fraud Detection
      ↓
🔵 Hook B (on-fraud-detected)
      ↓
Jira Ticket → Conditional Approval
      ↓
🔵 Hook C (on-claim-approved)
      ↓
Email Sent → AS/400 Insert (SLOW)
      ↓
🔵 Hook D (on-legacy-query)
      ↓
Performance Log → Health Check
      ↓
🔵 Hook E (on-system-health-check)
      ↓
Dashboard Update
```

### Hook Activation Sequence

| Order | Hook | Trigger | Action |
|-------|------|---------|--------|
| 1 | on-weather-api-fail | API timeout | Return cached data |
| 2 | on-fraud-detected | Fraud score > 80 | Create Jira ticket |
| 3 | on-claim-approved | Manual review | Send email |
| 4 | on-legacy-query | Query > 3000ms | Log performance |
| 5 | on-system-health-check | Post-processing | Update dashboard |

---

## Final State

**Claim Status:** PENDING_MANUAL_REVIEW  
**Fraud Risk:** HIGH  
**Jira Ticket:** JIRA-CLM-2025-847  
**Processing Time:** 2.377 seconds ✅  
**Hooks Triggered:** 5  
**System Status:** DEGRADED (Weather API)

---

## Key Insights

The hook chain transformed a potential failure into a successful outcome:
- Weather API failure → Automatic fallback to cache
- High fraud risk → Automatic Jira ticket creation
- Conditional approval → Email notification sent
- Slow query → Performance logged for optimization
- System degradation → Dashboard updated, ops alerted

**Result:** Claim successfully routed for manual review with full context despite API failure.
