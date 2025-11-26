// src/hooks/on-agent-log.ts

/**
 * Kiro Agent Hook: Auto-documentation
 * Trigger: When agent processes a claim
 * Action: Appends log entry to .kiro/logs/execution-log.md
 */

import * as fs from 'fs';

export function onAgentExecution(claimId: string, decision: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] Claim ${claimId} → ${decision}`;
  
  fs.appendFileSync('.kiro/logs/execution-log.md', logEntry);
}