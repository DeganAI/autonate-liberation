FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy agent code
COPY ./agents/autonate-prime ./agents/autonate-prime
COPY ./shared ./shared
COPY ./characters ./characters
COPY ./plugins ./plugins

# Copy startup script
COPY ./docker/autonate-prime/start.sh ./start.sh
RUN chmod +x ./start.sh

# Set agent-specific environment
ENV AGENT_ID=autonate-prime
ENV NODE_ENV=production
ENV LIBERATION_MODE=enabled

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Run the agent
CMD ["./start.sh"]
