FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --production

# Copy bot source
COPY bot/ ./bot/

# Create non-root user
RUN addgroup -g 1001 -S botuser && \
    adduser -S botuser -u 1001 && \
    chown -R botuser:botuser /app

USER botuser

EXPOSE 4100

# Default to API server (override for worker)
CMD ["node", "bot/src/index.js"]
