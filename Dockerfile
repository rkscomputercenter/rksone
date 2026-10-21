# ════════════════════════════════════════════════════════════════════
# shop-rks Production Dockerfile
# Multi-stage: builds frontend + backend → single production image
# Render Docker Web Service compatible
# ════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────
# Stage 1: Build React Frontend (Vite)
# ─────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (cached layer)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ .
RUN npm run build
# Output: /app/frontend/dist

# ─────────────────────────────────────────
# Stage 2: Build Node.js Backend (TypeScript)
# ─────────────────────────────────────────
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

# Install all deps (including devDependencies for tsc + prisma generate)
COPY backend/package*.json ./
RUN npm ci

# Copy source files
COPY backend/ .

# Generate Prisma client (targets native + debian-openssl-3.0.x)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build
# Output: /app/backend/dist

# ─────────────────────────────────────────
# Stage 3: Production Runtime
# node:22-slim (Debian) for OpenSSL compatibility with Prisma
# ─────────────────────────────────────────
FROM node:22-slim AS production

# Install OpenSSL (required by Prisma query engine) + wget (healthcheck)
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Backend: install production dependencies only ──────────────────
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Backend: compiled TypeScript output ───────────────────────────
COPY --from=backend-builder /app/backend/dist ./dist

# ── Backend: Prisma client (compiled + CLI — needed for migrations) ─
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=backend-builder /app/backend/node_modules/prisma  ./node_modules/prisma

# ── Backend: Prisma schema + migrations ───────────────────────────
COPY backend/prisma ./prisma

# ── Frontend: built static assets (served by Express) ─────────────
# Path in container: /app/public
# In dist/app.js: __dirname = /app/dist → path.join(__dirname, '../public') = /app/public
COPY --from=frontend-builder /app/frontend/dist ./public

# ── Entrypoint ─────────────────────────────────────────────────────
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# ── Environment ────────────────────────────────────────────────────
ENV TZ=Asia/Kolkata
ENV NODE_ENV=production

# Render injects PORT at runtime (defaults to 10000 on Render free tier)
# The app reads process.env.PORT — no hardcoded value needed
EXPOSE 10000

ENTRYPOINT ["./entrypoint.sh"]
