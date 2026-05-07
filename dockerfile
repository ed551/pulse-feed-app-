# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# ---------------------------------------------------------
# MAGIC HAPPENS HERE: Catch the build arguments from GitHub Actions
# ---------------------------------------------------------
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_MAPS_MAP_ID

# Set them as environment variables so Vite can see them during compilation
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID
# ---------------------------------------------------------

# Copy the rest of the application source code
COPY . .

# Build the Vite application (the API keys are permanently baked into the JS here)
RUN npm run build

# Stage 2: Serve the built application
FROM node:20-alpine

WORKDIR /app

# Install a simple static file server to host the Vite output
RUN npm install -g serve

# Copy only the compiled static files from the builder stage
COPY --from=builder /app/dist ./dist

# Cloud Run container port is set to 3000 in your configuration
ENV PORT=3000
EXPOSE 3000

# Start the server targeting the dist folder and listening on port 3000
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
