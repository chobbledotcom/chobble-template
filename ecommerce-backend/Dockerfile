FROM oven/bun:alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN bun install --production

# Copy application code
COPY server.js .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run as non-root user for security
USER bun

CMD ["bun", "server.js"]
