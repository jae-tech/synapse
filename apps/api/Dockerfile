FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# node-pty 네이티브 빌드 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- 의존성 레이어 (lockfile 변경 시에만 재빌드) ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml pnpm.toml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/schemas/package.json ./packages/schemas/
RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0

# --- 빌드 레이어 ---
FROM deps AS builder
COPY packages/schemas ./packages/schemas
COPY apps/api ./apps/api
RUN pnpm --filter @synapse/schemas build 2>/dev/null || true
RUN pnpm --filter @synapse/api build

# --- 실행 레이어 ---
FROM node:22-slim AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-workspace.yaml ./

ENV NODE_ENV=production
ENV PORT=3011

EXPOSE 3011

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
