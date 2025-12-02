# -----------------------------------------------------------------
# Stage 1: Build the Node.js app
# -----------------------------------------------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for tsc)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# -----------------------------------------------------------------
# Stage 2: Create the final production image
# -----------------------------------------------------------------
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm install --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/server.js"]
