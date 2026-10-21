# ─────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production Runtime
# Use slim (Debian) for OpenSSL compatibility with Prisma
# ─────────────────────────────────────────
FROM node:22-slim AS production

# Install OpenSSL required by Prisma query engine
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Prisma schema for migrations
COPY prisma ./prisma

# Entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

ENV TZ=Asia/Kolkata
ENV NODE_ENV=production

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
