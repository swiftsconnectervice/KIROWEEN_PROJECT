// src/hooks/on-claim-approved.md
// Trigger: Agent flags a claim as "APPROVE"
// Action: Dispara email (mocked)

// Mock function for email API
const sendApprovalEmail = (claimId: string) => {
  console.log(`EMAIL_API: Sending approval notification for ${claimId}`);
  return { success: true };
};

export function onClaimApproved(claimId: string) {
  console.log(`HOOK: Claim ${claimId} approved. Triggering email.`);
  sendApprovalEmail(claimId);
}