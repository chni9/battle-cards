# syntax=docker/dockerfile:1

FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @card-battle/client build

FROM node:24.18.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/apps/client/dist

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY apps/server apps/server
COPY packages/shared packages/shared
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY --from=build /app/apps/client/dist /app/apps/client/dist

RUN chmod +x /app/docker/entrypoint.sh

ENV PORT=2567
EXPOSE 2567

ENTRYPOINT ["/app/docker/entrypoint.sh"]
