# -----------------------------------------------------------------
# Stage 1: Build the Node.js app
# -----------------------------------------------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install app dependencies
RUN npm install --only=production

# -----------------------------------------------------------------
# Stage 2: Create the final production image
# -----------------------------------------------------------------
FROM node:18-alpine

WORKDIR /app

# Copy the installed node_modules from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules

#
# --- THIS IS THE CRITICAL FIX ---
#
# We are now copying *only* the files we need.
# This prevents a local node_modules folder from overwriting
# the one we just installed in the container.
COPY server.js database.js ./

# Expose port 3000
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]