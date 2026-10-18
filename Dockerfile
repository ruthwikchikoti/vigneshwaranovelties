# syntax=docker/dockerfile:1.10

# ---------- deps: install exact versions from the lockfile ----------
FROM node:22.22-alpine3.22 AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- build: compile Next.js into a standalone server ----------
FROM node:22.22-alpine3.22 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are compiled into the browser bundle, so they must be
# known at build time. They are public by design (the anon key is protected by
# Row Level Security), so build args are fine for them.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_IMAGEKIT_URL
ARG NEXT_PUBLIC_SITE_URL=https://vigneshwaranovelties.com
ARG NEXT_PUBLIC_SITE_NAME="Vigneshwara Novelties"
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_OWNER_PHONE
ARG NEXT_PUBLIC_OWNER_EMAIL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1 \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_IMAGEKIT_URL=$NEXT_PUBLIC_IMAGEKIT_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_OWNER_PHONE=$NEXT_PUBLIC_OWNER_PHONE \
    NEXT_PUBLIC_OWNER_EMAIL=$NEXT_PUBLIC_OWNER_EMAIL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

# The service role key is only needed while pre-rendering catalog pages. It is
# mounted as a BuildKit secret for this one RUN step and never stored in a
# layer or in the final image. Without it the build still succeeds, the pages
# just start empty until ISR refreshes them.
RUN --mount=type=secret,id=supabase_service_role_key,env=SUPABASE_SERVICE_ROLE_KEY \
    npm run build

# ---------- runtime: only the standalone server, as a non-root user ----------
FROM node:22.22-alpine3.22 AS runtime
WORKDIR /app

ARG APP_VERSION=dev
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown

LABEL org.opencontainers.image.title="vigneshwara-web" \
      org.opencontainers.image.source="https://github.com/ruthwikchikoti/vigneshwaranovelties" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.created=$BUILD_TIME

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=$APP_VERSION \
    GIT_SHA=$GIT_SHA \
    BUILD_TIME=$BUILD_TIME

# npm is not needed at runtime; removing it also removes its CVEs from scans.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

# "node" (uid 1000) ships with the base image.
USER 1000:1000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
