# Multi-stage build for PDF Text MCP Server
# This Dockerfile builds both the native C++ addon and the TypeScript server

# Stage 1: Builder - Compile native addon and TypeScript
FROM node:20-bullseye AS builder

# Install build dependencies for native compilation
# Note: Installing CMake 3.24+ via pip to support FetchContent DOWNLOAD_EXTRACT_TIMESTAMP
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    libicu-dev \
    && pip3 install cmake \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root tsconfig.json (extended by package tsconfigs)
COPY tsconfig.json .

# Copy package files for both packages
COPY packages/pdf-parser/package*.json packages/pdf-parser/
COPY packages/mcp-server/package*.json packages/mcp-server/

# Install dependencies for pdf-parser
WORKDIR /app/packages/pdf-parser
RUN npm ci

# Copy pdf-parser source code
COPY packages/pdf-parser/ .

# Build native addon and TypeScript (parallel compilation enabled)
RUN npm run build

# Install dependencies for mcp-server
WORKDIR /app/packages/mcp-server
RUN npm ci

# Copy mcp-server source code
COPY packages/mcp-server/ .

# Build TypeScript
RUN npm run build

# Prune dev dependencies for production
WORKDIR /app/packages/pdf-parser
RUN npm prune --production

WORKDIR /app/packages/mcp-server
RUN npm prune --production

# Stage 2: Runtime - Slim image with only production dependencies
# Use bullseye-slim to match builder stage (Debian 11) for compatible library versions
FROM node:20-bullseye-slim

# Install runtime dependencies for native addon
# - libicu67: ICU Unicode library (for bidirectional text support)
# - libssl1.1: OpenSSL 1.1 (crypto library required by pdf-text-extraction)
RUN apt-get update && apt-get install -y \
    libicu67 \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r mcpserver && useradd -r -g mcpserver mcpserver

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/pdf-parser/dist /app/packages/pdf-parser/dist
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/pdf-parser/build /app/packages/pdf-parser/build
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/pdf-parser/node_modules /app/packages/pdf-parser/node_modules
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/pdf-parser/package.json /app/packages/pdf-parser/

COPY --from=builder --chown=mcpserver:mcpserver /app/packages/mcp-server/dist /app/packages/mcp-server/dist
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/mcp-server/node_modules /app/packages/mcp-server/node_modules
COPY --from=builder --chown=mcpserver:mcpserver /app/packages/mcp-server/package.json /app/packages/mcp-server/

# Switch to non-root user
USER mcpserver

# Set working directory to mcp-server
WORKDIR /app/packages/mcp-server

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Environment variables with defaults
ENV TRANSPORT_MODE=http \
    PORT=3000 \
    HOST=0.0.0.0 \
    MAX_FILE_SIZE=104857600 \
    TIMEOUT=30000

# Start the server
CMD ["node", "dist/index.js"]
