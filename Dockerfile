# Use Node.js 22 alpine as base image
FROM node:24-alpine AS base

# Install pnpm and dependencies needed for build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Build stage
FROM base AS build

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM base

# Copy built artifacts from build stage
COPY --from=build /app/.output /app/.output

# Expose ports
# 3000 for Nuxt/Nitro server
# 3001 for WebSocket server
EXPOSE 3000
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
