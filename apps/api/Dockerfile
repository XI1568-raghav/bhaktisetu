# Single-stage build — runs TS source via tsx (no compile step)
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY tooling ./tooling

# Install deps + generate Prisma client
RUN pnpm install --frozen-lockfile --prod=false
RUN cd apps/api && npx prisma generate

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app/apps/api
# Run migrations then start server via tsx (no dist needed)
CMD sh -c "npx prisma migrate deploy || echo 'migrations skipped' && npx tsx src/server.ts"
