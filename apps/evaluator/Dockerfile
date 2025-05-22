FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/evaluator/package.json ./apps/evaluator/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN yarn ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build all packages needed by the evaluator
RUN yarnbuild --filter=@fraudshield/evaluator...

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy built app
COPY --from=builder /app/apps/evaluator/dist ./dist
COPY --from=builder /app/apps/evaluator/package.json ./

# Install production dependencies only
RUN yarn ci --only=production

# Set up file permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Copy GeoIP database if needed
COPY --from=builder --chown=nodejs:nodejs /app/apps/evaluator/data ./data

EXPOSE 3000

CMD ["node", "dist/index.js"] 