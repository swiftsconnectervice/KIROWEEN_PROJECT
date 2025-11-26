# Code Quality Rules

- All MCP methods must have timeout protection (max 5000ms)
- Agent decisions must be logged with context
- No console.log, use winston logger
- All errors must be typed (CustomError extends Error)
- Mock data must be deterministic (same seed = same output)