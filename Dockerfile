# Multi-stage build for Node.js backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY elscholar-api/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY elscholar-api/ ./

# Build backend if needed
RUN npm run build || echo "No build script found"

# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY elscholar-ui/package*.json ./
RUN npm ci

# Copy source code
COPY elscholar-ui/ ./

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p /app/backend/uploads/audio

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 34567

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:34567/health || exit 1

# Start command
CMD ["node", "backend/src/index.js"]
