# FrankenStack - Production Dockerfile
# Node 20 required for Vite 7

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first (better caching)
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build frontend (Vite)
RUN npm run build

# Build server + all TypeScript (keeps relative imports working)
RUN npx tsc -p tsconfig.node.json || true

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy public assets (3D models, etc)
COPY --from=builder /app/public ./public

# Copy ALL source (server runs with ts-node in prod for simplicity)
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# Install ts-node for runtime
RUN npm install ts-node typescript --save

# Environment
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Start server with ts-node (simpler than complex build)
CMD ["npx", "ts-node", "server.ts"]
