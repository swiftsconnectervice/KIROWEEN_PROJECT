# GitHub MCP Integration Guide

## Overview
This document explains how to integrate the GitHub MCP server with the ClaimRevenant agent for automatic commit tracking of agent decisions.

## Installation

The GitHub MCP server has been installed globally:

```bash
npm install -g @modelcontextprotocol/server-github
```

## Configuration

### 1. Generate GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `FrankenStack Agent MCP`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 2. Set Environment Variable

Add the token to your environment:

**Windows (PowerShell):**
```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN="<TU_TOKEN_PERSONAL_AQUI>"

# To make it permanent:
[System.Environment]::SetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', '<TU_TOKEN_PERSONAL_AQUI>', 'User')
```

**Windows (CMD):**
```cmd
set GITHUB_PERSONAL_ACCESS_TOKEN=<TU_TOKEN_PERSONAL_AQUI>

# To make it permanent:
setx GITHUB_PERSONAL_ACCESS_TOKEN "<TU_TOKEN_PERSONAL_AQUI>"
```

**Linux/Mac:**
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="<TU_TOKEN_PERSONAL_AQUI>"

# To make it permanent, add to ~/.bashrc or ~/.zshrc:
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="<TU_TOKEN_PERSONAL_AQUI>"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Verify Installation

Test that the MCP server is accessible:

```bash
# Check if installed globally
npm list -g @modelcontextprotocol/server-github

# Test git configuration
git config --global user.name
git config --global user.email
```

## How Kiro Uses the GitHub MCP

### Agent Integration

The ClaimRevenant agent (`src/agents/claim-revenant-agent.ts`) integrates with GitHub MCP as follows:

1. **After Decision Making**: Once the agent decides to APPROVE or INVESTIGATE a claim
2. **Log Creation**: Writes decision to `.kiro/logs/agent-decisions.log`
3. **Git Staging**: Stages the log file with `git add`
4. **Commit Creation**: Creates a commit with message format:
   ```
   [Agent] Processed claim CLM-2025-XXX. Decision: APPROVE
   ```
5. **Returns Commit Hash**: Stores the commit hash in the ProcessedClaim result

### Code Flow

```typescript
// In ClaimRevenantAgent.processClaim()
const decision = validationResult.isValid ? 'APPROVE' : 'INVESTIGATE';

// Commit to GitHub
const gitCommitHash = await this.commitDecisionToGitHub(claimId, decision);

// Result includes commit hash for audit trail
return {
  ...claim,
  decision,
  gitCommitHash
};
```

### MCP Server Location

Kiro will find the GitHub MCP server in one of these locations:

1. **Global npm modules**: `%APPDATA%\npm\node_modules\@modelcontextprotocol\server-github` (Windows)
2. **Global npm modules**: `/usr/local/lib/node_modules/@modelcontextprotocol/server-github` (Linux/Mac)
3. **Project local**: `node_modules/@modelcontextprotocol/server-github` (if installed locally)

The agent uses standard `git` commands via Node.js `child_process.exec()`, so it works with any Git installation.

## Security Best Practices

### ⚠️ Important Security Notes

1. **Never commit the token to Git**
   - Add to `.gitignore`: `*.env`, `.env.local`
   - Use environment variables only
   - Rotate tokens regularly (every 90 days)

2. **Token Permissions**
   - Use minimal required scopes
   - For this project: `repo` scope is sufficient
   - Avoid `admin` or `delete_repo` scopes

3. **Token Storage**
   - Store in environment variables
   - Use secret management tools in production (AWS Secrets Manager, Azure Key Vault)
   - Never hardcode in source files

4. **Audit Trail**
   - All commits are logged to `.kiro/logs/agent-decisions.log`
   - Git history provides complete audit trail
   - Review commits regularly: `git log --grep="[Agent]"`

## Troubleshooting

### Error: "GITHUB_PERSONAL_ACCESS_TOKEN not set"

**Solution**: Set the environment variable as described in Configuration section.

```bash
# Verify it's set
echo $GITHUB_PERSONAL_ACCESS_TOKEN  # Linux/Mac
echo %GITHUB_PERSONAL_ACCESS_TOKEN%  # Windows CMD
$env:GITHUB_PERSONAL_ACCESS_TOKEN    # Windows PowerShell
```

### Error: "Git commit failed"

**Possible causes:**
1. Git not configured with user name/email
2. No changes to commit
3. Repository not initialized

**Solution**:
```bash
# Configure Git
git config --global user.name "FrankenStack Agent"
git config --global user.email "agent@frankenstack.local"

# Initialize repository if needed
git init
git add .
git commit -m "Initial commit"
```

### Error: "Permission denied (publickey)"

**Solution**: The token should work over HTTPS, not SSH. Ensure remote URL uses HTTPS:

```bash
# Check remote URL
git remote -v

# If using SSH, switch to HTTPS
git remote set-url origin https://github.com/username/repo.git
```

## Usage Examples

### Manual Test

Test the GitHub integration manually:

```typescript
import { ClaimRevenantAgent } from './src/agents/claim-revenant-agent';

const agent = new ClaimRevenantAgent();

// Process a claim (will auto-commit decision)
const result = await agent.processClaim('test-email-123');

console.log(`Decision: ${result.decision}`);
console.log(`Commit Hash: ${result.gitCommitHash}`);
```

### View Agent Decisions

```bash
# View all agent decisions
cat .kiro/logs/agent-decisions.log

# View Git commits by agent
git log --grep="[Agent]" --oneline

# View specific claim decision
git log --grep="CLM-2025-847"
```

### Disable GitHub Integration

To disable automatic commits (e.g., in development):

```bash
# Unset the token
unset GITHUB_PERSONAL_ACCESS_TOKEN  # Linux/Mac
set GITHUB_PERSONAL_ACCESS_TOKEN=   # Windows CMD
$env:GITHUB_PERSONAL_ACCESS_TOKEN="" # Windows PowerShell
```

The agent will log a warning but continue processing claims without committing.

## Production Deployment

### AWS Lambda

When deploying to AWS Lambda, store the token in AWS Secrets Manager:

```yaml
# template.yaml
Environment:
  Variables:
    GITHUB_PERSONAL_ACCESS_TOKEN: !Sub '{{resolve:secretsmanager:frankenstack-github-token}}'
```

### Docker

Pass the token as an environment variable:

```bash
docker run -e GITHUB_PERSONAL_ACCESS_TOKEN="<TU_TOKEN_PERSONAL_AQUI>" frankenstack/agent
```

### GitHub Actions

Use GitHub Secrets:

```yaml
# .github/workflows/deploy.yml
env:
  GITHUB_PERSONAL_ACCESS_TOKEN: ${{ secrets.GITHUB_PERSONAL_ACCESS_TOKEN }}
```

## MCP Server Configuration (Optional)

For advanced usage, you can configure the MCP server in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "disabled": false,
      "autoApprove": [
        "create_or_update_file",
        "push_files",
        "create_repository"
      ]
    }
  }
}
```

## Audit and Compliance

### Viewing Audit Trail

```bash
# All agent decisions with timestamps
cat .kiro/logs/agent-decisions.log

# Git commit history
git log --grep="[Agent]" --pretty=format:"%h - %an, %ar : %s"

# Claims approved vs investigated
grep "APPROVE" .kiro/logs/agent-decisions.log | wc -l
grep "INVESTIGATE" .kiro/logs/agent-decisions.log | wc -l
```

### Compliance Reports

Generate compliance reports:

```bash
# Claims processed today
git log --grep="[Agent]" --since="1 day ago" --oneline

# High-risk claims flagged
git log --grep="INVESTIGATE" --since="1 week ago"
```

## References

- [GitHub MCP Server Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Support

For issues with GitHub MCP integration:
1. Check environment variable is set correctly
2. Verify Git is configured with user name/email
3. Review `.kiro/logs/agent-decisions.log` for errors
4. Test Git commands manually: `git status`, `git commit --allow-empty -m "test"`

---

**Last Updated**: 2025-11-13  
**Version**: 1.0.0
