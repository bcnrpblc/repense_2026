# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variable
ENV NEXT_TELEMETRY_DISABLED 1

# DATABASE_URL is needed for Prisma generate (for connection validation)
# Use ARG to accept it at build time, ENV to make it available during build
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client (after npm install, before build)
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL 3.0 for Prisma (required for linux-musl-openssl-3.0.x binary)
RUN apk add --no-cache openssl openssl-dev

# Install Prisma CLI locally (not globally) for migrations at runtime
RUN npm install prisma@^5.19.1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy sharp for image optimization (required in standalone mode)
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/prisma ./prisma

# Copy package.json and package-lock.json for Prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./package-lock.json

# Copy start script
COPY start.sh /app/start.sh

# Make start script executable and set correct permissions
RUN chmod +x /app/start.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run migrations at runtime, then start the app
CMD ["sh", "start.sh"]
