# Image unique pour le site (Next.js) et le serveur temps réel : la commande
# change selon le service (voir deploy/docker-compose.prod.yml).
FROM oven/bun:1.4 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
# Adresse publique du WebSocket, figée dans le code client au moment du build.
ARG NEXT_PUBLIC_REALTIME_URL=wss://localhost/rt
ARG NEXT_PUBLIC_SITE_URL=https://localhost
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
# `next build` charge les modules serveur, dont lib/db.ts, qui exige DATABASE_URL
# même si aucune page ne se connecte à la base pendant le build (elles sont
# dynamiques). Adresse factice, valable pour cette seule commande : elle n'est
# pas gardée dans l'image finale. La vraie URL vient du docker-compose au démarrage.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build bun run build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000 4001
CMD ["bun", "run", "start"]
