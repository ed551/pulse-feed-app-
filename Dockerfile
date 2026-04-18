# Use the official Node.js image
FROM node:20

# Create and change to the app directory
WORKDIR /app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the server
ENV NODE_ENV=production
CMD ["npm", "start"]
