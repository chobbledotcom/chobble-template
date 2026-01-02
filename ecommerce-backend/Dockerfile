FROM node:22-alpine

# Install bun for fast package installation
RUN npm install -g bun

WORKDIR /app

# Copy package files and install dependencies with bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy application code
COPY server.js .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run as non-root user for security
USER node

# Use node to run Express server (bun's HTTP auto-detection has issues with Express)
CMD ["node", "server.js"]
