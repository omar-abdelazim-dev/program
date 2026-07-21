# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for building if needed)
RUN npm ci

# Copy application source
COPY . .

# Production stage
FROM node:20-alpine AS production

# Set production environment
ENV NODE_ENV=production

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create a non-root user and group
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app /app

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/quarantine /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/quarantine /app/logs

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health/liveness || exit 1

# Start the application
CMD ["node", "server.js"]
