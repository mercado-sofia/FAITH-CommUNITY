# Use Node.js 18 as base image
FROM node:18

# Set working directory to /app
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend application
COPY backend/ ./

# Expose the port Railway will use
EXPOSE 8080

# Start the application
CMD ["node", "app.js"]

