# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY tooling ./tooling

# Install & build
RUN pnpm install --frozen-lockfile
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @poojly/api build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
