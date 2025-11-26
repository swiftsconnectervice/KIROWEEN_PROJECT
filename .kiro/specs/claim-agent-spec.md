# ClaimRevenant Agent Specification

## Trigger
ON(event: GmailNewEmail, from: "claims@spookisure.com")

## Workflow
1. EXTRACT claim data from email attachments
2. QUERY AS/400 MCP for customer policy
3. VALIDATE against NOAA Weather MCP
4. DECISION: 
   - APPROVE if weather matches damage
   - INVESTIGATE if mismatch
5. WRITE result to AS/400 MCP
6. NOTIFY Slack via MCP

## Error Handling
IF AS400_TIMEOUT → Retry 3x with exponential backoff
IF WEATHER_API_FAIL → Skip validation, flag for manual review