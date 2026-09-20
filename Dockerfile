# syntax=docker/dockerfile:1

FROM node:24.18.0-bookworm-slim AS pnpm
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM pnpm AS build
# Coolify injects `ARG NODE_ENV=production` after every FROM when the var is
# Available at Buildtime (default). ARG is exported into RUN, so pnpm skips
# client `vite` (devDependency, apps/client/package.json). ENV wins over ARG.
# https://coolify.io/docs/knowledge-base/environment-variables
ENV NODE_ENV=development

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

# Prefix beats Coolify Docker Build Secrets remounting NODE_ENV on RUN.
RUN NODE_ENV=development pnpm install --frozen-lockfile

COPY . .

# `vite build` is production mode; install above already has vite on disk.
RUN NODE_ENV=production pnpm --filter @card-battle/client build

FROM pnpm AS runtime
ENV NODE_ENV=production
ENV STATIC_DIR=/app/apps/client/dist

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
