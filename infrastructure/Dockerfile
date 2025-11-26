# FrankenStack MCP Server - Multi-stage Docker Build
# Optimized for AS/400 legacy system integration

# Stage 1: Build
FROM node:20-alpine AS builder

LABEL maintainer="FrankenStack Team"
LABEL description="AS/400 MCP Server for Legacy-to-AI Integration"
LABEL version="1.0.0"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY .kiro/ ./.kiro/

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Runtime
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=nodejs:nodejs .kiro/steering/*.md ./.kiro/steering/

# Create logs directory
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    AS400_TIMEOUT=5000 \
    RATE_LIMIT_MAX_REQUESTS=5

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 3000

# Use tini as init system (proper signal handling)
ENTRYPOINT ["/sbin/tini", "--"]

# Start MCP server
CMD ["node", "dist/mcp/as400-mcp-server.js"]
