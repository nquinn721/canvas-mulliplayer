# Multi-stage Docker build for Canvas Multiplayer Game
# Stage 1: Build the client (React/Vite)
FROM node:18-alpine AS client-builder

WORKDIR /app

# Copy shared folder first (needed by client)
COPY shared/ ./shared/

# Copy client package files
COPY client/package*.json ./client/

# Install ALL dependencies (including devDependencies) for build
WORKDIR /app/client
RUN npm ci

# Copy client source code
COPY client/ ./

# Build the client for production
RUN npm run build

# Stage 2: Build the server (NestJS)
FROM node:18-alpine AS server-builder

WORKDIR /app

# Copy root package files and shared code
COPY package*.json ./
COPY shared/ ./shared/

# Copy server package files
COPY src/ ./src/
COPY *.json ./
COPY *.js ./

# Install ALL dependencies (including devDependencies) for build
RUN npm ci

# Build the server
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Set the working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built server from builder stage
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/shared ./shared

# Copy built client from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Copy any additional runtime files
COPY --from=server-builder /app/*.json ./

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Set default environment to production (can be overridden by Cloud Run)
ENV NODE_ENV=production

# Expose the port that the app runs on
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "dist/src/main.js"]
