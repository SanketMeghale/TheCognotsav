FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built frontend
COPY dist ./dist

# Copy server code
COPY server ./server

# Copy environment file (you'll need to create this)
COPY .env ./

# Expose port
EXPOSE 8787

# Start the server
CMD ["npm", "run", "server"]