FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/decisioner/package.json ./apps/decisioner/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN yarn ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build all packages needed by the decisioner
RUN yarnbuild --filter=@fraudshield/decisioner...

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy built app
COPY --from=builder /app/apps/decisioner/dist ./dist
COPY --from=builder /app/apps/decisioner/package.json ./

# Install production dependencies only
RUN yarn ci --only=production

# Set up file permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"] 