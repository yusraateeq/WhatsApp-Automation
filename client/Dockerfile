FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["node", "node_modules/next/dist/bin/next", "start"]
