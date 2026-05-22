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
ARG VITE_API_URL=http://localhost:3011
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @synapse/schemas build 2>/dev/null || true
RUN pnpm --filter @synapse/web build

# --- 실행 레이어 (정적 파일 서버) ---
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve@latest

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 3010

CMD ["serve", "-s", "dist", "-l", "3010"]
