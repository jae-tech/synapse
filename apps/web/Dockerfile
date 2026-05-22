FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- 의존성 레이어 ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml pnpm.toml ./
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0

# --- 빌드 레이어 ---
FROM deps AS builder
COPY packages/schemas ./packages/schemas
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3011
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @synapse/schemas build 2>/dev/null || true
ENV NEXT_OUTPUT=standalone
RUN pnpm --filter @synapse/web build

# --- 실행 레이어 (Next.js standalone) ---
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3010

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3010

CMD ["node", "apps/web/server.js"]
