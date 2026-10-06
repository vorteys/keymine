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
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000 4001
CMD ["bun", "run", "start"]
