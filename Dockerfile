# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY types/package.json ./types/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install --workspace=types --workspace=server --workspace=client

# Copy source code
COPY types/ ./types/
COPY server/ ./server/
COPY client/ ./client/
COPY tsconfig.base.json ./
COPY .env.example ./.env

# Build
RUN npm run build --workspace=types
RUN npm run build --workspace=server
RUN npm run build --workspace=client

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/types/package.json ./types/
COPY --from=builder /app/types/dist/ ./types/dist/
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/client/dist/ ./client/dist/
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
