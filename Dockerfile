
# syntax=docker/dockerfile:1

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Set environment variable for SPX_ROOT_FOLDER
ENV SPX_ROOT_FOLDER=/app

# Expose default port
EXPOSE 5656

# Start the server
CMD ["node", "server.js", "config.json"]
