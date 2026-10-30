# syntax=docker/dockerfile:1

FROM node:24.18.0-bookworm-slim AS pnpm
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM pnpm AS deps
# Coolify injects `ARG NODE_ENV=production` after every FROM when the var is
# Available at Buildtime (default). ARG is exported into RUN, so pnpm skips
# client `vite` (devDependency, apps/client/package.json). ENV wins over ARG.
# https://coolify.io/docs/knowledge-base/environment-variables
ENV NODE_ENV=development

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

# The only install that downloads. GitHub rate-limits the uWebSockets.js
# tarball (codeload.github.com, 429), so the store is a cache mount that
# outlives the layer cache, and a 429 gets 5 retries instead of 2.
# Prefix beats Coolify Docker Build Secrets remounting NODE_ENV on RUN.
RUN --mount=type=cache,id=card-battle-pnpm-store,target=/pnpm/store \
    npm_config_fetch_retries=5 NODE_ENV=development \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

FROM deps AS build
COPY . .

# `vite build` is production mode; install above already has vite on disk.
RUN NODE_ENV=production pnpm --filter @card-battle/client build

FROM pnpm AS runtime
ENV NODE_ENV=production
ENV STATIC_DIR=/app/apps/client/dist

# From deps, not the build context: this install then starts after deps has
# filled the store, and finds every package there.
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/apps/client/package.json apps/client/
COPY --from=deps /app/apps/server/package.json apps/server/
COPY --from=deps /app/packages/shared/package.json packages/shared/

RUN --mount=type=cache,id=card-battle-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store

COPY apps/server apps/server
COPY packages/shared packages/shared
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY --from=build /app/apps/client/dist /app/apps/client/dist

RUN chmod +x /app/docker/entrypoint.sh

ENV PORT=2567
EXPOSE 2567

ENTRYPOINT ["/app/docker/entrypoint.sh"]
