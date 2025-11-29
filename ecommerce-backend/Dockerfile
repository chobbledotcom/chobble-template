FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy application code
COPY server.js .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run as non-root user for security
USER node

CMD ["node", "server.js"]
