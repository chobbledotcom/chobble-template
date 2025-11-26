FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY server.js .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run as non-root user for security
USER node

CMD ["node", "server.js"]
