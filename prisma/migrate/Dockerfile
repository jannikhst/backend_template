FROM node:18-alpine

# Install PostgreSQL client for database connectivity
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy migration script
COPY migrate.js ./

# Make migration script executable
RUN chmod +x migrate.js

# Set default environment variables
ENV NODE_ENV=production
ENV POSTGRES_HOST=postgres
ENV POSTGRES_PORT=5432

# Run migration script
CMD ["npm", "run", "migrate"]
