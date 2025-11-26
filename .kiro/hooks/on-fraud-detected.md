// src/hooks/on-fraud-detected.ts
// Trigger: Agent flags a claim as "INVESTIGATE"
// Action: Auto-create Jira ticket (mocked)

// Mock function for Jira API
const createJiraTicket = (claimId: string, reason: string) => {
  console.log(`JIRA_API: Creating ticket for fraudulent claim ${claimId}. Reason: ${reason}`);
  return { success: true, ticketId: `JIRA-${claimId}` };
};

export function onFraudDetected(claimId: string, reason: string) {
  console.log(`HOOK: Fraud detected on ${claimId}.`);
  createJiraTicket(claimId, reason);
  // ¡Este hook podría disparar otro hook!
}